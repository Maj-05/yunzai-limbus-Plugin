import db from '../lib/db.mjs'
import { rulePrefix } from '../utils/common.js'
import runtimeRender from '../utils/runtimeRender.js'
import { buildEgoCard, buildEnemyCard, buildGiftCard, buildSinnerEgoList, suggestions } from '../lib/cards.mjs'

export class LimbusQuery2 extends plugin {
  constructor() {
    super({
      name: '[limbus-dive]EGO/敌人/饰品查询',
      dsc: '边狱巴士图鉴查询',
      event: 'message',
      priority: 500,
      rule: [
        { reg: `^${rulePrefix}(?:ego|EGO|E\\.G\\.O)\\s*(.+)$`, fnc: 'queryEgo' },
        { reg: `^${rulePrefix}(?:敌人|abnormality)\\s*(.+)$`, fnc: 'queryEnemy' },
        { reg: `^${rulePrefix}(?:饰品|egogift|EGO饰品)\\s*(.+)$`, fnc: 'queryGift' },
        { reg: `^${rulePrefix}图鉴状态$`, fnc: 'status' }
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
    const q = this._strip(this.e.msg, 'ego|E\.G\.O|EGO')
    // 罪人名 → 列出该罪人全部 EGO（图片列表）
    const cid = db.resolveSinner(q)
    if (cid) {
      const list = buildSinnerEgoList(cid)
      await runtimeRender(this.e, 'search/sinner_list', list, { scale: 1.4 })
      return true
    }
    return this._query(
      { search: db.searchEgo.bind(db), get: db.getEgo.bind(db) },
      'E.G.O', 'ego',
      q,
      buildEgoCard, 'ego/ego',
      '用法：#ego 名称，例如 #ego 深沉的悲伤'
    )
  }
  async queryEnemy() {
    return this._query(
      { search: db.searchEnemy.bind(db), get: db.getEnemy.bind(db) },
      '敌人', 'enemy',
      this._strip(this.e.msg, '敌人|abnormality'),
      buildEnemyCard, 'enemy/enemy',
      '用法：#敌人 名称，例如 #敌人 深红薄暮'
    )
  }

  async queryGift() {
    return this._query(
      { search: db.searchGift.bind(db), get: db.getGift.bind(db) },
      '饰品', 'gift',
      this._strip(this.e.msg, '饰品|egogift|EGO饰品'),
      buildGiftCard, 'gift/gift',
      '用法：#饰品 名称，例如 #饰品 万人敌'
    )
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
}