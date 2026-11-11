import db from './db.mjs'
import { artUrl, artLocal } from './cards.mjs'
import { SINNER_NAMES } from './constants.mjs'

/**
 * 画廊（立绘墙）生成器。
 * 本地无 resources/art 缓存时全部走在线热链（artUrl），模板 onerror 隐藏加载失败的图并显示文字占位。
 * 中文统一使用 \u 转义，避免编辑器/传输链路的编码污染。
 */

const RANK_NAME = { 1: '\u4e00\u706f', 2: '\u4e8c\u706f', 3: '\u4e09\u706f' }

function item (p) {
  const local = artLocal(p.id, 'normal')
  const src = local ? { local: true, path: 'art/' + local } : { local: false, url: artUrl(p.id, 'normal') }
  return {
    id: p.id,
    name: p.name || '\u4eba\u683c' + p.id,
    rank: p.rank ?? 1,
    rankName: RANK_NAME[p.rank] || '\u4e00\u706f',
    rankColor: { 1: '#a9a9a9', 2: '#dc143c', 3: '#ffd700' }[p.rank] || '#a9a9a9',
    season: p.season ?? 0,
    seasonLabel: (p.season ?? 0) >= 1000 ? '\u74e6\u591c' : '\u5b63\u8282' + (p.season ?? 0),
    src,
    local
  }
}

/** 全部人格 → 画廊（按罪人分组） */
export function buildGalleryAll () {
  db.load()
  const groups = []
  for (let cid = 1; cid <= 12; cid++) {
    const list = db.personalitiesOfSinner(cid)
    if (!list.length) continue
    groups.push({ charId: cid, charName: SINNER_NAMES[cid] || '\u7f6a\u4eba' + cid, items: list.map(item) })
  }
  return { kind: '\u5168\u90e8\u4eba\u683c\u7acb\u7ed8', groups, total: groups.reduce((s, g) => s + g.items.length, 0) }
}

/** 某罪人 → 画廊 */
export function buildGallerySinner (cid) {
  db.load()
  const list = db.personalitiesOfSinner(cid)
  return {
    kind: (SINNER_NAMES[cid] || '\u7f6a\u4eba' + cid) + '\u7684\u4eba\u683c\u7acb\u7ed8',
    groups: [{ charId: cid, charName: SINNER_NAMES[cid] || '\u7f6a\u4eba' + cid, items: list.map(item) }],
    total: list.length
  }
}

/** 随机一个人格立绘卡 */
export function buildGalleryRandom () {
  db.load()
  const list = db.personalities
  if (!list.length) return null
  const p = list[Math.floor(Math.random() * list.length)]
  return { kind: '\u968f\u673a\u4eba\u683c', groups: [{ charId: p.charId, charName: p.charName, items: [item(p)] }], total: 1 }
}