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
        { reg: `^${rulePrefix}(?:罪人总览|罪人)$`, fnc: 'sinnerOverview' },
        { reg: `^${rulePrefix}(?:流派)\\s*(.*)$`, fnc: 'flowInfo' },
        { reg: `^${rulePrefix}(?:配队|队伍)\\s*(.*)$`, fnc: 'teamInfo' }
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

  /** #流派 <流派名>：镜牢饰品流派推荐（按效果文本关键词归类） */
  async flowInfo() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '流派')
    const flows = readFlowData()
    if (!flows || !flows.length) { await this.reply('流派数据未就绪'); return true }
    // 无参数 → 列所有流派
    if (!q) {
      const lines = flows.map(f => `· ${f.name}：${f.desc}`)
      await this.reply(`【镜牢流派】\n${lines.join('\n')}\n\n用法：#流派 <流派名>，如 #流派 烧伤 / 震颤 / 流血`)
      return true
    }
    // 有参数 → 找流派，扫描饰品
    const f = flows.find(x => x.name === q || x.key === q)
    if (!f) {
      const names = flows.map(x => x.name).join(' / ')
      await this.reply(`没有「${q}」这个流派。\n可用流派：${names}`)
      return true
    }
    const kws = f.keywords || [f.name]
    const gifts = db.egogifts.filter(g =>
      (g.effects || []).some(x => kws.some(kw => (x.text || '').includes(kw)))
    )
    const lines = gifts.slice(0, 10).map(g => `· ${g.name}`)
    const more = gifts.length > 10 ? `\n…等 ${gifts.length} 件饰品` : ''
    await this.reply(`【${f.name}流】\n${f.desc}\n\n推荐饰品（前10）：\n${lines.join('\n')}${more}\n\n用法：#饰品 <名称> 查看具体效果`)
    return true
  }

  /** #配队 <流派名>：推荐该流派的配队（人格 + EGO） */
  async teamInfo() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '配队|队伍')
    const flows = readFlowData()
    if (!flows || !flows.length) { await this.reply('流派数据未就绪'); return true }
    if (!q) {
      const lines = flows.map(f => `· ${f.name}`)
      await this.reply(`【可配队流派】\n${lines.join('\n')}\n\n用法：#配队 <流派名>，如 #配队 破裂 / 烧伤 / 流血`)
      return true
    }
    const f = flows.find(x => x.name === q || x.key === q)
    if (!f) {
      const names = flows.map(x => x.name).join(' / ')
      await this.reply(`没有「${q}」这个流派。\n可用流派：${names}`)
      return true
    }
    const kws = f.keywords || [f.name]
    const kwHit = (txt) => kws.some(kw => (txt || '').includes(kw))
    // 按被动文本扫人格
    const pers = db.personalities.filter(p =>
      (p.passives || []).some(pv => kwHit(db.passiveText(pv.id)?.desc))
    ).slice(0, 8).map(p => p.name)
    // 按觉醒/侵蚀技能文本扫 EGO
    const egos = db.egos.filter(g =>
      kwHit(db.skillText(g.awakenSkillId)?.desc) || kwHit(db.skillText(g.corrodeSkillId)?.desc)
    ).slice(0, 8).map(g => g.name)
    const body = []
    body.push(`【${f.name}流配队】`)
    body.push(pers.length ? `推荐人格：\n${pers.map(n => '· ' + n).join('\n')}` : '推荐人格：无（该流派人格数据未收录）')
    body.push(egos.length ? `推荐E.G.O：\n${egos.map(n => '· ' + n).join('\n')}` : '推荐E.G.O：无')
    body.push(`配饰用法：#流派 ${f.name}；详情：#人格 <名称> / #ego <名称>`)
    await this.reply(body.join('\n'))
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

/** 读取流派数据（resources/data/flows.json，手工维护的静态数据） */
function readFlowData() {
  try {
    return readData('flows') || []
  } catch {
    return []
  }
}