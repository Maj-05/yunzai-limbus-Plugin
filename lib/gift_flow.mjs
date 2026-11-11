import { readData } from './constants.mjs'
import { translateStatus } from './constants.mjs'

/**
 * 饰品流派归类（镜牢 EGO 饰品按效果关键词归类）。
 * 由于上游 ego-gift-mirrordungeon 稀有度数据缺失（rarity 全为 1），
 * 流派从「效果文本关键词」反推，供「#饰品 <流派>」按流派浏览。
 *
 * 每个流派：key / name / keywords(中英关键词，含状态码) / desc
 * 归类规则：饰品 desc 转译后包含任一关键词即命中该流派；一件可属多流派。
 */
const FLOWS = [
  {
    key: 'break',
    name: '\u7834\u88c2',
    keywords: ['\u7834\u88c2', 'Burst'],
    desc: '\u6309\u5c42\u6570\u56fa\u5b9a\u4f24\u5bb3\uff0c\u9760\u591a\u6bb5\u653b\u51fb\u5feb\u901f\u53e0\u5c42\u3002'
  },
  {
    key: 'burn',
    name: '\u70e7\u4f24',
    keywords: ['\u70e7\u4f24', '\u71c3\u70e7', 'Combustion'],
    desc: '\u56de\u5408\u7ed3\u675f\u6309\u5c42\u6570\u71c3\u70e7\uff0c\u914d\u9707\u98a4\u5f15\u7206\u7206\u53d1\u3002'
  },
  {
    key: 'bleed',
    name: '\u6d41\u8840',
    keywords: ['\u6d41\u8840', 'Laceration'],
    desc: '\u56de\u5408\u5f00\u59cb\u6309\u5c42\u6570\u6d41\u8840\uff0c\u547d\u4e2d\u8ffd\u52a0\u3002'
  },
  {
    key: 'tremor',
    name: '\u9707\u98a4',
    keywords: ['\u9707\u98a4', '\u9707\u52a8', 'Vibration'],
    desc: '\u62fc\u70b9\u5931\u8d25\u6309\u5c42\u6570\u5f15\u7206\uff0c\u9700\u5145\u80fd\u5f15\u64ce\u652f\u6491\u3002'
  },
  {
    key: 'sink',
    name: '\u6c89\u6ca6',
    keywords: ['\u6c89\u6ca6', 'Sinking'],
    desc: '\u62fc\u70b9\u5931\u8d25\u6309\u5c42\u6570\u524a\u7406\u667a/\u7cbe\u795e\u3002'
  },
  {
    key: 'breath',
    name: '\u547c\u5438',
    keywords: ['\u547c\u5438', 'Breath', 'Poise'],
    desc: '\u547d\u4e2d\u63d0\u5347\u786c\u5e01\u5a01\u529b\u4e0e\u66b4\u51fb\u7387\u3002'
  },
  {
    key: 'charge',
    name: '\u5145\u80fd',
    keywords: ['\u5145\u80fd', 'Charge'],
    desc: '\u79ef\u7d2f\u8d44\u6e90\u4f9b\u6280\u80fd\u6d88\u8017\u5f3a\u5316\u3002'
  }
]

/** 每条饰品 → 命中的流派 key 列表（去重） */
function classifyGift (g) {
  const text = translateStatus((g.desc || '') + ' ' + (g.name || ''))
  const hit = []
  for (const f of FLOWS) {
    if (f.keywords.some(k => text.includes(k))) hit.push(f.key)
  }
  return hit
}

/** 全量饰品按流派归类：{ flowKey: [{id,name,rarity}] }，供图鉴/概览 */
export function buildGiftFlowIndex () {
  const gifts = readData('egogifts') || []
  const index = {}
  for (const f of FLOWS) index[f.key] = []
  for (const g of gifts) {
    const hit = classifyGift(g)
    for (const k of hit) index[k].push({ id: g.id, name: g.name, rarity: g.rarity ?? 0 })
  }
  return index
}

/** 流派元数据 */
export function listFlows () {
  return FLOWS.map(f => ({ key: f.key, name: f.name, desc: f.desc }))
}

/** 按 key 或 name 找流派，找不到返回 null */
export function findFlow (q) {
  const s = String(q || '').trim().replace(/\s+/g, '')
  if (!s) return null
  return FLOWS.find(f => f.key === s || f.name === s) || null
}