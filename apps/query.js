import db from '../lib/db.mjs'
import { rulePrefix } from '../utils/common.js'
import runtimeRender from '../utils/runtimeRender.js'
import { buildEgoCard, buildEnemyCard, buildGiftCard, buildGiftList, buildSinnerEgoList, suggestions } from '../lib/cards.mjs'
import { rememberSelect, peekSelect, clearSelect, updatePage } from '../lib/selection.mjs'
import { findFlow, buildGiftFlowIndex, listFlows } from '../lib/gift_flow.mjs'

export class LimbusQuery2 extends plugin {
  constructor() {
    super({
      name: '[limbus-plugin]EGO/敌人/饰品查询',
      dsc: '边狱巴士图鉴查询',
      event: 'message',
      priority: 500,
      rule: [
        { reg: `^${rulePrefix}(?:ego|EGO|E\\.G\\.O)\\s*(.+)$`, fnc: 'queryEgo' },
        { reg: `^${rulePrefix}(?:敌人|abnormality)\\s*(.+)$`, fnc: 'queryEnemy' },
        { reg: `^${rulePrefix}(?:饰品|egogift)(?:列表|list|全部)\s*(\\d{0,2})$`, fnc: 'giftList' },
        { reg: `^${rulePrefix}(?:饰品|egogift|EGO饰品)\\s*(.+)$`, fnc: 'queryGift' },
        { reg: '^#?[1-8]$', fnc: 'selectNumber' },
        { reg: '^#?(?:下一页|下页)$', fnc: 'turnPage' },
        { reg: '^#?(?:上一页|上页)$', fnc: 'turnPage' },
        { reg: '^#?第(\\d{1,3})页$', fnc: 'turnPage' }
      ]
    })
  }

  _strip(msg, kw) {
    let q = msg.replace(/#|\/|边狱|巴士|084|limbus|Limbus/gi, '').trim()
    q = q.replace(new RegExp(`^${kw}\\s*`, 'i'), '').trim()
    return q
  }

  async _query(kind, kindName, kindKey, q, renderFn, tplPath, hint) {
    if (!q) {
      await this.reply(hint)
      return true
    }
    if (q === '帮助') return false  // 交给 help.js
    if (!db.load()) {
      await this.reply('图鉴数据未就绪，请联系管理员运行数据构建')
      return true
    }
    const ids = kind.search(q, 8)
    if (ids.length === 0) {
      await this.reply(`没有找到「${q}」相关条目`)
      return true
    }
    if (ids.length > 1) {
      const first = kind.get(ids[0])
      const isExact = first?.name && first.name.replace(/\s+/g, '') === q.replace(/\s+/g, '')
      if (!isExact) {
        rememberSelect(this.e.user_id, { ids, kindName, render: renderFn, tpl: tplPath })
        await runtimeRender(this.e, 'search/search', {
          kind: kindName,
          keyword: q,
          results: suggestions(ids, kindKey)
        }, { scale: 1.4 })
        return true
      }
    }
    const card = renderFn(ids[0])
    if (!card) {
      await this.reply('数据缺失，请联系管理员更新图鉴')
      return true
    }
    await runtimeRender(this.e, tplPath, { card }, { scale: 1.4 })
    return true
  }

  async queryEgo() {
    const raw = this._strip(this.e.msg, 'ego|E\.G\.O|EGO')
    // 罪人名 → 列出该罪人全部 EGO（图片列表），支持 #ego 良秀 WAW 按等级过滤
    // 尾部匹配 EGO 等级（ZAYIN/TETH/HE/WAW/ALEPH，大小写不限）
    let grade = null
    let q = raw
    const gm = q.match(/\s*([A-Za-z]{3,6})\s*$/i)
    if (gm && /^(ZAYIN|TETH|HE|WAW|ALEPH)$/i.test(gm[1])) {
      grade = gm[1].toUpperCase()
      q = q.slice(0, q.length - gm[0].length).trim()
    }
    const cid = db.resolveSinner(q)
    if (cid) {
      const list = buildSinnerEgoList(cid, grade)
      await runtimeRender(this.e, 'search/sinner_list', list, { scale: 1.4 })
      return true
    }
    return this._query(
      { search: db.searchEgo.bind(db), get: db.getEgo.bind(db) },
      'E.G.O', 'ego',
      q,
      buildEgoCard, 'ego/ego',
      '用法：#ego 名称，例如 #ego 狐雨'
    )
  }
  async queryEnemy() {
    const q = this._strip(this.e.msg, '敌人|abnormality')
    if (!db.load()) {
      await this.reply('图鉴数据未就绪，请联系管理员运行数据构建')
      return true
    }
    // 类型筛选：#敌人 异常体 / #敌人 部位 / #敌人 人类 / #敌人 头目 等（支持分页）
    const tkw = db.enemyTypeKeyword(q)
    if (tkw) {
      const ids = db.enemiesOfType(tkw.type)
      if (!ids.length) { await this.reply(`没有「${tkw.label}」类型的敌人`); return true }
      const PAGE = 8
      const page = 0
      const totalPages = Math.max(1, Math.ceil(ids.length / PAGE))
      const shown = ids.slice(page * PAGE, page * PAGE + PAGE)
      rememberSelect(this.e.user_id, { ids, kindName: '敌人', render: buildEnemyCard, tpl: 'enemy/enemy', page, pageSize: PAGE })
      await runtimeRender(this.e, 'search/search', {
        kind: `敌人·${tkw.label}`,
        keyword: `${tkw.label}（共 ${ids.length} 个，第 ${page + 1}/${totalPages} 页）`,
        results: suggestions(shown, 'enemy'),
        page: { cur: page + 1, total: totalPages }
      }, { scale: 1.4 })
      return true
    }
    // 类型概览：#敌人 类型 / #敌人 分类
    if (/^(类型|分类)$/i.test(q)) {
      const c = db.enemyTypeCounts()
      const lines = Object.entries(c).map(([k, v]) => `· ${v.label}：${v.count} 个`)
      await this.reply(`【敌人类型概览】\n${lines.join('\n')}\n\n用法：#敌人 <类型>，如 #敌人 异常体 / 部位 / 人类 / 头目`)
      return true
    }
    return this._query(
      { search: db.searchEnemy.bind(db), get: db.getEnemy.bind(db) },
      '敌人', 'enemy',
      q,
      buildEnemyCard, 'enemy/enemy',
      '用法：#敌人 名称，例如 #敌人 黑檀女王的苹果\n或按类型：异常体 / 部位 / 人类 / 头目'
    )
  }

  async queryGift() {
    // 列表关键词兜底（#饰品 列表 等带空格写法）
    const raw = this._strip(this.e.msg, '饰品|egogift|EGO饰品')
    if (/^(列表|list|全部)$/i.test(raw)) return this.giftList()
    // 流派概览：#饰品 流派 → 列出所有流派及各数量
    if (/^(流派|流派列表)$/i.test(raw)) return this._giftFlowOverview()
    // 流派图鉴：#饰品 <流派名> → 列出该流派全部饰品（文本 + 翻页）
    if (raw) {
      const flow = findFlow(raw)
      if (flow) return this._giftFlowView(flow)
    }
    return this._query(
      { search: db.searchGift.bind(db), get: db.getGift.bind(db) },
      '饰品', 'gift',
      raw,
      buildGiftCard, 'gift/gift',
      '用法：#饰品 名称，例如 #饰品 信徒面具'
    )
  }

  /** #饰品 流派：各流派数量概览 */
  async _giftFlowOverview() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const idx = buildGiftFlowIndex()
    const flows = listFlows()
    const lines = flows.map(f => `· ${f.name}：${(idx[f.key] || []).length} 件`).join('\n')
    await this.reply(`【镜牢饰品流派】\n${lines}\n\n用法：#饰品 <流派名> 看该流派全部饰品，如 #饰品 烧伤 / 流血 / 震颤`)
    return true
  }

  /** #饰品 <流派>：列该流派全部饰品（文本），存 selection 支持翻页/序号查看详情 */
  async _giftFlowView(flow) {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const idx = buildGiftFlowIndex()
    const list = idx[flow.key] || []
    if (!list.length) { await this.reply(`「${flow.name}」流派暂无饰品`); return true }
    const ids = list.map(g => g.id)
    const PAGE = 8
    const page = 0
    const totalPages = Math.max(1, Math.ceil(ids.length / PAGE))
    const shown = ids.slice(0, PAGE)
    rememberSelect(this.e.user_id, { ids, kindName: '饰品', render: buildGiftCard, tpl: 'gift/gift', page, pageSize: PAGE })
    const names = {}
    for (const g of list) names[g.id] = g.name
    const lines = shown.map((id, i) => `${i + 1}. ${names[id]}`)
    const more = ids.length > PAGE ? `\n…等 ${ids.length} 件 · 回复 下一页/上一页/第N页 翻页，序号查看详情` : ''
    await this.reply(`【${flow.name}流饰品】${flow.desc}\n共 ${ids.length} 件（第 ${page + 1}/${totalPages} 页）\n${lines.join('\n')}${more}`)
    return true
  }

  async status() {
    if (!db.load()) {
      await this.reply('图鉴数据未就绪')
      return true
    }
    const s = db.stats()
    await this.reply(
      `【边狱图鉴数据】\n` +
      `人格: ${s.personalities}\nE.G.O: ${s.egos}\n敌人: ${s.enemies}\n饰品: ${s.egogifts}\n` +
      (s.builtAt ? `构建时间: ${s.builtAt}` : '')
    )
    return true
  }

  async giftList() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    // #饰品列表 2 → 只显示级别2
    const m = this.e.msg.match(/(\d{1,2})\s*$/)
    const level = m ? Number(m[1]) : null
    const data = buildGiftList(level)
    await runtimeRender(this.e, 'search/gift_list', data, { scale: 1.4 })
    return true
  }

  async selectNumber() {
    const q = this.e.msg.replace(/#/g, '').trim()
    const n = parseInt(q, 10)
    if (!Number.isInteger(n) || n < 1) return false
    const sel = peekSelect(this.e.user_id)
    if (!sel) return false
    if (!db.load()) return false
    // 分页时序号按当前页偏移选取（ids 已是全量，页内 1-8 对应 page*pageSize+n）
    const pageSize = sel.pageSize || sel.ids.length
    const offset = (sel.page || 0) * pageSize
    const id = sel.ids[offset + n - 1]
    if (id == null) { await this.reply('序号超出范围（1-' + Math.min(pageSize, sel.ids.length - offset) + '）'); return true }
    const card = sel.render(id)
    if (!card) { await this.reply('数据缺失，请联系管理员更新图鉴'); clearSelect(this.e.user_id); return true }
    clearSelect(this.e.user_id)
    await runtimeRender(this.e, sel.tpl, { card }, { scale: 1.4 })
    return true
  }

  /** 翻页：#下一页 / #上一页 / #第N页 */
  async turnPage() {
    const msg = this.e.msg.replace(/#/g, '').trim()
    if (!db.load()) return false
    const sel = peekSelect(this.e.user_id)
    if (!sel) return false
    const pageSize = sel.pageSize || 8
    const totalPages = Math.max(1, Math.ceil(sel.ids.length / pageSize))
    const m = msg.match(/^第(\d{1,3})页$/)
    let nextPage
    if (m) {
      nextPage = Number(m[1]) - 1
    } else if (/上[一页]/.test(msg)) {
      nextPage = (sel.page || 0) - 1
    } else { // 下一页/下页
      nextPage = (sel.page || 0) + 1
    }
    if (nextPage < 0) nextPage = 0
    if (nextPage >= totalPages) nextPage = totalPages - 1
    const page = updatePage(this.e.user_id, () => nextPage)
    if (page == null) return false
    const shown = sel.ids.slice(page * pageSize, page * pageSize + pageSize)
    if (!shown.length) { await this.reply('该页无内容'); return true }
    await runtimeRender(this.e, 'search/search', {
      kind: sel.kindName,
      keyword: `${sel.kindName}（第 ${page + 1}/${totalPages} 页）`,
      results: suggestions(shown, { '敌人':'enemy', '人格':'personality', 'E.G.O':'ego', '饰品':'gift' }[sel.kindName] || ''),
      page: { cur: page + 1, total: totalPages }
    }, { scale: 1.4 })
    return true
  }
}