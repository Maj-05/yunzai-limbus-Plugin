import { rulePrefix } from '../utils/common.js'
import runtimeRender from '../utils/runtimeRender.js'
import db from '../lib/db.mjs'
import { buildPersonalityCard, buildSinnerPersonalityList, suggestions } from '../lib/cards.mjs'
import { rememberSelect, peekSelect, clearSelect } from '../lib/selection.mjs'

export class LimbusQuery extends plugin {
  constructor() {
    super({
      name: '[limbus-plugin]人格查询',
      dsc: '边狱巴士人格图鉴',
      event: 'message',
      priority: 500,
      rule: [
        { reg: `^${rulePrefix}人格对比\s*(.*)$`, fnc: 'comparePersonality' },
        { reg: `^${rulePrefix}(?:人格|身份)\s*(.+)$`, fnc: 'queryPersonality' },
        { reg: '^#?[1-8]$', fnc: 'selectNumber' }
      ]
    })
  }

  async queryPersonality() {
    const q = this.e.msg.replace(/#|\/|边狱|巴士|084|limbus|Limbus|人格|身份/g, '').trim()
    if (!q || q === '帮助') return false  // 帮助交给 help.js
    if (!db.load()) {
      await this.reply('图鉴数据未就绪，请联系管理员运行数据构建')
      return true
    }
    // 罪人名 → 列出该罪人全部人格（图片列表），支持 #人格 良秀 3 按赛季过滤、#人格 良秀 3灯 按稀有度过滤
    let season = null
    let rank = null
    // 尾部「N灯」→ 稀有度；否则尾部「赛季N」或「N」→ 赛季
    const lanternM = q.match(/(?:赛季)?\s*(\d{1,4})\s*灯\s*$/)
    const seasonM = q.match(/(?:赛季)?\s*(\d{1,4})\s*$/)
    if (lanternM) {
      rank = Number(lanternM[1])
      q = q.slice(0, q.length - lanternM[0].length).trim()
    } else if (seasonM) {
      season = Number(seasonM[1])
      q = q.slice(0, q.length - seasonM[0].length).trim()
    }
    const cid = db.resolveSinner(q)
    if (cid) {
      const list = buildSinnerPersonalityList(cid, season, rank)
      await runtimeRender(this.e, 'search/sinner_list', list, { scale: 1.4 })
      return true
    }
    const ids = db.searchPersonality(q, 8)
    if (ids.length === 0) {
      await this.reply(
        `没有找到「${q}」相关人格。\n` +
        `试试输入人格名的部分文字，例如：兔 / 兔子 / 良秀 / R公司\n` +
        `或用罪人名：李箱/浮士德/堂吉诃德/良秀/默尔索/鸿璐/希斯克利夫/以实玛利/罗佳/辛克莱/奥提斯/格里高尔`
      )
      return true
    }
    // 多命中：列前 8 条让用户选
    if (ids.length > 1) {
      const first = db.getPersonality(ids[0])
      const isExact = first && first.name && first.name.replace(/\s+/g, '') === q.replace(/\s+/g, '')
      if (!isExact) {
        const list = suggestions(ids, 'personality')
        rememberSelect(this.e.user_id, { ids, kindName: '人格', render: buildPersonalityCard, tpl: 'personality/personality' })
        await runtimeRender(this.e, 'search/search', {
          kind: '人格',
          keyword: q,
          results: list
        }, { scale: 1.4 })
        return true
      }
    }
    const card = buildPersonalityCard(ids[0])
    if (!card) {
      await this.reply('数据缺失，请联系管理员更新图鉴')
      return true
    }
    await runtimeRender(this.e, 'personality/personality', { card }, { scale: 1.4 })
    return true
  }

  /** #人格对比 A B：图像版并排对比两张人格卡 */
  async comparePersonality() {
    if (!db.load()) { await this.reply('图鉴数据未就绪'); return true }
    const raw = this.e.msg.replace(/#|\/|边狱|巴士|084|limbus|Limbus|人格|对比/g, '').trim()
    const parts = raw.split(/[\s与和、,，]+/).map(x => x.trim()).filter(Boolean).slice(0, 2)
    if (parts.length < 2) { await this.reply('用法：#人格对比 目标A 目标B，例：#人格对比 良秀黑云会若众 良秀W公司3级清扫人员'); return true }
    const pair = []
    for (const p of parts) {
      const ids = db.searchPersonality(p, 1)
      if (!ids.length) { await this.reply('未找到「' + p + '」'); return true }
      const c = buildPersonalityCard(ids[0])
      if (!c) { await this.reply('「' + p + '」数据缺失'); return true }
      pair.push({ card: c })
    }
    await runtimeRender(this.e, 'compare/compare', { pair }, { scale: 1.4 })
    return true
  }

  async selectNumber() {
    const q = this.e.msg.replace(/#/g, '').trim()
    const n = parseInt(q, 10)
    if (!Number.isInteger(n) || n < 1) return false
    const sel = peekSelect(this.e.user_id)
    if (!sel) return false
    if (!db.load()) return false
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
}