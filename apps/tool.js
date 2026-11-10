import { rulePrefix } from '../utils/common.js'
import runtimeRender from '../utils/runtimeRender.js'
import db from '../lib/db.mjs'
import { buildPersonalityCard, buildEgoCard, buildEnemyCard, artUrl } from '../lib/cards.mjs'
import { readData, SINNER_NAMES } from '../lib/constants.mjs'
import { rememberSelect } from '../lib/selection.mjs'

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
        { reg: `^${rulePrefix}(?:技能)\\s*(.+)$`, fnc: 'skillSearch' },
        { reg: `^${rulePrefix}(?:抗性)\s*(.+)$`, fnc: 'resistQuery' },
        { reg: `^${rulePrefix}随机(?:人格|身份)\\s*$`, fnc: 'randomPersonality' },
        { reg: `^${rulePrefix}随机(?:ego|EGO)\\s*$`, fnc: 'randomEgo' },
        { reg: `^${rulePrefix}(?:罪人总览|罪人)\s*(.*)$`, fnc: 'sinnerOverview' },
        { reg: `^${rulePrefix}(?:流派)\\s*(.*)$`, fnc: 'flowInfo' },
        { reg: `^${rulePrefix}(?:配队|队伍)\\s*(.*)$`, fnc: 'teamInfo' },
        { reg: `^${rulePrefix}(?:抽卡预算|预算)\\s*(.*)$`, fnc: 'gachaBudget' },
        { reg: `^${rulePrefix}(?:探索事件|事件)\\s*(.*)$`, fnc: 'exploreEvent' },
        { reg: `^${rulePrefix}(?:图鉴)\s*(.*)$`, fnc: 'catalogBrowse' },
        { reg: `^${rulePrefix}(?:ego图鉴|EGO图鉴)\s*(.*)$`, fnc: 'catalogEgo' },
        { reg: `^${rulePrefix}(?:敌图鉴)\s*(.*)$`, fnc: 'catalogEnemy' },
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

  /** #技能 <关键词>：按效果关键词搜索人格技能/被动（攻略向） */
  async skillSearch() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '技能').trim()
    if (!q) { await this.reply('用法：#技能 <关键词>，例：#技能 破裂 / 烧伤 / 流血 / 震颤 / 沉沦 / 充能 / 呼吸'); return true }
    const kws = [q]
    const kwHit = (txt) => kws.some(kw => (txt || '').includes(kw))
    const hits = []
    // 扫人格技能
    for (const p of db.personalities) {
      for (const s of p.skills || []) {
        const t = db.skillText(s.skillId) || {}
        if (kwHit(t.desc)) {
          hits.push(`${p.name} · ${t.name || '技能' + s.skillId}`)
          break // 每人格最多记一条
        }
      }
    }
    // 扫被动
    for (const p of db.personalities) {
      for (const pv of p.passives || []) {
        const t = db.passiveText(pv.id) || {}
        if (kwHit(t.desc)) { hits.push(`${p.name} · [被动]${t.name || '被动' + pv.id}`); break }
      }
    }
    if (!hits.length) { await this.reply(`没有找到含「${q}」的技能/被动。\n试试：破裂 / 烧伤 / 流血 / 震颤 / 沉沦 / 充能 / 呼吸 / 迅捷 / 束缚`); return true }
    const shown = hits.slice(0, 15)
    const more = hits.length > 15 ? `\n…等 ${hits.length} 条` : ''
    await this.reply(`【含「${q}」的技能/被动】（${hits.length} 条）\n${shown.map((h, i) => `${i + 1}. ${h}`).join('\n')}${more}\n\n用法：#人格 <名> 查看详情`)
    return true
  }

  /** #抗性 <人格/敌人>：速查对斩击/突刺/打击的攻击抗性 */
  async resistQuery() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '抗性').trim()
    if (!q) { await this.reply('用法：#抗性 <人格或敌人名>，例：#抗性 李箱 / 黑檀女王的苹果'); return true }
    // 先按人格查
    let target = null, kind = ''
    const pids = db.searchPersonality(q, 1)
    if (pids.length) { target = db.getPersonality(pids[0]); kind = '人格' }
    else {
      const eids = db.searchEnemy(q, 1)
      if (eids.length) { target = db.getEnemy(eids[0]); kind = '敌人' }
    }
    if (!target) { await this.reply(`没有找到「${q}」`); return true }
    const resist = (target.resist || []).map(r => {
      const atkName = { SLASH: '斩击', PENETRATE: '突刺', HIT: '打击' }[r.type] || r.type
      const tag = r.value >= 2 ? '弱点×' + r.value : r.value <= 0.5 ? '抵抗×' + r.value : '普通×' + r.value
      return `${atkName} ${tag}`
    })
    if (!resist.length) { await this.reply(`【${target.name}·${kind}】暂无抗性数据`); return true }
    await this.reply(`【${target.name}·${kind}抗性】
` + resist.join('　') + `

（镜牢选角参考：弱点=受到该伤害增加，抵抗=减少）`)
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
    const q = this._stripKw(this.e.msg, '罪人总览|罪人').trim()
    // 无参数 → 十二罪人总览
    if (!q) {
      const lines = []
      for (let cid = 1; cid <= 12; cid++) {
        const n = db.personalitiesOfSinner(cid).length
        const e = db.egosOfSinner(cid).length
        const name = SINNER_NAMES[cid] || `罪人${cid}`
        lines.push(`${name}：人格 ${n} · E.G.O ${e}`)
      }
      await this.reply(`【十二罪人】\n${lines.join('\n')}\n\n用法：#罪人 <罪人名> 看详情，如 #罪人 良秀`)
      return true
    }
    // 有参数 → 罪人详情：该罪人的全部人格 + EGO
    const cid = db.resolveSinner(q)
    if (!cid) { await this.reply(`没有「${q}」这个罪人。\n可用罪人：${Object.values(SINNER_NAMES).join(' / ')}`); return true }
    const pList = db.personalitiesOfSinner(cid)
    const eList = db.egosOfSinner(cid)
    const body = [`【${SINNER_NAMES[cid]}】`]
    body.push(`人格（${pList.length}）：`)
    pList.forEach(p => body.push(`· ${p.name}`))
    body.push(`E.G.O（${eList.length}）：`)
    eList.forEach(g => body.push(`· ${g.name}（${g.grade || '?'}）`))
    body.push(`\n用法：#人格 <名> / #ego <名> 查看详情`)
    await this.reply(body.join('\n'))
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
  /** #敌图鉴：全量敌人图鉴（支持分页）。无参=类型概览；异常体/部位/人类/头目=列该类型 */
  async catalogEnemy() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '敌图鉴').trim()
    const TYPE_LABEL = { abno: '异常体', part: '部位', human: '人类', human_boss: '头目' }
    if (q) {
      const tkw = db.enemyTypeKeyword(q)
      if (tkw) {
        const ids = db.enemiesOfType(tkw.type)
        if (!ids.length) { await this.reply(`没有「${tkw.label}」类型敌人`); return true }
        return this._renderCatalogPage(ids, `${tkw.label}敌人`, {
          kindName: '敌人', render: buildEnemyCard, tpl: 'enemy/enemy',
          label: (id, i) => { const e = db.getEnemy(id); return `${i + 1}. ${e.name}` }
        })
      }
      await this.reply(`没有「${q}」。\n用法：#敌图鉴 <异常体/部位/人类/头目>`)
      return true
    }
    const c = db.enemyTypeCounts()
    const lines = Object.entries(c).map(([k, v]) => `· ${v.label}：${v.count} 个`)
    await this.reply(`【敌人图鉴概览】\n${lines.join('\n')}\n\n用法：#敌图鉴 异常体 看全部异常体（翻页 #下一页）`)
    return true
  }

  /** #ego图鉴：全量EGO图鉴（支持分页）。无参=等级概览；WAW等=列该等级；罪人名=该罪人EGO */
  async catalogEgo() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, 'ego图鉴|EGO图鉴').trim()
    const GRADE = ['ZAYIN','TETH','HE','WAW','ALEPH']
    if (q) {
      const cid = db.resolveSinner(q)
      if (cid) {
        const list = db.egosOfSinner(cid)
        const ids = list.map(g => g.id)
        if (!ids.length) { await this.reply('该罪人无EGO'); return true }
        return this._renderCatalogPage(ids, SINNER_NAMES[cid] + '·E.G.O', {
          kindName: 'E.G.O', render: buildEgoCard, tpl: 'ego/ego',
          label: (id, i) => { const g = db.getEgo(id); return `${i + 1}. ${g.name}（${g.grade}）` }
        })
      }
      const up = q.toUpperCase()
      if (GRADE.includes(up)) {
        const ids = db.egos.filter(g => g.grade === up).map(g => g.id)
        if (!ids.length) { await this.reply(`没有${up}等级EGO`); return true }
        return this._renderCatalogPage(ids, `${up}·E.G.O`, {
          kindName: 'E.G.O', render: buildEgoCard, tpl: 'ego/ego',
          label: (id, i) => { const g = db.getEgo(id); return `${i + 1}. ${g.name}（${g.charName}）` }
        })
      }
      await this.reply(`没有「${q}」。\n用法：#ego图鉴 WAW 或 #ego图鉴 <罪人名>`)
      return true
    }
    const cnt = {}
    db.egos.forEach(g => { cnt[g.grade] = (cnt[g.grade] || 0) + 1 })
    const lines = GRADE.filter(g => cnt[g]).map(g => `${g}：${cnt[g]} 个`)
    await this.reply(`【E.G.O图鉴概览】\n${lines.join('\n')}\n\n用法：#ego图鉴 WAW 看全部WAW；#ego图鉴 良秀 看该罪人（翻页 #下一页）`)
    return true
  }

  /** #图鉴：全量人格图鉴浏览（支持分页）。无参=稀有度概览；N灯/罪人名=分页列出（#下一页/上一页/第N页/序号） */
  async catalogBrowse() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const q = this._stripKw(this.e.msg, '图鉴').trim()
    // 1) 罪人名 → 该罪人人格分页
    if (q) {
      const cid = db.resolveSinner(q)
      if (cid) {
        const list = db.personalitiesOfSinner(cid)
        const ids = list.map(p => p.id)
        if (!ids.length) { await this.reply('无人格'); return true }
        return this._renderCatalogPage(ids, SINNER_NAMES[cid] || q)
      }
      // 2) N灯 → 稀有度筛选分页
      const lm = q.match(/^(\d{1,2})灯?$/)
      if (lm) {
        const rank = Number(lm[1])
        const ids = db.personalities.filter(p => (p.rank ?? 0) === rank).map(p => p.id)
        if (!ids.length) { await this.reply(`没有${rank}灯人格`); return true }
        return this._renderCatalogPage(ids, `${rank}灯人格`)
      }
      // 3) 赛季筛选：#图鉴 赛季N / S3 / 瓦夜
      const seasonM = q.match(/^(?:赛季|S)\s*(\d{1,2})$/i) || q.match(/^赛季(\d{1,2})$/i)
      if (/^瓦夜$/i.test(q)) {
        const ids = db.personalities.filter(p => (p.season ?? 0) >= 1000).map(p => p.id)
        if (!ids.length) { await this.reply('无瓦夜人格'); return true }
        return this._renderCatalogPage(ids, '瓦夜人格')
      }
      const seasonNum = seasonM ? Number(seasonM[1] || seasonM[2]) : null
      if (seasonNum !== null) {
        const ids = db.personalities.filter(p => (p.season ?? 0) === seasonNum).map(p => p.id)
        if (!ids.length) { await this.reply(`没有赛季${seasonNum}人格`); return true }
        return this._renderCatalogPage(ids, `赛季${seasonNum}人格`)
      }
      await this.reply(`没有「${q}」。\n用法：#图鉴 <罪人名> 或 #图鉴 N灯`)
      return true
    }
    // 3) 无参 → 稀有度概览
    const cnt = {}
    db.personalities.forEach(p => { const r = p.rank ?? 0; cnt[r] = (cnt[r] || 0) + 1 })
    const lines = Object.entries(cnt).sort((a, b) => a[0] - b[0]).map(([r, n]) => `${r}灯：${n} 个`)
    await this.reply(`【人格图鉴概览】\n${lines.join('\n')}\n\n用法：#图鉴 3灯 看全部3灯人格；#图鉴 良秀 看该罪人人格（翻页 #下一页）`)
    return true
  }

  /** 渲染图鉴人格分页：存 selection，显示当前页前8个，支持翻页/序号选择 */
  /** 渲染图鉴分页（通用）：存 selection，显示当前页前8个，支持翻页/序号选择。opts: {kindName, render, tpl, label} */
  async _renderCatalogPage(ids, title, opts = {}) {
    const PAGE = 8
    const kindName = opts.kindName || '人格'
    const render = opts.render || buildPersonalityCard
    const tpl = opts.tpl || 'personality/personality'
    const label = opts.label || ((id, i) => { const p = db.getPersonality(id); return `${i + 1}. ${p.name}（${p.rank}灯 ${p.season === 0 ? '' : 'S' + p.season}）` })
    const page = 0
    const totalPages = Math.max(1, Math.ceil(ids.length / PAGE))
    const shown = ids.slice(0, PAGE)
    rememberSelect(this.e.user_id, { ids, kindName, render, tpl, page, pageSize: PAGE })
    const lines = shown.map((id, i) => label(id, i))
    const more = ids.length > PAGE ? `\n…等 ${ids.length} 个 · 回复 下一页/上一页/第N页 翻页，序号查看详情` : ''
    await this.reply(`【${title}】第 ${page + 1}/${totalPages} 页\n` + lines.join('\n') + more)
    return true
  }

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
    // 十连：图片卡片墙
    const cards = results.map(r => {
      const art = r.kind === 'ego' ? artUrl(r.id, 'awaken_profile') : artUrl(r.id, 'normal')
      const rar = r.kind === 'ego' ? (r.grade || '?') : `第${r.rank}星`
      const color = { 1: '#d8433c', 2: '#e8b93c', 3: '#6aa8e8', 4: '#c88ae0', 5: '#7ec27e' }[r.rarity] || '#a8a8a8'
      return { art, name: r.name, rarityName: rar, rarityColor: color, isRare: r.rarity <= 2 }
    })
    const rare = results.filter(r => r.rarity <= 2).length
    await runtimeRender(this.e, 'search/gacha', { results: cards, rareCount: rare, gachaMulti: true }, { scale: 1.4 })
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
    // 概率模型(参考游戏标准抽卡)：人格 3灯1.7%/2灯12%/1灯48% + EGO WAW2%/HE4%/TETH15%/ZAYIN17%
    // rarity: 数值越小越稀有（1=3灯人格, 2=WAW, 3=2灯/HE, 4=TETH, 5=1灯/ZAYIN）
    const roll = Math.random() * 100
    if (roll < 1.7) { // 人格 3灯（最稀有）
      const pool = db.personalities.filter(p => (p.rank ?? 0) >= 3)
      return this._pick(pool, 'personality', 1)
    } else if (roll < 13.7) { // 人格 2灯
      const pool = db.personalities.filter(p => (p.rank ?? 0) === 2)
      return this._pick(pool, 'personality', 3)
    } else if (roll < 61.7) { // 人格 1灯
      const pool = db.personalities.filter(p => (p.rank ?? 0) === 1)
      return this._pick(pool, 'personality', 5)
    } else if (roll < 63.7) { // EGO WAW
      const pool = db.egos.filter(g => g.grade === 'WAW')
      return this._pick(pool, 'ego', 2)
    } else if (roll < 67.7) { // EGO HE
      const pool = db.egos.filter(g => g.grade === 'HE')
      return this._pick(pool, 'ego', 3)
    } else if (roll < 82.7) { // EGO TETH
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