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
      { icon: 5, title: '#人格 <罪人名>', desc: '列出该罪人全部人格，例:#人格 良秀' }
    ]
  }, {
    group: '快速昵称',
    list: [
      { icon: 12, title: '#人格 兔希', desc: '希斯克利夫 R公司兔子队' },
      { icon: 13, title: '#人格 兔子 / 驯鹿 / 犀牛', desc: '按R公司称号搜索' },
      { icon: 14, title: '#人格 浮 / 希 / 梅尔', desc: '罪人简称搜索' },
      { icon: 15, title: '#人格 深郁', desc: '以实玛利 E.G.O 深郁的忧伤' }
    ]
  }, {
    group: '帮助与数据',
    list: [
      { icon: 16, title: '#limbus帮助 / #巴士帮助 / #084帮助', desc: '打开帮助菜单' },
      { icon: 17, title: '#limbus更新', desc: '(master) 更新插件+数据' },
      { icon: 18, title: '#图鉴状态', desc: '查看数据统计' },
      { icon: 19, title: '#limbus版本', desc: '查看插件版本号' }
    ]
  }
]

/** 分类帮助：人格 / 敌人 / EGO */
export const CATEGORY_HELP = {
  personality: {
    title: '人格查询帮助',
    subTitle: 'Limbus-Dive · 如何搜人格',
    list: [
      { title: '#人格 名称', desc: '按人格全名/部分文字搜索，如「#人格 兔希」「#人格 黑云会」' },
      { title: '#人格 罪人名', desc: '列出该罪人全部人格，例「#人格 良秀」' },
      { title: '#人格 浮 / 希 / 梅尔', desc: '罪人简称也能搜，如浮=浮士德、希=希斯克利夫' },
      { title: '#人格 兔子 / 驯鹿 / 犀牛', desc: '按R公司称号搜索（兔希=希斯克利夫R公司兔子队）' },
      { title: '记不住全名？', desc: '输入任意连续片段即可，如「#人格 深郁」' }
    ]
  },
  enemy: {
    title: '敌人查询帮助',
    subTitle: 'Limbus-Dive · 如何搜敌人',
    list: [
      { title: '#敌人 名称', desc: '按敌人全名/部分文字搜索，如「#敌人 深红薄暮」' },
      { title: '#敌人 片段', desc: '记不全时输入部分文字，如「#敌人 大鸟」' },
      { title: '拼音/英文？', desc: '暂不支持拼音，请用中文名搜索' }
    ]
  },
  ego: {
    title: 'E.G.O 查询帮助',
    subTitle: 'Limbus-Dive · 如何搜 E.G.O',
    list: [
      { title: '#ego 名称', desc: '按E.G.O名称搜索，如「#ego 深沉的悲伤」' },
      { title: '#ego 罪人名', desc: '列出该罪人全部 E.G.O，例「#ego 良秀」' },
      { title: '#ego 片段', desc: '记不全时输入部分文字即可命中' }
    ]
  }
}

const helpCfg = {
  title: 'Limbus-Dive 帮助',
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