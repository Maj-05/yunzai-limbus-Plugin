import { readData, fuzzyScore, SINNER_NAMES, NICKNAMES } from './constants.mjs'

/**
 * 图鉴数据库：启动时全量加载 resources/data/*.json 并构建倒排索引。
 * 数据结构：
 *   personalities.json = [{ id, name, title, desc, charId, rank, ... }]  由 build 脚本合并数值+文本
 *   egos.json          = [{ id, name, charId, grade, ... }]
 *   enemies.json       = [{ id, name, ... }]
 *   egogifts.json      = [{ id, name, ... }]
 *   skills.json        = { [skillId]: { name, desc } }
 *   passives.json      = { [passiveId]: { name, desc } }
 */

class DB {
  constructor() {
    this.ready = false
    this.personalities = []
    this.egos = []
    this.enemies = []
    this.egogifts = []
    this.skills = {}
    this.passives = {}
    this.meta = { builtAt: null, sourceVersion: null }
    // 索引
    this._idxPersonality = null
    this._idxEgo = null
    this._idxEnemy = null
    this._idxGift = null
  }

  load() {
    if (this.ready) return true
    try {
      this.personalities = readData('personalities') || []
      this.egos = readData('egos') || []
      this.enemies = readData('enemies') || []
      this.egogifts = readData('egogifts') || []
      this.skills = readData('skills') || {}
      this.passives = readData('passives') || {}
      const meta = readData('meta')
      if (meta) this.meta = meta
      this._buildIndex()
      this.ready = true
      logger.info(
        `[limbus-plugin] 数据载入: 人格${this.personalities.length} EGO${this.egos.length} ` +
        `敌人${this.enemies.length} 饰品${this.egogifts.length} 技能文本${Object.keys(this.skills).length}`
      )
      return true
    } catch (e) {
      logger.error(`[limbus-plugin] 数据载入失败: ${e.message}`)
      return false
    }
  }

  _buildIndex() {
    const mk = () => ({ byName: new Map(), byId: new Map(), aliases: new Map() })
    this._idxPersonality = mk()
    this._idxEgo = mk()
    this._idxEnemy = mk()
    this._idxGift = mk()

    for (const p of this.personalities) {
      this._idxPersonality.byId.set(p.id, p)
      this._addName(this._idxPersonality, p.id, p.name)
      // 别名：罪人名（例如「李箱」命中其全部人格 → 需要列表）
      if (p.charName) {
        if (!this._idxPersonality.aliases.has(p.charName)) {
          this._idxPersonality.aliases.set(p.charName, [])
        }
        this._idxPersonality.aliases.get(p.charName).push(p.id)
      }
    }
    for (const g of this.egos) {
      this._idxEgo.byId.set(g.id, g)
      this._addName(this._idxEgo, g.id, g.name)
      // 别名：罪人名（例如「以实玛利」命中其全部 EGO）
      if (g.charName) {
        if (!this._idxEgo.aliases.has(g.charName)) {
          this._idxEgo.aliases.set(g.charName, [])
        }
        this._idxEgo.aliases.get(g.charName).push(g.id)
      }
    }
    for (const e of this.enemies) {
      this._idxEnemy.byId.set(e.id, e)
      this._addName(this._idxEnemy, e.id, e.name)
    }
    for (const g of this.egogifts) {
      this._idxGift.byId.set(g.id, g)
      this._addName(this._idxGift, g.id, g.name)
    }
  }

  _addName(idx, id, name) {
    if (!name) return
    const key = name.replace(/\s+/g, '')
    if (!idx.byName.has(key)) idx.byName.set(key, [])
    idx.byName.get(key).push(id)
  }

  /**
   * 通用搜索：对全部索引名做「精确→前缀→包含→逐字模糊」评分，
   * 所有候选并集后按分数排序（不提前短路，最大化“记不全名字也能查到”）。
   */
  _search(idx, query, limit = 8) {
    const q = String(query || '').trim().replace(/\s+/g, '')
    if (!q) return []
    const out = []
    const seen = new Set()
    const push = (id, score) => {
      if (seen.has(id)) return
      seen.add(id)
      out.push({ id, score })
    }
    // 数字查询：按 ID 精确/前缀匹配
    if (/^\d+$/.test(q)) {
      const num = Number(q)
      if (idx.byId.has(num)) push(num, 9000)
      // ID 前缀匹配（如 101 → 101xx 人格）
      for (const id of idx.byId.keys()) {
        if (String(id).startsWith(q) && id !== num) push(id, 3000)
      }
    }
    for (const [name, ids] of idx.byName) {
      const s = fuzzyScore(q, name)
      if (s > 0) { for (const id of ids) push(id, s) }
    }
    // 罪人名（人格/EGO 专用，命中该罪人全部条目，按 rank 降序由调用方处理）
    for (const [alias, ids] of idx.aliases || []) {
      if (alias === q) { for (const id of ids) push(id, 5000) }
    }
    // 社区昵称（仅人格搜索使用：兔浮/兔希/浮浮 等）
    const nick = NICKNAMES[q]
    if (nick) {
      if (nick.type === 'id') {
        push(nick.id, 7000)
      } else if (nick.type === 'sinner') {
        const sname = SINNER_NAMES[nick.n]
        for (const [alias, ids] of idx.aliases || []) {
          if (alias === sname) { for (const id of ids) push(id, 7000) }
        }
      }
    }
    out.sort((a, b) => b.score - a.score || a.id - b.id)
    return out.slice(0, limit).map(x => x.id)
  }

  /**
   * 解析罪人查询：若 q 命中某位罪人（全名/简称/昵称），返回其 charId；否则返回 null。
   * 用于「#人格 罪人名」「#ego 罪人名」列出该罪人全部条目。
   */
  resolveSinner(q) {
    this.load()
    const s = String(q || '').trim().replace(/\s+/g, '')
    if (!s) return null
    // 全名命中
    for (const [n, cid] of Object.entries(SINNER_NAMES)) {
      if (cid === s || (NICKNAMES[s]?.type === 'sinner' && NICKNAMES[s].n === Number(n))) {
        return Number(n)
      }
    }
    // 昵称（含简称）→ 罪人编号
    const nick = NICKNAMES[s]
    if (nick?.type === 'sinner') return nick.n
    // 反向：某人名的字符串恰为罪人名（如「浮士德」）
    for (let cid = 1; cid <= 12; cid++) {
      if (SINNER_NAMES[cid] === s) return cid
    }
    return null
  }

  /** 某罪人的全部人格 id（按 rank 降序，其次 id 升序） */
  personalitiesOfSinner(cid) {
    this.load()
    const list = this.personalities.filter(p => p.charId === Number(cid))
    list.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0) || a.id - b.id)
    return list
  }

  /** 某罪人的全部 EGO id（按 grade 等级排序） */
  egosOfSinner(cid) {
    this.load()
    const list = this.egos.filter(g => g.charId === Number(cid))
    const ord = { ZAYIN: 1, TETH: 2, HE: 3, WAW: 4, ALEPH: 5 }
    list.sort((a, b) => (ord[a.grade] ?? 9) - (ord[b.grade] ?? 9) || a.id - b.id)
    return list
  }

  searchPersonality(q, limit) { this.load(); return this._search(this._idxPersonality, q, limit) }
  searchEgo(q, limit) { this.load(); return this._search(this._idxEgo, q, limit) }
  searchEnemy(q, limit) { this.load(); return this._search(this._idxEnemy, q, limit) }
  searchGift(q, limit) { this.load(); return this._search(this._idxGift, q, limit) }

  getPersonality(id) { this.load(); return this._idxPersonality.byId.get(Number(id)) }
  getEgo(id) { this.load(); return this._idxEgo.byId.get(Number(id)) }
  getEnemy(id) { this.load(); return this._idxEnemy.byId.get(Number(id)) }
  getGift(id) { this.load(); return this._idxGift.byId.get(Number(id)) }

  skillText(id) { return this.skills[id] || null }

  /**
   * 被动文本。CN 文本表缺少部分升级变体被动（id 以 11 结尾，如 1010311），
   * 回退到其基础被动（1010301 / 1011001）。
   */
  passiveText(id) {
    let t = this.passives[id]
    if (!t && id) {
      const s = String(id)
      // 升级/支援变体被动：文本表常缺 11/21/31/51 或 02/03 等后缀，
      // 回退到基础被动（低序变体，优先 xxx01）。
      if (s.length >= 7) {
        const root = s.slice(0, -2) // 去掉末两位变体码
        for (const v of ['01', '02', '03', '04', '05', '06']) {
          t = this.passives[root + v]
          if (t) break
        }
      }
    }
    return t || null
  }

  stats() {
    this.load()
    return {
      personalities: this.personalities.length,
      egos: this.egos.length,
      enemies: this.enemies.length,
      egogifts: this.egogifts.length,
      builtAt: this.meta.builtAt,
      sourceVersion: this.meta.sourceVersion
    }
  }
}

export default new DB()