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
        { reg: `^${rulePrefix}(?:配队|队伍)\\s*(.*)$`, fnc: 'teamInfo' },
        { reg: `^${rulePrefix}(?:抽卡预算|预算)\\s*(.*)$`, fnc: 'gachaBudget' },
        { reg: `^${rulePrefix}(?:探索事件|事件)\\s*(.*)$`, fnc: 'exploreEvent' },
        { reg: `^${rulePrefix}抽卡(?:\\s+(.*))?$`, fnc: 'gacha' }
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

  /** #配队 <流派名>：推荐该流派的配队（人格 + EGO），优先展示精选核心组合 */
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
    // 精选推荐（flows 人工整理的核心人格/EGO），按名字模糊匹配到实际数据
    // 只展示精选核心，避免机械关键词扫描把旧赛季老人格也带进来
    const resolveName = (nm, kind) => {
      const ids = kind === 'ego' ? db.searchEgo(nm, 1) : db.searchPersonality(nm, 1)
      const item = ids[0] ? (kind === 'ego' ? db.getEgo(ids[0]) : db.getPersonality(ids[0])) : null
      return item ? item.name : null
    }
    const pers = (f.topPers || []).map(nm => resolveName(nm, 'pers')).filter(Boolean)
    const egos = (f.topEgos || []).map(nm => resolveName(nm, 'ego')).filter(Boolean)

    const body = []
    body.push(`【${f.name}流配队】`)
    body.push(pers.length ? `推荐人格：\n${pers.map(n => '· ' + n).join('\n')}` : '推荐人格：无（该流派人格数据未收录）')
    body.push(egos.length ? `推荐E.G.O：\n${egos.map(n => '· ' + n).join('\n')}` : '推荐E.G.O：无')
    body.push(`配饰用法：#流派 ${f.name}；详情：#人格 <名称> / #ego <名称>`)
    await this.reply(body.join('\n'))
    return true
  }

  /** 抽卡模拟：#抽卡 单抽 / #抽卡 十连 */
  async gacha() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const arg = this._stripKw(this.e.msg, '抽卡').trim()
    const isMulti = /(十连|10|十抽|mult)/i.test(arg)
    const n = isMulti ? 10 : 1
    const results = Array.from({ length: n }, () => this._rollOnce())
    // 单抽：渲染一张大卡
    if (n === 1) {
      const r = results[0]
      if (r.kind === 'personality') {
        const card = buildPersonalityCard(r.id)
        if (card) { await runtimeRender(this.e, 'personality/personality', { card }, { scale: 1.4 }); return true }
      } else {
        const card = buildEgoCard(r.id)
        if (card) { await runtimeRender(this.e, 'ego/ego', { card }, { scale: 1.4 }); return true }
      }
      // 渲染失败则回退文本
      await this.reply(`【抽卡】${this._gachaLabel(r)}：${r.name}`)
      return true
    }
    // 十连：文本列表
    const lines = results.map((r, i) => `${String(i + 1).padStart(2)}. ${this._gachaLabel(r)} · ${r.name}`)
    const rare = results.filter(r => r.rarity <= 2).length
    await this.reply(`【抽卡·十连】\n${lines.join('\n')}\n\n稀有出卡 ${rare} 张`)
    return true
  }

  /** #抽卡预算：攒抽估算。输入现有资源换算总抽数，可选天数估算日常可攒。
   *  规则：单抽=130狂气；单抽券=1抽；十连券=10抽；每日约75狂气（任务），每周约550狂气（镜像+维护+通行证）。
   */
  async gachaBudget() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '抽卡预算|预算').trim()
    if (!q) {
      await this.reply(
        `【攒抽计算器】\n用法：#抽卡预算 <狂气> [单抽券] [十连券] [剩余天数]\n` +
        `例：#抽卡预算 13000 5 2 30\n` +
        `例：#抽卡预算 6500 0 1 7\n\n` +
        `按 单抽=130狂气、十连券=10抽 换算；剩余天数按每日约75狂气+每周约550狂气估算。`
      )
      return true
    }
    const nums = (q.match(/\d+/g) || []).map(Number)
    const lunar = nums[0] ?? 0      // 狂气
    const single = nums[1] ?? 0     // 单抽券
    const ten = nums[2] ?? 0        // 十连券
    const days = nums[3] ?? 0       // 剩余天数（可选）

    const lunarPulls = Math.floor(lunar / 130)
    const singlePulls = single
    const tenPulls = ten * 10
    const currentPulls = lunarPulls + singlePulls + tenPulls

    // 未来可攒估算
    let dailyPulls = 0
    let estLine = ''
    if (days > 0) {
      const lunarEarn = days * 75 + Math.ceil(days / 7) * 550
      dailyPulls = Math.floor(lunarEarn / 130)
      estLine = `\n剩余 ${days} 天可攒约 ${dailyPulls} 抽（每日75+周常550狂气，估算）`
    }

    await this.reply(
      `【攒抽计算器】\n` +
      `现有：狂气 ${lunar} / 单抽券 ${single} / 十连券 ${ten}\n` +
      `→ 狂气折 ${lunarPulls} 抽 + 券折 ${singlePulls + tenPulls} 抽\n` +
      `合计当前可抽 **${currentPulls}** 抽` +
      estLine +
      `\n\n（按 130狂气/抽 换算，仅供参考）`
    )
    return true
  }

  /** #事件 探索事件速查：#事件 随机 / #事件 <名> / #事件 */
  async exploreEvent() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '探索事件|事件').trim()
    const events = readEventData()
    if (!events || !events.length) { await this.reply('探索事件数据未就绪'); return true }
    if (!q || /^(随机|全部|列表)$/i.test(q)) {
      const lines = events.map((e, i) => `${i + 1}. ${e.name}（${e.location || '镜像迷宫'}）`)
      await this.reply(`【镜牢探索事件】\n${lines.join('\n')}\n\n用法：#事件 随机 或 #事件 <事件名>`)
      return true
    }
    if (/^随机$/i.test(q)) {
      const e = events[Math.floor(Math.random() * events.length)]
      const body = [`【${e.name}】`, e.desc, '', '选项：']
      ;(e.options || []).forEach((o, i) => body.push(`${i + 1}. ${o.text}：${o.result}`))
      await this.reply(body.join('\n'))
      return true
    }
    const key = q.replace(/\s+/g, '')
    const e = events.find(x => (x.name || '').replace(/\s+/g, '') === key || (x.name || '').includes(q))
    if (!e) {
      const names = events.map(x => x.name).join(' / ')
      await this.reply(`没有「${q}」这个事件。\n可用事件：${names}\n或 #事件 随机`)
      return true
    }
    const body = [`【${e.name}】`, e.desc, '', '选项：']
    ;(e.options || []).forEach((o, i) => body.push(`${i + 1}. ${o.text}：${o.result}`))
    await this.reply(body.join('\n'))
    return true
  }

  /** 单次抽取：按稀有度概率抽一个人格或 EGO */
  _rollOnce() {
    // 概率模型：人格 3灯/2灯/1灯 + EGO WAW/HE/TETH/ZAYIN
    // rarity: 数值越小越稀有（1=3灯人格, 2=WAW, 3=2灯/HE, 4=TETH, 5=1灯/ZAYIN）
    const roll = Math.random() * 100
    if (roll < 3) { // 人格 3灯（最稀有）
      const pool = db.personalities.filter(p => (p.rank ?? 0) >= 3)
      return this._pick(pool, 'personality', 1)
    } else if (roll < 15) { // 人格 2灯
      const pool = db.personalities.filter(p => (p.rank ?? 0) === 2)
      return this._pick(pool, 'personality', 3)
    } else if (roll < 62) { // 人格 1灯
      const pool = db.personalities.filter(p => (p.rank ?? 0) === 1)
      return this._pick(pool, 'personality', 5)
    } else if (roll < 65) { // EGO WAW
      const pool = db.egos.filter(g => g.grade === 'WAW')
      return this._pick(pool, 'ego', 2)
    } else if (roll < 76) { // EGO HE
      const pool = db.egos.filter(g => g.grade === 'HE')
      return this._pick(pool, 'ego', 3)
    } else if (roll < 86) { // EGO TETH
      const pool = db.egos.filter(g => g.grade === 'TETH')
      return this._pick(pool, 'ego', 4)
    } else { // EGO ZAYIN
      const pool = db.egos.filter(g => g.grade === 'ZAYIN')
      return this._pick(pool, 'ego', 5)
    }
  }

  _pick(pool, kind, rarity) {
    if (!pool.length) return this._rollOnce()
    const it = pool[Math.floor(Math.random() * pool.length)]
    const isEgo = kind === 'ego'
    return {
      kind,
      id: it.id,
      name: it.name,
      rank: it.rank,           // 人格用
      grade: it.grade,         // EGO用
      rarity,                  // 稀有度等级(越小越稀有)
      label: isEgo ? it.grade : `第${it.rank}星`
    }
  }

  _gachaLabel(r) {
    if (r.kind === 'ego') return `E.G.O·${r.grade}`
    return `人格·第${r.rank}星`
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

/** 读取探索事件数据（resources/data/events.json，基于灰机wiki整理） */
function readEventData() {
  try {
    return readData('events') || []
  } catch {
    return []
  }
}