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
  // 现役八罪孽（正版配色：暴食绿/嫉妒紫/色欲棕/傲慢深蓝/忧郁淡蓝/怠惰黄/愤怒红）
  WRATH:    { name: '愤怒', color: '#d8433c' },
  LUST:     { name: '色欲', color: '#8a5a33' },
  SLOTH:    { name: '怠惰', color: '#e2c23a' },
  GLUTTONY: { name: '暴食', color: '#4caf50' },
  GLOOM:    { name: '忧郁', color: '#6fb3e8' },
  PRIDE:    { name: '傲慢', color: '#2b3d8f' },
  ENVY:     { name: '嫉妒', color: '#9b5bb8' },
  // 旧颜色码 → 对应现役罪孽（官方属性枚举）
  AMBER:    { name: '色欲', color: '#8a5a33' },
  VIOLET:   { name: '嫉妒', color: '#9b5bb8' },
  AZURE:    { name: '忧郁', color: '#6fb3e8' },
  CRIMSON:  { name: '愤怒', color: '#d8433c' },
  INDIGO:   { name: '傲慢', color: '#2b3d8f' },
  SCARLET:  { name: '怠惰', color: '#e2c23a' },
  SHAMROCK: { name: '暴食', color: '#4caf50' },
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
  0: { name: '1灯', color: '#a8a8a8' },
  1: { name: '1灯', color: '#a8a8a8' },
  2: { name: '2灯', color: '#7ec27e' },
  3: { name: '3灯', color: '#6aa8e8' },
  4: { name: '4灯', color: '#c88ae0' },
  5: { name: '5灯', color: '#e8b93c' }
}
export const rarityName = (rank) => RARITY[rank]?.name || `${rank}灯`
export const rarityColor = (rank) => RARITY[rank]?.color || '#a8a8a8'

/** 赛季显示标签：普通赛季 0-8 → 赛季N；瓦夜/间章（9xxx）→ 瓦夜 */
export function seasonLabel(season) {
  const s = Number(season) || 0
  if (s >= 1000) return '瓦夜' // 9101-9109 等：脑叶联动/瓦夜/间章人格
  return `赛季${s}`
}

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
  // ---- 战斗结果/击杀 ----
  EnemyKill: '击杀敌人',
  TargetKill: '击杀目标',
  AllyKill: '击杀友军',
  CriticalTargetKill: '暴击击杀目标',
  CriticalEnemyTargetKill: '暴击击杀敌方目标',
  EnemyKillFail: '未击杀敌人',
  AllyKillFail: '未击杀友军',
  DuelCounter: '拼点反击',
  Reduction: '削减',
  TabExplain: '说明',
  // ---- 伤害/承伤提升 ----
  CrimsonDamageUp: '愤怒伤害提升',
  AzureDamageUp: '忧郁伤害提升',
  IndigoDamageUp: '傲慢伤害提升',
  VioletDamageUp: '嫉妒伤害提升',
  ShamrockDamageUp: '暴食伤害提升',
  AmberTakeDamageUp: '色欲承伤提升',
  AzureTakeDamageUp: '忧郁承伤提升',
  VioletTakeDamageUp: '嫉妒承伤提升',
  CrimsonTakeDamageUp: '愤怒承伤提升',
  CrimsonResultUp: '愤怒结果提升',
  ScarletTakeDamageUp: '怠惰承伤提升',
  ScarletDamageUp: '怠惰伤害提升',
  AzureResultUp: '忧郁结果提升',
  ShamrockResultUp: '暴食结果提升',
  // ---- 状态/效果 ----
  NiddlePinAlly: '钉针',
  NiddlePin: '钉针',
  NiddleEGO: '钉针',
  NailPersonality: '钉刺',
  TensionUp: '张力提升',
  PinkPetals: '粉瓣',
  BloodyHandGregFirst: '血手',
  RedEyeFirst: '赤瞳',
  GazePersonality: '凝视',
  GazeRyoshu: '凝视',
  SojiRyoshuShin: '剑士的利刃',
  SheutFracture: '裂魂',
  SilverOpportunity: '银色时机',
  GoldenOpportunity: '金色时机',
  VendettaMark: '仇杀标记',
  VillainMark: '反派标记',
  MarkOfButler: '管家印记',
  QueenBeeMark: '蜂后印记',
  RoseThorn: '玫瑰之刺',
  RoseWedge: '玫瑰楔子',
  Cianjing: '淬镜',
  SeniorCianjing: '高级淬镜',
  FirePunchFuel: '火拳燃料',
  FirePunchFuelOverheated: '过热火拳燃料',
  GiftCannon: '礼物炮',
  GiftGlass: '礼物玻璃',
  IDMicroChip: 'ID微芯片',
  PhotoElectricity: '光电',
  HighVoltageExoshell: '高压外骨骼',
  GrownHorns: '生长之角',
  Firstlight: '初光',
  DawnLight: '黎明之光',
  NightPathfinding: '夜行寻路',
  BreakthroughHorse: '破阵之马',
  BattlefieldHorse: '战场之马',
  LegStrength: '腿部力量',
  LegStrengthHorseYisang: '马腿力量',
  ChickenStance: '鸡之架势',
  ChickenFightlust: '鸡之战意',
  SnakeStance: '蛇之架势',
  WideAreaRampage: '广域暴走',
  DimensionRift: '次元裂隙',
  DriftingDimensionYisang: '漂移次元',
  FourDimensionYisang: '四次元',
  SwordCutwithTear: '泪之斩',
  PenetratingSword: '贯穿之剑',
  DragonLance: '龙之枪',
  ChargedSting: '充能之刺',
  CentipedePoison: '蜈蚣之毒',
  SwirlingBloodPersonality: '旋流之血',
  EchoOfMansion: '宅邸回响',
  HystericGauge: '歇斯底里计量',
  MlynarWaiting: '等待(梅斯诺)',
  NervousImpairment: '神经损伤',
  DesperadoBuff: '亡命之徒强化',
  AssemblePersonality: '集结',
  ParadeConcentration: '游行聚集',
  CoveringFire: '掩护射击',
  MeleeCover: '近战掩护',
  TheUdjatOutis: '荷鲁斯之眼',
  BirdCage: '鸟笼',
  RetreatForCommon: '撤退',
  RetaliationBook: '报复之书',
  PaintingMaterial: '画材',
  BoldBrushstrokesRodion: '粗放笔触',
  IntenseColorsRodion: '浓烈色彩',
  ObedienceGregBigBird: '服从',
  DelusionGregBigBird: '妄想',
  LanternGregBigBird: '提灯',
  ObsessionAndGreedRodion: '执念与贪婪',
  TeachersPreyRodion: '师者之猎物',
  FestivalFeverRodion: '节庆狂热',
  AlcoholKimPersonal: '酒',
  PreparedMeat: '备好之肉',
  WornHeartGreg: '疲惫之心',
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
