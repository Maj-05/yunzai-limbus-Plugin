import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const PLUGIN_ROOT = path.resolve(__dirname, '..')
export const DATA_DIR = path.join(PLUGIN_ROOT, 'resources', 'data')

/** 读 resources/data 下的 JSON（缺失返回 null，不抛错） */
export function readData(name) {
  try {
    const p = path.join(DATA_DIR, name.endsWith('.json') ? name : name + '.json')
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    logger.error(`[limbus-dive] 读取数据失败 ${name}: ${e.message}`)
    return null
  }
}

/** 数字补零 */
export const pad = (n, w = 2) => String(n).padStart(w, '0')

/** 罪孽属性 → 中文名+色值
 *  Limbus 现役八罪孽：WRATH/LUST/SLOTH/GLUTTONY/GLOOM/PRIDE/ENVY/NEUTRAL。
 *  兼容旧编码（罪孽色名）：AMBER/VIOLET/AZURE/CRIMSON/INDIGO/SCARLET/SHAMROCK，以及 BLACK/WHITE。
 */
export const SINS = {
  // 现役八罪孽
  WRATH:    { name: '愤怒', color: '#d84343' },
  LUST:     { name: '色欲', color: '#d45a92' },
  SLOTH:    { name: '怠惰', color: '#e8b93c' },
  GLUTTONY: { name: '暴食', color: '#cf8b3c' },
  GLOOM:    { name: '忧郁', color: '#4b8fd4' },
  PRIDE:    { name: '傲慢', color: '#3d3d8f' },
  ENVY:     { name: '嫉妒', color: '#5a9e52' },
  // 旧编码（罪孽色名）
  AMBER:    { name: '琥珀', color: '#c98a2e' },
  VIOLET:   { name: '紫',   color: '#9b59b6' },
  AZURE:    { name: '天蓝', color: '#3f9ce0' },
  CRIMSON:  { name: '绯红', color: '#d84040' },
  INDIGO:   { name: '靛',   color: '#4b50b3' },
  SCARLET:  { name: '猩红', color: '#e03939' },
  SHAMROCK: { name: '绿',   color: '#4caf50' },
  BLACK:    { name: '无',   color: '#8a8a8a' },
  WHITE:    { name: '无',   color: '#d8d8d8' },
  // 通用
  NEUTRAL:  { name: '无',   color: '#888888' },
  NONE:     { name: '无',   color: '#888888' }
}
export const sinName = (k) => SINS[k]?.name || k
export const sinColor = (k) => SINS[k]?.color || '#888888'

/** 伤害类型 */
export const ATK_TYPES = {
  SLASH: '斩击', PENETRATE: '突刺', HIT: '打击',
  ATTACK: '攻击', EVADE: '闪避', GUARD: '守备', COUNTER: '反击', NONE: '—'
}
export const atkName = (k) => ATK_TYPES[k] || k

/** 品质 rank → 稀有度 */
export const RARITY = {
  0: { name: '1星', color: '#a8a8a8' },
  1: { name: '1星', color: '#a8a8a8' },
  2: { name: '2星', color: '#7ec27e' },
  3: { name: '3星', color: '#6aa8e8' },
  4: { name: '4星', color: '#c88ae0' },
  5: { name: '5星', color: '#e8b93c' }
}
export const rarityName = (rank) => RARITY[rank]?.name || `${rank}星`
export const rarityColor = (rank) => RARITY[rank]?.color || '#a8a8a8'

/** EGO 等级（ZAYIN/TETH/HE/WAW/ALEPH → 一~五） */
export const EGO_GRADE = {
  ZAYIN: { name: 'ZAYIN', ord: 1, color: '#7ec27e' },
  TETH:  { name: 'TETH',  ord: 2, color: '#6aa8e8' },
  HE:    { name: 'HE',    ord: 3, color: '#e8b93c' },
  WAW:   { name: 'WAW',   ord: 4, color: '#c88ae0' },
  ALEPH: { name: 'ALEPH', ord: 5, color: '#d84343' }
}
export const egoGrade = (k) => EGO_GRADE[k]?.name || k
export const egoGradeColor = (k) => EGO_GRADE[k]?.color || '#888888'

/** 12 罪人中文名（characterId 1-12） */
export const SINNER_NAMES = {
  1: '李箱', 2: '浮士德', 3: '堂吉诃德', 4: '良秀',
  5: '默尔索', 6: '鸿璐', 7: '希斯克利夫', 8: '以实玛利',
  9: '罗佳', 10: '辛克莱', 11: '奥提斯', 12: '格里高尔'
}

/** 社区昵称 → 人格 id 或 罪人编号（便于搜简称）。value: {type:'id',id} 或 {type:'sinner',n} */
export const NICKNAMES = {
  // 罪人简称
  '浮': { type: 'sinner', n: 2 }, '浮浮': { type: 'sinner', n: 2 },
  '希': { type: 'sinner', n: 7 }, '希斯': { type: 'sinner', n: 7 },
  '以玛': { type: 'sinner', n: 8 }, '以实': { type: 'sinner', n: 8 },
  '梅尔': { type: 'sinner', n: 5 }, '辛': { type: 'sinner', n: 10 },
  '奥提': { type: 'sinner', n: 11 }, '格力': { type: 'sinner', n: 12 },
  // R公司兔子队（兔希 = 希斯克利夫R公司兔子队，已确认）
  '兔希': { type: 'id', id: 10703 },
  // 黑兽系列（罪人黑兽人格，社区简称）
  '兔浮': { type: 'id', id: 10212 },
  '黑兽卯': { type: 'id', id: 10411 },
  '黑兽午': { type: 'id', id: 10114 },
  '黑兽未': { type: 'id', id: 10313 },
  '黑兽酉': { type: 'id', id: 10714 },
  '黑兽巳': { type: 'id', id: 11112 },
  '绝望罗佳': { type: 'id', id: 10913 }
}

/** 字符串相似度评分（用于模糊搜索，越像分越高） */
export function fuzzyScore(query, target) {
  if (!query || !target) return 0
  const q = String(query).toLowerCase()
  const t = String(target).toLowerCase()
  if (t === q) return 10000
  if (t.startsWith(q)) return 6200
  if (t.includes(q)) return 5200
  // 查询比目标长但目标被查询包含（反向前缀），例如目标名只有首字命中
  if (q.includes(t) && t.length >= 2) return 4700

  // 逐字子序列：查询的每个字按顺序出现在目标中（容忍中间有别的字）
  let prev = -1
  let orderedOk = true
  let first = -1
  let last = -1
  for (const ch of q) {
    const at = t.indexOf(ch, prev + 1)
    if (at === -1) { orderedOk = false; break }
    if (first === -1) first = at
    last = at
    prev = at
  }
  if (orderedOk) {
    const span = last - first
    // 连续命中加分：相邻查询字符在目标中也相邻 → 更像是子串
    let consec = 0
    let p = -1
    for (const ch of q) {
      const at = t.indexOf(ch, p + 1)
      if (p !== -1 && at === p + 1) consec++
      p = at
    }
    const base = 4000 - span * 200 + consec * 200
    return Math.max(300, base)
  }

  // 无序兜底：查询所有字都出现在目标中（不计顺序），分低但仍可命中
  let all = true
  for (const ch of q) { if (!t.includes(ch)) { all = false; break } }
  if (all) {
    const share = q.length / Math.max(1, t.length)
    return Math.max(120, Math.round(900 * share))
  }
  return 0
}

/** 常见状态效果/动作关键词 中文映射（把 [Laceration] 这类英文状态码转成中文） */
export const STATUS = {
  // ---- 行动时机 ----
  OnSucceedAttack: '命中时',
  OnSucceedAttackHead: '命中时',
  OnSucceedAttackTail: '命中时',
  CriticalOnSucceedAttack: '命中时(暴击)',
  CriticalOnSucceedAttackHead: '命中时(暴击)',
  CriticalOnSucceedAttackTail: '命中时(暴击)',
  UnBrokenCoinOnSucceedAttack: '命中时(完币)',
  ReUseOnSucceedAttack: '命中时(再次使用)',
  ReUseOnSucceedAttackHead: '命中时(再次使用)',
  OnSucceedEvade: '闪避成功时',
  OnDefeatEvade: '闪避失败时',
  OnDirectAttack: '单方面攻击时',
  WhenUse: '使用时',
  BeforeUse: '使用前',
  BeforeAttack: '攻击前',
  BeforeHit: '受击前',
  OnStartCoin: '硬币投掷前',
  StartBattle: '战斗开始',
  StartDuel: '拼点开始时',
  EndSkill: '技能结束时',
  EndSkillHead: '技能结束时',
  EndSkillTail: '技能结束时',
  EndSkillAll: '技能结束时',
  EndBattle: '战斗结束时',
  EndCoin: '硬币结算时',
  WinDuel: '拼点胜利时',
  WinDuelAttack: '拼点攻击胜利时',
  WinDuelAttackHead: '拼点攻击胜利时',
  WinDuelEndSkill: '拼点胜利技能结束时',
  DefeatDuel: '拼点失败时',
  EngageToBattle: '进入战斗时',
  // ---- 常见负面/异常状态 ----
  Combustion: '燃烧',
  Laceration: '撕裂',
  Vibration: '震颤',
  VibrationExplosion: '震颤引爆',
  VibrationIgnition: '震颤点燃',
  FusionVibration: '震颤融合',
  VibrationBleeding: '震颤渗血',
  VibrationDistribution: '震颤传导',
  VibrationCollapse: '震颤崩塌',
  VibrationNesting: '震颤叠加',
  VibrationEcho: '震颤回响',
  VibrationContinue: '震颤持续',
  VibrationSpring: '震颤弹跳',
  VibrationCrack: '震颤裂痕',
  VibrationChainPersonality: '震颤连锁',
  Burst: '引爆',
  BurstAgility: '引爆迅捷',
  BurstPoison: '引爆中毒',
  BurstVulnerableZilu: '引爆易损',
  BurstZilu: '引爆',
  Breath: '呼吸',
  HoldingBreath: '屏息',
  ReleaseBreath: '释放呼吸',
  Sinking: '沉沦',
  SinkingWhite: '沉沦(白)',
  WaveSinking: '波动沉沦',
  Charge: '充能',
  ChargeBodyArt: '充能驱动',
  ChargeForceField: '充能力场',
  ChargeRougeAlly: '充能(针线)',
  ChargeNoirAlly: '充能(黑兽)',
  ShareCharge: '充能共享',
  SuperCharge: '超充能',
  ChoSuperCharge: '超充能',
  WOverCharge: '过充能',
  SelfChargeAlly: '自充能',
  Aggro: '嘲讽',
  Agility: '迅捷',
  Binding: '束缚',
  Snare: '缠绕',
  AttackUp: '攻击强化',
  AttackDmgUp: '攻击伤害提升',
  AttackDown: '攻击削弱',
  AttackDmgDown: '攻击伤害降低',
  DefenseUp: '防御强化',
  DefenseDown: '防御削弱',
  Protection: '保护',
  Vulnerable: '易损',
  Enhancement: '强化',
  EnhanceZilu: '强化',
  Curse: '诅咒',
  Paralysis: '麻痹',
  Discard: '弃牌',
  Disarming: '缴械',
  Retreat: '撤退',
  CoverAttack: '掩护攻击',
  Inspire: '鼓舞',
  Endurance: '坚韧',
  BloodDinner: '血宴',
  CantIdentify: '无法辨认',
  CantDuel: '无法拼点',
  CanDuelGuard: '可拼点守备',
  CantChangeTarget: '无法更换目标',
  CriticalActivated: '暴击触发',
  CriticalDamageUp: '暴击伤害提升',
  ResultEnhancement: '结果强化',
  ResultReduction: '结果削弱',
  ParryingResultUp: '拼点结果提升',
  SlashDamageUp: '斩击伤害提升',
  SlashResultUp: '斩击结果提升',
  SlashResistDown: '斩击抗性下降',
  SlashTakeDamageUp: '斩击承伤提升',
  PenetrateDamageUp: '突刺伤害提升',
  PenetrateResultUp: '突刺结果提升',
  HitDamageUp: '打击伤害提升',
  HitResultUp: '打击结果提升',
  HitResistDown: '打击抗性下降',
  PlusCoinValueUp: '硬币威力提升',
  PlusCoinValueDown: '硬币威力降低',
  MinusCoinValueUp: '反币威力提升',
  MinusCoinValueDown: '反币威力降低',
  SkillPowerUp: '技能威力提升',
  TakeHpHealIncrease: '生命回复量提升',
  DarkFlame: '暗焰',
  ReloadLament: '装填(哀叹)',
  FullReload: '完全装填',
  AimForTheGoal: '瞄准目标',
  SnipingArrowMode: '狙击箭模式',
  SuperCoin: '超金币',
  Bullet: '子弹',
  BulletLament: '子弹(哀叹)',
  AccelBullet: '加速弹',
  FireBulletPropellant: '火焰子弹推进剂',
  BulletPropellantAlly: '子弹推进剂',
  BulletPropellantSpecialAlly: '特殊子弹推进剂',
  BulletGodok: '子弹(鸦毒)',
  TimeSuspend: '时间停滞',
  UltraPrecisionTimeAcceleration: '超精密时间加速',
  KnowledgeExplored: '情报探查',
  ObjectOfExploration: '探索对象',
  KnowledgeTraining: '情报训练',
  SupportProtect: '支援保护',
  ProtectiveSword: '护卫之剑',
  VengeanceBookHeathcliff: '复仇之书',
  VengeanceBookSinclair: '复仇之书',
  WildHunt: '狂猎',
  CondensedBlood: '凝缩血液',
  Coffin: '棺柩',
}

/**
 * 将描述里的 [英文状态码] 转成 [中文]，并清理 LLC 富文本标记。
 * 1. 清理 <style=...> </style> <noparse> <i> <color=#...> 及 <中文关键词> 标签
 * 2. [Code] 括号状态码 → 中文
 * 3. 裸英文状态码（无括号）→ 中文
 * 未收录的保留原样。
 */
export function translateStatus (text) {
  if (!text) return text
  let s = String(text)
  // 1. 清理 LLC 富文本标记
  s = s
    .replace(/<style="[^"]*">/g, '')
    .replace(/<color=[^>]*>/g, '')
    .replace(/<noparse>/g, '').replace(/<\/noparse>/g, '')
    .replace(/<i>/g, '').replace(/<\/i>/g, '')
    .replace(/<\/?[^>]*>/g, '')  // 兜底：清理其余全部标签
  // 2. 括号状态码
  s = s.replace(/\[([A-Za-z][A-Za-z0-9]*)\]/g, (m, k) => {
    const zh = STATUS[k]
    return zh ? `[${zh}]` : m
  })
  // 3. 裸英文状态码（无括号，词边界匹配，仅当是已知状态时才替换，避免误伤正常英文）
  s = s.replace(/\b([A-Za-z][A-Za-z0-9]*)\b/g, (m, k) => {
    if (STATUS[k]) return STATUS[k]
    return m
  })
  return s
}
