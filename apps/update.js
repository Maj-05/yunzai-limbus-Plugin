import { rulePrefix } from '../utils/common.js'
import db from '../lib/db.mjs'
import { PLUGIN_ROOT } from '../lib/constants.mjs'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
const execAsync = promisify(exec)

/**
 * 数据更新 + 插件自更新
 *  #limbus更新        → 插件自更新（git pull 拉最新代码+内置数据）+ 重建图鉴数据
 *  #limbus更新数据    → 仅重建图鉴数据（需要 data/upstream 已存在）
 *  #图鉴状态          → 数据统计
 */
const UPSTREAMS = [
  { name: 'LimbusStaticData', url: 'https://git.neonteam.dev/yuvlian/LimbusStaticData.git' },
  { name: 'LocalizeLimbusCompany', url: 'https://github.com/LocalizeLimbusCompany/LocalizeLimbusCompany.git' }
]

export class LimbusUpdate extends plugin {
  constructor() {
    super({
      name: '[limbus-dive]更新',
      dsc: '插件自更新与数据重建',
      event: 'message',
      priority: 500,
      rule: [
        { reg: `^${rulePrefix}limbus更新(数据)?$`, fnc: 'update', permission: 'master' },
        { reg: `^${rulePrefix}limbus版本$`, fnc: 'version' },
        { reg: `^${rulePrefix}图鉴状态$`, fnc: 'status' }
      ]
    })
    this._running = false
  }

  async status() {
    if (!db.load()) {
      await this.reply('图鉴数据未就绪')
      return true
    }
    const s = db.stats()
    await this.reply(
      `【边狱图鉴数据】\n人格: ${s.personalities}\nE.G.O: ${s.egos}\n敌人: ${s.enemies}\n饰品: ${s.egogifts}\n` +
      (s.builtAt ? `构建时间: ${s.builtAt}` : '')
    )
    return true
  }

  async version() {
    const info = this._gitInfo()
    await this.reply(`limbus-dive 当前版本: ${info}`)
    return true
  }

  _gitInfo() {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'package.json'), 'utf8'))
      return 'v' + (pkg.version || '?')
    } catch {
      return 'v?'
    }
  }

  /** 插件目录是否是 git 仓库 */
  _isGitRepo() {
    return fs.existsSync(path.join(PLUGIN_ROOT, '.git'))
  }

  async update(e) {
    if (this._running) {
      await this.reply('更新任务进行中，请稍候')
      return true
    }
    this._running = true
    const onlyData = this.e.msg.includes('数据')
    try {
      // ============ 阶段1：插件自更新（git pull）============
      if (!onlyData) {
        if (this._isGitRepo()) {
          await this.reply('①/② 正在拉取插件最新代码…')
          const { stdout } = await execAsync('git pull --ff-only', {
            cwd: PLUGIN_ROOT, timeout: 120000, windowsHide: true
          }).catch(err => ({ stdout: '', stderr: err.message }))
          const pulled = /Already up to date|已经是最新的/i.test(stdout)
            ? '插件代码已是最新'
            : `代码已更新:\n${stdout.trim().split('\n').slice(-4).join('\n')}`
          await this.reply(pulled.slice(0, 400))
        } else {
          await this.reply('①/② 插件目录不是 git 仓库（第三方面板安装），跳过自更新。\n提示: 想要自更新请用 git clone 安装:\ngit clone https://github.com/Maj-05/yunzai-limbus-dive plugins/yunzai-limbus-dive')
        }
      } else {
        await this.reply('①/② 跳过插件自更新（仅更新数据）')
      }

      // ============ 阶段2：拉上游数据 ============
      const upstreamDir = path.join(PLUGIN_ROOT, 'data', 'upstream')
      fs.mkdirSync(upstreamDir, { recursive: true })
      await this.reply('②/② 正在拉取上游数据源（1-3 分钟）…')
      for (const u of UPSTREAMS) {
        const dest = path.join(upstreamDir, u.name)
        try {
          if (fs.existsSync(path.join(dest, '.git'))) {
            await execAsync('git pull --ff-only', { cwd: dest, timeout: 180000, windowsHide: true })
          } else {
            fs.rmSync(dest, { recursive: true, force: true })
            await execAsync(`git clone --depth 1 ${u.url} "${dest}"`, { timeout: 600000, windowsHide: true })
          }
        } catch (e) {
          // 单个源失败不中断整个更新（如国内服务器连不上 GitHub）
          logger.error(`[limbus-dive] 拉取源失败 ${u.name}: ${e.message}`)
          await this.reply(`⚠ 拉取源 ${u.name} 失败（${e.message.slice(0, 40)}），已跳过。\n若该源已有本地缓存会继续用旧数据。`)
        }
      }

      // ============ 阶段3：重建数据 ============
      const { buildAll } = await import('../scripts/build_data.mjs')
      const result = await buildAll(upstreamDir, path.join(PLUGIN_ROOT, 'resources', 'data'))
      db.ready = false
      db.load()

      // ============ 阶段4：拉取立绘（本地缓存，缺失才热链） ============
      let artLine = ''
      if (!onlyData) {
        try {
          await this.reply('正在拉取人格立绘（首次约几分钟，之后增量）…')
          const { build: buildArt } = await import('../scripts/fetch_art.mjs')
          const art = await buildArt()
          artLine = `\n立绘: 下载 ${art.downloaded} / 已有 ${result.personalities * 2 - art.downloaded - art.failed} / 失败 ${art.failed}`
        } catch (e) {
          logger.error(`[limbus-dive] 立绘拉取失败: ${e.message}`)
          artLine = '\n立绘: 拉取失败（不影响文字查询）'
        }
      }

      await this.reply(
        `边狱图鉴更新完成 ✓\n人格: ${result.personalities}\nE.G.O: ${result.egos}\n敌人: ${result.enemies}\n饰品: ${result.egogifts}` +
        artLine
      )
    } catch (err) {
      logger.error(`[limbus-dive] 更新失败: ${err.stack || err.message}`)
      await this.reply(`更新失败: ${err.message}\n常见原因: 服务器无法访问 git.neonteam.dev / github.com（国内服务器建议配置代理）`)
    } finally {
      this._running = false
    }
    return true
  }
}