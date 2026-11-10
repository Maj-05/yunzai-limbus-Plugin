import { rulePrefix } from '../utils/common.js'
import runtimeRender from '../utils/runtimeRender.js'

/** 帮助菜单：参考 arknights-plugin 的分组卡片式布局 */
const helpList = [
  {
    group: '图鉴查询',
    list: [
      { icon: 1, title: '#人格 <名称>', desc: '人格详情：数值/技能/被动/抗性' },
      { icon: 2, title: '#ego <名称>', desc: 'E.G.O 详情：觉醒/侵蚀/费用/抗性' },
      { icon: 3, title: '#敌人 <名称>', desc: '敌人详情：技能/抗性' },
      { icon: 4, title: '#饰品 <名称>', desc: '镜牢 E.G.O 饰品' },
      { icon: 5, title: '#人格 <罪人名>', desc: '列出该罪人全部人格，例:#人格 良秀' },
      { icon: 6, title: '#人格 <罪人> <赛季>', desc: '按赛季过滤，例:#人格 良秀 3' },
      { icon: 7, title: '#饰品列表 [级别]', desc: '饰品按级别概览 / 指定级别，例:#饰品列表 1' },
      { icon: 8, title: '#人格 10201 / #ego 20307', desc: '直接按 ID 查询' },
      { icon: 9, title: '回复 1-8', desc: '多命中时回复序号直接选中' },
      { icon: 11, title: '#敌人 类型', desc: '按类型筛选：异常体/部位/人类/头目，详列见 #敌人帮助' },
      { icon: 12, title: '#状态 <状态名>', desc: '速查异常状态机制，例:#状态 破裂 / 烧伤 / 震颤' },
      { icon: 26, title: '#技能 <关键词>', desc: '按效果搜索人格技能/被动，例:#技能 破裂 / 流血 / 充能' },
      { icon: 27, title: '#抗性 <人格/敌人>', desc: '速查对斩/突/打的攻击抗性，如 #抗性 李箱' },
      { icon: 13, title: '#罪人 [罪人名]', desc: '罪人总览 / 按名看详情(人格+EGO)，如 #罪人 良秀' },
      { icon: 14, title: '#随机人格 / #随机ego', desc: '随机展示一张人格或 E.G.O 卡' },
      { icon: 15, title: '#人格 <罪人> N灯', desc: '按稀有度过滤，例:#人格 良秀 3灯' },
      { icon: 28, title: '#人格对比 A B', desc: '文本对比两张人格数值/技能/抗性，如 #人格对比 良秀黑云会 良秀W公司' },
      { icon: 29, title: '#图鉴 [罪人/N灯/赛季]', desc: '全量人格图鉴：3灯/N灯/赛季N/瓦夜/罪人名 浏览(支持分页)' },
      { icon: 30, title: '#ego图鉴 [罪人/等级]', desc: '全量E.G.O图鉴：无参=等级概览，WAW=列该等级，罪人名=该罪人EGO' },
      { icon: 31, title: '#敌图鉴 [类型]', desc: '全量敌人图鉴：无参=类型概览，异常体/部位/人类/头目=列该类型(分页)' },
      { icon: 20, title: '#ego <罪人> <等级>', desc: '按 E.G.O 等级过滤，例:#ego 良秀 WAW' },
      { icon: 21, title: '#流派 <流派名>', desc: '镜牢饰品流派推荐，例:#流派 烧伤 / 震颤 / 流血' },
      { icon: 22, title: '#配队 <流派名>', desc: '推荐该流派人格+E.G.O 组合，例:#配队 破裂 / 烧伤' },
      { icon: 23, title: '#抽卡 [十连]', desc: '抽卡模拟：单抽一张卡 / 十连，如 #抽卡 十连' },
      { icon: 24, title: '#抽卡预算 <狂气>...', desc: '攒抽估算：狂气/券→可抽数，可选剩余天数，如 #抽卡预算 13000 5 2 30' },
      { icon: 25, title: '#事件 [随机/名]', desc: '镜牢探索事件速查：随机/查询，如 #事件 随机' }
    ]
  }, {
    group: '帮助与数据',
    list: [
      { icon: 16, title: '#limbus帮助 / #巴士帮助 / #084帮助', desc: '打开帮助菜单' },
      { icon: 17, title: '#limbus更新 / 强制 / 数据', desc: '(master) 更新插件+数据 / 强制 / 仅数据' },
      { icon: 18, title: '#图鉴状态', desc: '查看数据统计' },
      { icon: 19, title: '#limbus版本', desc: '查看插件版本号' }
    ]
  }
]

/** 分类帮助：人格 / 敌人 / EGO */
const CATEGORY_HELP = {
  personality: {
    title: '人格查询帮助',
    subTitle: 'Limbus-plugin · 如何搜人格',
    list: [
      { title: '#人格 名称', desc: '按人格全名/部分文字搜索，如「#人格 兔希」「#人格 黑云会」' },
      { title: '#人格 罪人名', desc: '列出该罪人全部人格，例「#人格 良秀」' },
      { title: '#人格 浮 / 希 / 梅尔', desc: '罪人简称也能搜，如浮=浮士德、希=希斯克利夫' },
      { title: '#人格 兔子 / 驯鹿 / 犀牛', desc: '按R公司称号搜索（兔希=希斯克利夫R公司兔子队）' },
      { title: '#人格 <罪人> N灯', desc: '按稀有度过滤，例「#人格 良秀 3灯」' },
      { title: '记不住全名？', desc: '输入任意连续片段即可，如「#人格 深郁」' }
    ]
  },
  enemy: {
    title: '敌人查询帮助',
    subTitle: 'Limbus-plugin · 如何搜敌人',
    list: [
      { title: '#敌人 名称', desc: '按敌人全名/部分文字搜索，如「#敌人 黑檀女王的苹果」' },
      { title: '#敌人 片段', desc: '记不全时输入部分文字，如「#敌人 黑檀」' },
      { title: '#敌人 异常体', desc: '只列异常体本体，如「#敌人 异常体」' },
      { title: '#敌人 部位', desc: '只列异常体的身体部位，如「#敌人 部位」' },
      { title: '#敌人 人类', desc: '只列人类单位敌人，如「#敌人 人类」' },
      { title: '#敌人 头目', desc: '只列人类头目，如「#敌人 头目」' },
      { title: '#敌人 类型', desc: '先看各类型数量概览，再选具体类型' },
      { title: '拼音/英文？', desc: '暂不支持拼音，请用中文名搜索' }
    ]
  },
  ego: {
    title: 'E.G.O 查询帮助',
    subTitle: 'Limbus-plugin · 如何搜 E.G.O',
    list: [
      { title: '#ego 名称', desc: '按E.G.O名称搜索，如「#ego 狐雨」' },
      { title: '#ego 罪人名', desc: '列出该罪人全部 E.G.O，例「#ego 良秀」' },
      { title: '#ego <罪人> <等级>', desc: '按等级过滤，例「#ego 良秀 WAW」(ZAYIN/TETH/HE/WAW/ALEPH)' },
      { title: '#ego 片段', desc: '记不全时输入部分文字即可命中' }
    ]
  }
}

const helpCfg = {
  title: 'Limbus-plugin 帮助',
  subTitle: 'Yunzai-Bot & limbus-plugin',
  columnCount: 2,
  colWidth: 380,
  style: {
    fontColor: '#d3bc8e',
    descColor: '#eee',
    contBgColor: 'rgba(20, 20, 28, .75)',
    contBgBlur: 3,
    headerBgColor: 'rgba(30, 30, 42, .6)',
    rowBgColor1: 'rgba(20, 20, 28, .4)',
    rowBgColor2: 'rgba(20, 20, 28, .65)'
  }
}

export class LimbusHelp extends plugin {
  constructor() {
    super({
      name: '[limbus-plugin]帮助',
      dsc: '边狱插件帮助',
      event: 'message',
      priority: 490,
      rule: [
        // 主帮助：带任意前缀或裸 #帮助
        { reg: '^#(?:边狱|巴士|limbus|Limbus|084)?帮助$', fnc: 'help' },
        { reg: '^#帮助$', fnc: 'help' },
        // 分类帮助
        { reg: '^#(?:边狱|巴士|limbus|Limbus|084)?(?:人格|身份)帮助$', fnc: 'helpPersonality' },
        { reg: '^#(?:边狱|巴士|limbus|Limbus|084)?敌人帮助$', fnc: 'helpEnemy' },
        { reg: '^#(?:边狱|巴士|limbus|Limbus|084)?(?:ego|EGO)帮助$', fnc: 'helpEgo' },
        // 兜底：限时叫 limbus/巴士/084 也弹主帮助
        { reg: '^#(?:边狱|巴士|limbus|Limbus|084)$', fnc: 'help' }
      ]
    })
  }

  async _helpCategory(kind) {
    const cat = CATEGORY_HELP[kind]
    if (!cat) return false
    const helpGroup = [{
      group: '命令示例',
      list: cat.list.map(h => ({ ...h, css: 'display:none' }))
    }]
    const helpCfg = {
      title: cat.title,
      subTitle: cat.subTitle,
      columnCount: 1,
      colWidth: 760,
      style: {
        fontColor: '#d3bc8e',
        descColor: '#eee',
        contBgColor: 'rgba(20, 20, 28, .75)',
        contBgBlur: 3,
        headerBgColor: 'rgba(30, 30, 42, .6)',
        rowBgColor1: 'rgba(20, 20, 28, .4)',
        rowBgColor2: 'rgba(20, 20, 28, .65)'
      }
    }
    return await runtimeRender(this.e, 'help/index', {
      helpCfg, helpGroup, colCount: helpCfg.columnCount
    }, { scale: 1.6 })
  }

  async helpPersonality() { return this._helpCategory('personality') }
  async helpEnemy() { return this._helpCategory('enemy') }
  async helpEgo() { return this._helpCategory('ego') }

  async help() {
    const helpGroup = helpList.map(g => {
      g.list = g.list.map(h => ({ ...h, css: 'display:none' }))
      return g
    })
    return await runtimeRender(this.e, 'help/index', {
      helpCfg,
      helpGroup,
      colCount: helpCfg.columnCount
    }, { scale: 1.6 })
  }
}