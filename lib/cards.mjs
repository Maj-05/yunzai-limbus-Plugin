import db from './db.mjs'
import {
  SINS, sinName, sinColor, ATK_TYPES, atkName,
  RARITY, rarityName, rarityColor, SINNER_NAMES, pad,
  translateStatus, seasonLabel
} from './constants.mjs'

/**
 * 组装渲染数据。
 * personality 记录结构（build 脚本产出）：
 * {
 *   id, name, charName, charId, rank(1-5), season,
 *   hp:{base,inc}, def, speedMin:[..4], speedMax:[..4],
 *   resist: [{type:'SLASH',value:2}...],   // 攻击抗性
 *   skills: [{ skillId, tier(1-3), slot(3/2/1), sin, atkType, coinPower, coinCount, base }...],
 *   defense: { skillId, type },
 *   passives: [{ id, name, desc, on }...]
 * }
 */

/**
 * 组装渲染数据。
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const _cardsDir = path.dirname(fileURLToPath(import.meta.url))
const ART_DIR = path.resolve(_cardsDir, '..', 'resources', 'art')

/**
 * 本地立绘：resources/art/{id}_{kind}.png 存在则返回相对引用（供 {{pluResPath}} 拼接），否则返回空
 */
function artLocal (id, kind = 'normal') {
  const fn = `${id}_${kind}.png`
  const p = path.join(ART_DIR, fn)
  try {
    if (fs.existsSync(p) && fs.statSync(p).size > 5000) return fn
  } catch {}
  return ''
}

/**
 * 灰机wiki图床（MediaWiki 规则）：
 *   原图: https://huiji-public.huijistatic.com/limbuscompany/uploads/{md5[0]}/{md5[0..2]}/{fn}
 * 立绘文件名 = 人格ID：{id}_normal.png（初始）/ {id}_gacksung.png（Ⅲ阶）
 * 注意：huiji-thumb 缩放服务对大部分文件返回 404，故直接热链原图。
 */
export function artUrl (id, kind = 'normal') {
  const fn = `${id}_${kind}.png`
  const md5 = crypto.createHash('md5').update(fn, 'utf8').digest('hex')
  return `https://huiji-public.huijistatic.com/limbuscompany/uploads/${md5[0]}/${md5.slice(0, 2)}/${fn}`
}

export function buildPersonalityCard(id) {
  const p = db.getPersonality(id)
  if (!p) return null
  const card = {
    id: p.id,
    name: p.name || `人格${p.id}`,
    charName: p.charName || SINNER_NAMES[p.charId] || `罪人${p.charId}`,
    charId: p.charId,
    rank: p.rank ?? 1,
    rankName: rarityName(p.rank ?? 1),
    rankColor: rarityColor(p.rank ?? 1),
    season: p.season ?? 0,
    seasonLabel: seasonLabel(p.season),
    hp: p.hp ? `${p.hp.base ?? '?'}` : '?',
    hpInc: p.hp?.inc ?? '?',
    // 等级预览：生命成长 = base + inc*(lv-1)，展示 L1/L40/L50 参考值
    hpLevels: (p.hp && p.hp.base != null && p.hp.inc != null)
      ? [1, 40, 50].map(lv => ({ lv, value: Math.round(p.hp.base + p.hp.inc * (lv - 1)) }))
      : [],

    speed: p.speedMin && p.speedMax
      ? `${Math.min(...p.speedMin)}~${Math.max(...p.speedMax)}`
      : '?',
    def: p.def ?? '?',
    // 立绘：优先本地缓存（resources/art），缺失才热链灰机wiki原图
    // 初始立绘 {id}_normal.png / Ⅲ阶 {id}_gacksung.png
    art: {
      normal: artLocal(p.id, 'normal') || artUrl(p.id, 'normal'),
      gacksung: artLocal(p.id, 'gacksung') || artUrl(p.id, 'gacksung'),
      normalLocal: !!artLocal(p.id, 'normal'),
      gacksungLocal: !!artLocal(p.id, 'gacksung')
    },
    // 模板用：有本地立绘才显示横幅（避免 card.art 缺失时模板报错）
    showArt: !!artLocal(p.id, 'normal'),
    skills: [],
    defense: null,
    passives: []
  }
  // 技能
  for (const s of p.skills || []) {
    const text = db.skillText(s.skillId) || {}
    card.skills.push({
      slot: s.slot,
      tier: s.tier,
      tierLabel: ['一', '二', '三'][s.tier - 1] || s.tier,
      name: text.name || `技能${s.skillId}`,
      desc: translateStatus((text.desc || '').trim()),
      sin: s.sin,
      sinName: sinName(s.sin),
      sinColor: sinColor(s.sin),
      atkType: s.atkType,
      atkName: atkName(s.atkType),
      base: s.base ?? '?',
      coin: s.coin ?? '?',
      power: s.coinPower ?? '?'
    })
  }
  // 排序：1/2/3技能按编号（3最强排后），追撃(0)置后
  card.skills.sort((a, b) => (a.slot === 0 ? 99 : a.slot) - (b.slot === 0 ? 99 : b.slot))
  // 守备技能
  if (p.defense) {
    const text = db.skillText(p.defense.skillId) || {}
    card.defense = {
      name: text.name || '守备',
      desc: translateStatus((text.desc || '').trim()),
      type: atkName(p.defense.type),
      sin: sinName(p.defense.sin),
      sinColor: sinColor(p.defense.sin)
    }
  }
  // 抗性
  card.resist = (p.resist || []).map(r => ({
    type: atkName(r.type),
    value: r.value,
    cls: r.value >= 2 ? 'weak' : r.value <= 0.5 ? 'resist' : 'normal',
    label: r.value >= 2 ? '弱点' : r.value <= 0.5 ? '抵抗' : ''
  }))
  // 被动（去重：同一被动 ID 只显示一次，避免上游数据重复导致相同被动连排）
  const seenPv = new Set()
  for (const pv of p.passives || []) {
    const text = db.passiveText(pv.id) || {}
    const pName = text.name || pv.name || `被动${pv.id}`
    const pOn = pv.on ? '战斗中' : '登场时'
    // 去重键 = 名称+登场时机（同一被动 ID 或回退到同名文本的重复变体都只显示一次）
    const key = `${pName}|${pOn}`
    if (seenPv.has(key)) continue
    seenPv.add(key)
    card.passives.push({
      name: pName,
      desc: translateStatus((text.desc || '').trim()),
      on: pOn,
      res: pv.res ?? 0
    })
  }
  return card
}

/** 罪人全部人格 → 列表渲染数据（立绘缩略图 + 星级 + 赛季 + 名称） */
export function buildSinnerPersonalityList(cid, season) {
  let list = db.personalitiesOfSinner(cid)
  const charName = SINNER_NAMES[cid] || `罪人${cid}`
  // 赛季过滤：赛季号正常 0-8；瓦夜/间章用 >=1000 的 91xx（前端按 seasonLabel 展示），这里按原始 season 过滤
  if (season !== undefined && season !== null) {
    const s = Number(season)
    if (Number.isInteger(s)) list = list.filter(p => (p.season ?? 0) === s)
  }
  return {
    charId: cid,
    charName,
    kind: '人格',
    total: list.length,
    items: list.map(p => ({
      id: p.id,
      name: p.name || `人格${p.id}`,
      rank: p.rank ?? 1,
      rankName: rarityName(p.rank ?? 1),
      rankColor: rarityColor(p.rank ?? 1),
      season: p.season ?? 0,
      seasonLabel: seasonLabel(p.season),
      art: artLocal(p.id, 'normal') || artUrl(p.id, 'normal'),
      artSrc: artLocal(p.id, 'normal') ? artLocal(p.id, 'normal') : artUrl(p.id, 'normal'),
      artLocal: !!artLocal(p.id, 'normal')
    }))
  }
}

/** 罪人全部 EGO → 列表渲染数据 */
export function buildSinnerEgoList(cid) {
  const list = db.egosOfSinner(cid)
  const charName = SINNER_NAMES[cid] || `罪人${cid}`
  return {
    charId: cid,
    charName,
    kind: 'E.G.O',
    total: list.length,
    items: list.map(g => {
      const art = artLocal(g.id, 'awaken_profile') || artUrl(g.id, 'awaken_profile')
      return {
        id: g.id,
        name: g.name || `E.G.O ${g.id}`,
        grade: g.grade || '—',
        gradeName: g.gradeName || g.grade || '—',
        gradeColor: g.gradeColor || '#888',
        season: g.season ?? 0,
        seasonLabel: seasonLabel(g.season),
        art,
        artSrc: art,
        artLocal: !!artLocal(g.id, 'awaken_profile')
      }
    })
  }
}

export function buildEgoCard(id) {
  const g = db.getEgo(id)
  if (!g) return null
  const card = {
    id: g.id,
    name: g.name || `E.G.O ${g.id}`,
    charName: g.charName || SINNER_NAMES[g.charId] || `罪人${g.charId}`,
    grade: g.grade || '—',
    gradeName: g.gradeName || g.grade,
    gradeColor: g.gradeColor || '#888',
    season: g.season ?? 0,
    seasonLabel: seasonLabel(g.season),
    awaken: null,
    corrode: null,
    resist: (g.resist || []).map(r => ({
      sin: sinName(r.sin),
      sinColor: sinColor(r.sin),
      value: r.value,
      cls: r.value >= 2 ? 'weak' : r.value <= 0.5 ? 'resist' : 'normal'
    })),
    cost: (g.cost || []).map(c => ({ sin: sinName(c.sin), sinColor: sinColor(c.sin), num: c.num }))
  }
  if (g.awakenSkillId) {
    const t = db.skillText(g.awakenSkillId) || {}
    card.awaken = { name: t.name || '觉醒', desc: translateStatus((t.desc || '').trim()) }
  }
  if (g.corrodeSkillId) {
    const t = db.skillText(g.corrodeSkillId) || {}
    card.corrode = { name: t.name || '侵蚀', desc: translateStatus((t.desc || '').trim()) }
  }
  return card
}

export function buildEnemyCard(id) {
  const e = db.getEnemy(id)
  if (!e) return null
  return {
    id: e.id,
    name: e.name || `敌人${e.id}`,
    desc: (e.desc || '').trim(),
    skills: (e.skills || []).slice(0, 8).map(s => {
      const t = db.skillText(s.skillId) || {}
      return {
        name: t.name || `技能${s.skillId}`,
        desc: translateStatus((t.desc || '').trim()),
        sin: sinName(s.sin),
        sinColor: sinColor(s.sin)
      }
    }),
    resist: (e.resist || []).map(r => ({
      type: atkName(r.type), value: r.value,
      cls: r.value >= 2 ? 'weak' : r.value <= 0.5 ? 'resist' : 'normal'
    }))
  }
}

// 饰品级别配色（级别I-V）
const GIFT_LEVEL_COLORS = ['#a8a8a8', '#7ec27e', '#6aa8e8', '#c88ae0', '#e8b93c']

/** 饰品列表：level 为空返回各级别计数概览；level=1..5 返回该级别全部饰品 */
export function buildGiftList (level) {
  const list = db.egogifts.slice()
  list.sort((a, b) => (a.rarity ?? 0) - (b.rarity ?? 0) || a.id - b.id)
  const all = []
  const counts = {}
  for (const g of list) {
    const lv = `级别${(g.rarity ?? 0) + 1}`
    counts[lv] = (counts[lv] || 0) + 1
    all.push({ id: g.id, name: g.name || `饰品${g.id}`, levelName: lv, rarityColor: GIFT_LEVEL_COLORS[(g.rarity ?? 0)] || '#a8a8a8' })
  }
  const want = Number(level)
  if (Number.isInteger(want) && want >= 1 && want <= 5) {
    const lv = `级别${want}`
    const items = all.filter(g => g.levelName === lv)
    return { total: items.length, level: lv, counts, groups: [{ lv, items }] }
  }
  // 概览：返回各级别数量，不展开全部
  return {
    total: all.length,
    counts,
    groups: Object.entries(counts).map(([lv, num]) => ({ lv, items: [{ name: `${num} 件`, id: '' }] }))
  }
}

export function buildGiftCard(id) {
  const g = db.getGift(id)
  if (!g) return null
  return {
    id: g.id,
    name: g.name || `饰品${g.id}`,
    desc: (g.desc || '').trim(),
    rarity: g.rarity ?? 0,
    // 饰品稀有度按"级别"分档（I-V，非人格的灯）
    levelName: `级别${((g.rarity ?? 0) + 1)}`,
    rarityName: `级别${((g.rarity ?? 0) + 1)}`,
    rarityColor: GIFT_LEVEL_COLORS[(g.rarity ?? 0)] || '#a8a8a8',
    rarityTier: (g.rarity ?? 0) + 1,
    effects: (g.effects || []).map(x => ({ text: translateStatus((x.text || '').trim()) }))
  }
}

/** 搜索无结果时给相似建议 */
export function suggestions(list, kind) {
  return list.map(id => {
    let name = `#${id}`
    if (kind === 'personality') name = db.getPersonality(id)?.name || name
    if (kind === 'ego') name = db.getEgo(id)?.name || name
    if (kind === 'enemy') name = db.getEnemy(id)?.name || name
    if (kind === 'gift') name = db.getGift(id)?.name || name
    return { id, name }
  })
}