# limbus-plugin

Yunzai (TRSS/Miao) 边狱巴士（Limbus Company）图鉴插件。

## 命令

| 命令 | 说明 |
|---|---|
| `#人格 <名称>` | 人格详情：数值/技能/被动/抗性（支持模糊搜索、ID查询） |
| `#人格 <罪人名>` | 列出该罪人全部人格 |
| `#人格 <罪人> <赛季N>` | 按赛季过滤该罪人人格，如 `#人格 良秀 3` |
| `#ego <名称>` | E.G.O 详情：费用/抗性/觉醒/侵蚀（支持罪人名、ID） |
| `#敌人 <名称>` | 敌人详情：技能/抗性 |
| `#饰品 <名称>` | 镜牢 E.G.O 饰品 |
| `#饰品列表` | 饰品按级别概览 |
| `#饰品列表 <N>` | 显示某级别全部饰品，如 `#饰品列表 1` |
| `#人格 10201` / `#ego 20307` | 直接按 ID 查询 |
| 回复 `1-8` | 搜索结果多命中时，回复序号直接选中 |
| `#limbus帮助` / `#帮助` | 帮助菜单 |
| `#图鉴状态` | 数据统计 |
| `#limbus版本` | 版本号 |
| `#limbus更新` | (master) 更新插件+数据+立绘 |
| `#limbus强制更新` | (master) 强制更新（放弃本地改动） |
| `#limbus更新数据` | (master) 仅重建数据 |

> 命令均支持 `#巴士` / `#limbus` / `#084` 前缀，如 `#巴士人格 良秀`。

## 安装

```bash
cd /path/to/TRSS-Yunzai
git clone https://github.com/Maj-05/yunzai-limbus-plugin plugins/limbus-plugin
cd plugins/limbus-plugin && pnpm i
```

## 数据来源与许可

- 数值: [LimbusStaticData](https://git.neonteam.dev/yuvlian/LimbusStaticData)（社区静态数据）
- 中文文本: [LocalizeLimbusCompany](https://github.com/LocalizeLimbusCompany/LocalizeLimbusCompany)（CC BY-NC-SA 4.0）

**本项目中文文本遵循 CC BY-NC-SA 4.0：署名-非商业性使用-相同方式共享。**
严禁将本插件用于任何商业用途。

## 数据

**插件已内置 2026-11 构建的图鉴数据**（187 人格 / 96 E.G.O / 498 敌人 / 634 饰品），开箱即用、全离线查询。

## 更新与代理

- `#limbus更新`：更新插件代码 + 拉上游数据 + 重建数据 + 拉立绘。
- 服务器无法直连 github.com（国内常见）时，在 `config/system/update.json` 配置 `ghMirror` 走 GitHub 代理，例如：
  ```json
  { "ghMirror": "https://ghfast.top/" }
  ```
  详见该文件内的说明。

## 免责声明

本项目为粉丝作品，与 Project Moon 无关。
