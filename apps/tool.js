import { rulePrefix } from '../utils/common.js'
import runtimeRender from '../utils/runtimeRender.js'
import db from '../lib/db.mjs'
import { buildPersonalityCard, buildEgoCard } from '../lib/cards.mjs'
import { readData, SINNER_NAMES } from '../lib/constants.mjs'

/**
 * 工具类命令：状态速查 / 随机查询 / 罪人总览
 */
export class LimbusTool extends plugin {
  constructor() {
    super({
      name: '[limbus-plugin]工具',
      dsc: '状态速查/随机查询/罪人总览',
      event: 'message',
      priority: 500,
      rule: [
        { reg: `^${rulePrefix}(?:状态|机制|效果)\\s*(.+)$`, fnc: 'queryStatus' },
        { reg: `^${rulePrefix}随机(?:人格|身份)\\s*$`, fnc: 'randomPersonality' },
        { reg: `^${rulePrefix}随机(?:ego|EGO)\\s*$`, fnc: 'randomEgo' },
        { reg: `^${rulePrefix}(?:罪人总览|罪人)$`, fnc: 'sinnerOverview' }
      ]
    })
  }

  _stripKw(msg, kw) {
    let q = msg.replace(/#|\/|边狱|巴士|084|limbus|Limbus/gi, '').trim()
    q = q.replace(new RegExp(`^${kw}\\s*`, 'i'), '').trim()
    return q
  }

  /** #状态 破裂 / #状态 烧伤 等：查异常状态机制说明（静态文案） */
  async queryStatus() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '状态|机制|效果')
    if (!q) { await this.reply('用法：#状态 状态名，例：#状态 破裂 / 烧伤 / 震颤 / 流血 / 沉沦'); return true }
    // 从 resources/data/statuses.json 读状态文案（name 或 key 模糊匹配）
    const list = db.load() && readStatusData()
    if (!list || !list.length) { await this.reply('状态数据未就绪'); return true }
    const key = q.replace(/\s+/g, '')
    // 精确优先，其次模糊
    const hit = list.find(s => s.key === key || s.name === key) ||
      list.find(s => (s.name || '').includes(q) || (key.length >= 2 && (s.key || '').includes(key)))
    if (!hit) {
      const names = list.map(s => s.name).join(' / ')
      await this.reply(`没有「${q}」这个状态。\n可用状态：${names}`)
      return true
    }
    await this.reply(`【${hit.name}】\n${hit.desc || ''}`)
    return true
  }

  /** #随机人格：随机展示一张人格卡 */
  async randomPersonality() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const list = db.personalities
    if (!list.length) { await this.reply('人格数据为空'); return true }
    const id = list[Math.floor(Math.random() * list.length)].id
    const card = buildPersonalityCard(id)
    if (!card) { await this.reply('数据缺失'); return true }
    await runtimeRender(this.e, 'personality/personality', { card }, { scale: 1.4 })
    return true
  }

  /** #随机ego：随机展示一张 EGO 卡 */
  async randomEgo() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const list = db.egos
    if (!list.length) { await this.reply('EGO 数据为空'); return true }
    const id = list[Math.floor(Math.random() * list.length)].id
    const card = buildEgoCard(id)
    if (!card) { await this.reply('数据缺失'); return true }
    await runtimeRender(this.e, 'ego/ego', { card }, { scale: 1.4 })
    return true
  }

  /** #罪人：列出 12 位罪人（文本总览） */
  async sinnerOverview() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const lines = []
    for (let cid = 1; cid <= 12; cid++) {
      const n = db.personalitiesOfSinner(cid).length
      const e = db.egosOfSinner(cid).length
      const name = SINNER_NAMES[cid] || `罪人${cid}`
      lines.push(`${name}：人格 ${n} · E.G.O ${e}`)
    }
    await this.reply(`【十二罪人】\n${lines.join('\n')}\n\n用法：#人格 <罪人名> 看人格列表，如 #人格 良秀`)
    return true
  }
}

/** 读取状态文案（resources/data/statuses.json，手工维护的静态数据） */
function readStatusData() {
  try {
    return readData('statuses') || []
  } catch {
    return []
  }
}