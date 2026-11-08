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
const REPO_URL = 'https://github.com/Maj-05/yunzai-limbus-plugin.git'
// 上游数据源（可在 config/system/update.json 覆盖 url / 设置 ghMirror 走 GitHub 代理）
const DEFAULT_UPSTREAMS = [
  { name: 'LimbusStaticData', url: 'https://git.neonteam.dev/yuvlian/LimbusStaticData.git', gh: false },
  { name: 'LocalizeLimbusCompany', url: 'https://github.com/LocalizeLimbusCompany/LocalizeLimbusCompany.git', gh: true }
]

function loadUpdateConfig () {
  try {
    const p = path.join(PLUGIN_ROOT, 'config', 'system', 'update.json')
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) { logger.error('[limbus-plugin] 读取 update.json 失败: ' + e.message) }
  return {}
}

function ghMirrorOf (url) {
  const cfg = loadUpdateConfig()
  const mirror = (cfg.ghMirror || '').replace(/\/$/, '') + '/'
  return (mirror && mirror !== '/') ? mirror + url : url
}

function getUpstreams () {
  const cfg = loadUpdateConfig()
  const mirror = (cfg.ghMirror || '').replace(/\/$/, '') + '/'
  return DEFAULT_UPSTREAMS.map(u => {
    let url = u.url
    if (u.gh && mirror && mirror !== '/') url = mirror + url
    // 允许在配置里单独覆盖某个源
    const over = (cfg.upstreams || {})[u.name]
    if (over) url = over
    return { name: u.name, url }
  })
}

export class LimbusUpdate extends plugin {
  constructor() {
    super({
      name: '[limbus-plugin]更新',
      dsc: '插件自更新与数据重建',
      event: 'message',
      priority: 500,
      rule: [
        { reg: `^${rulePrefix}limbus(?:强制)?更新(数据)?$`, fnc: 'update', permission: 'master' },
        { reg: `^${rulePrefix}limbus强制更新$`, fnc: 'update', permission: 'master' },
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
    await this.reply(`limbus-plugin 当前版本: ${info}`)
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
      // ============ 阶段1：插件自更新（git pull，失败兜底全量覆盖）============
      if (!onlyData) {
        await this.reply('①/② 正在拉取插件最新代码…')
        let updated = false
        if (this._isGitRepo()) {
          const isForce = this.e.msg.includes('强制')
          const oldCommit = await this._execGit('rev-parse --short HEAD')
          let cmd = isForce
            ? 'git -C "' + PLUGIN_ROOT + '" fetch --all && git -C "' + PLUGIN_ROOT + '" reset --hard HEAD'
            : 'git -C "' + PLUGIN_ROOT + '" pull --no-rebase'
          let ret = await execAsync(cmd, { timeout: 180000, windowsHide: true }).catch(err => ({ stdout: '', stderr: err.message }))
          // 直连失败则走 ghMirror 代理重试
          if (/Failed to connect|unable to access|Timed out|Could not|fatal/i.test(ret.stdout || '') + String(ret.stderr || '')) {
            const mir = ghMirrorOf(REPO_URL)
            await this.reply('直连 GitHub 失败，改用代理镜像重试…')
            ret = await execAsync(`git -C "${PLUGIN_ROOT}" pull --no-rebase "${mir}" HEAD`, { timeout: 180000, windowsHide: true })
              .catch(err => ({ stdout: '', stderr: err.message }))
          }
          const stdout = (ret.stdout || '') + (ret.stderr || '')
          if (/Already up.to date|已经是最新/i.test(stdout)) {
            await this.reply('插件代码已是最新')
            updated = true
          } else if (/fatal|error|Could not|Failed to connect/i.test(stdout)) {
            // git 更新失败 → 兜底全量覆盖，保证完整更新
            updated = await this._cloneCopyUpdate()
            if (!updated) await this.reply(`git 更新失败，改用全量覆盖也失败:\n${stdout.trim().slice(0, 300)}`)
          } else {
            await this.reply(`代码已更新（${isForce ? '强制' : '常规'}）\n${stdout.trim().split('\n').slice(-6).join('\n').slice(0, 400)}`)
            const log = await this._gitLog(oldCommit)
            if (log) await this.reply(log.slice(0, 600))
            updated = true
          }
        } else {
          // 第三方面板安装（无 .git）：全量 clone 覆盖
          updated = await this._cloneCopyUpdate()
        }
        if (!updated) {
          // git 与全量覆盖都失败，提示用户
          await this.reply('插件自更新未完成（网络或 git 问题），可改用 Yunzai 的「更新全部插件」。\n不影响下方数据更新。')
        }
      } else {
        await this.reply('①/② 跳过插件自更新（仅更新数据）')
      }

      // ============ 阶段2：拉上游数据 ============
      const upstreamDir = path.join(PLUGIN_ROOT, 'data', 'upstream')
      fs.mkdirSync(upstreamDir, { recursive: true })
      await this.reply('②/② 正在拉取上游数据源（1-3 分钟）…')
      for (const u of getUpstreams()) {
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
          logger.error(`[limbus-plugin] 拉取源失败 ${u.name}: ${e.message}`)
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
          await this.reply('正在拉取人格+E.G.O 立绘（首次约几分钟，之后增量）…')
          const { build: buildArt } = await import('../scripts/fetch_art.mjs')
          const art = await buildArt()
          artLine = `\n立绘: 需下载 ${art.need} / 已下载 ${art.downloaded} / 已有 ${art.existed} / 失败 ${art.failed}` +
            (art.failed > 0 ? '\n立绘失败较多：多为服务器无法访问图床 huijistatic.com，可配代理；缺失立绘会自动回退在线热链（不影响文字查询）' : '')
        } catch (e) {
          logger.error(`[limbus-plugin] 立绘拉取失败: ${e.message}`)
          artLine = '\n立绘: 拉取失败（不影响文字查询）'
        }
      }

      await this.reply(
        `边狱图鉴更新完成 ✓\n人格: ${result.personalities}\nE.G.O: ${result.egos}\n敌人: ${result.enemies}\n饰品: ${result.egogifts}` +
        artLine +
        (result.diag && result.diag.length ? `\n\n⚠ 数据完整性提示：\n${result.diag.map(d => '· ' + d).join('\n')}` : '')
      )
    } catch (err) {
      logger.error(`[limbus-plugin] 更新失败: ${err.stack || err.message}`)
      await this.reply(`更新失败: ${err.message}\n常见原因: 服务器无法访问 git.neonteam.dev / github.com（国内服务器建议配置代理）`)
    } finally {
      this._running = false
    }
    return true
  }

  /** 全量覆盖更新：git clone 最新代码到临时目录并覆盖本插件（保留 data/upstream、resources/art、node_modules） */
  async _cloneCopyUpdate () {
    const tmp = path.join(PLUGIN_ROOT, '..', `.limbus-update-${Date.now()}`)
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
      await execAsync(`git clone --depth 1 ${ghMirrorOf(REPO_URL)} "${tmp}"`, { timeout: 300000, windowsHide: true })
      for (const item of fs.readdirSync(tmp)) {
        if (['data', 'resources', 'node_modules', '.git'].includes(item)) continue
        const src = path.join(tmp, item)
        const dst = path.join(PLUGIN_ROOT, item)
        fs.rmSync(dst, { recursive: true, force: true })
        fs.cpSync(src, dst, { recursive: true })
      }
      for (const sub of ['common', 'personality', 'ego', 'enemy', 'gift', 'search', 'help', 'data']) {
        const rsrc = path.join(PLUGIN_ROOT, 'resources', sub)
        const rtmp = path.join(tmp, 'resources', sub)
        if (fs.existsSync(rtmp)) {
          fs.rmSync(rsrc, { recursive: true, force: true })
          fs.cpSync(rtmp, rsrc, { recursive: true })
        }
      }
      fs.rmSync(tmp, { recursive: true, force: true })
      await this.reply('代码已更新（全量覆盖完成）')
      return true
    } catch (e) {
      logger.error(`[limbus-plugin] 全量覆盖更新失败: ${e.message}`)
      fs.rmSync(tmp, { recursive: true, force: true })
      return false
    }
  }

  _execGit (args) {
    return execAsync(`git -C "${PLUGIN_ROOT}" ${args}`, { timeout: 60000, windowsHide: true })
      .then(r => (r.stdout || '').trim()).catch(() => '')
  }

  _gitLog (oldCommit) {
    return this._execGit('log -15 --oneline --pretty=format:"%h|[%cd] %s" --date=format:"%m-%d %H:%M"')
      .then(out => {
        if (!out) return ''
        const lines = out.split('\n')
        const logs = []
        for (const l of lines) {
          const h = (l.split('|')[0] || '').trim()
          if (h && oldCommit && h === oldCommit) break
          if (/Merge branch/.test(l)) continue
          logs.push(l)
        }
        return logs.length ? `最近更新:\n${logs.join('\n')}` : ''
      }).catch(() => '')
  }
}