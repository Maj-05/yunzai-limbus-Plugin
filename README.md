# limbus-plugin

Yunzai (TRSS/Miao) 边狱巴士（Limbus Company）图鉴插件。

## 命令

| 命令 | 说明 |
|---|---|
| `#人格 <名称>` | 人格详情：数值/技能/被动/抗性（支持罪人名列出全部） |
| `#ego <名称>` | E.G.O 详情：费用/抗性/觉醒/侵蚀 |
| `#敌人 <名称>` | 敌人详情：技能/抗性 |
| `#饰品 <名称>` | 镜牢 E.G.O 饰品 |
| `#limbus帮助` | 帮助菜单 |
| `#图鉴状态` | 数据统计 |
| `#limbus更新` | (master) 拉取上游数据重建图鉴 |

## 安装

```bash
cd /path/to/TRSS-Yunzai
git clone https://github.com/Maj-05/yunzai-limbus-dive plugins/limbus-plugin
cd plugins/limbus-plugin && pnpm i
```

## 数据来源与许可

- 数值: [LimbusStaticData](https://git.neonteam.dev/yuvlian/LimbusStaticData)（社区静态数据）
- 中文文本: [LocalizeLimbusCompany](https://github.com/LocalizeLimbusCompany/LocalizeLimbusCompany)（CC BY-NC-SA 4.0）

**本项目中文文本遵循 CC BY-NC-SA 4.0：署名-非商业性使用-相同方式共享。**
严禁将本插件用于任何商业用途。

## 数据

**插件已内置 2026-11 构建的图鉴数据**（185 人格 / 96 E.G.O / 498 敌人 / 634 饰品），开箱即用、全离线查询。

想更新到最新版本数据时才需要 `#limbus更新`（需服务器能访问 git.neonteam.dev 与 github.com）。

## 数据更新

`#limbus更新` 会 git clone/pull 两个上游仓库到 `data/upstream/` 并重建 `resources/data/*.json`。

## 免责声明

本项目为粉丝作品，与 Project Moon 无关。