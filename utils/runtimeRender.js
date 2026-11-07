import path from 'path'
import { Version } from '../components/index.js'

const PLUGIN_Name = 'limbus-plugin'

/**
 * 渲染并回复图片（依赖 Yunzai 内置 puppeteer：e.runtime.render）
 */
export default function runtimeRender (e, tplPath, renderData = {}, cfg = {}) {
  if (!e.runtime || !e.runtime.render) {
    logger.error('[limbus-plugin] 未找到 e.runtime.render，请升级至 TRSS/Miao-Yunzai 最新版')
    return e.reply('渲染失败：Bot 框架版本过低，请联系管理员升级')
  }
  const scale = (cfg.scale || 1) * 1
  const pct = `style='transform:scale(${scale})'`
  const layoutPath = path.join(process.cwd(), 'plugins', PLUGIN_Name, 'resources', 'common', 'layout')

  return e.runtime.render(PLUGIN_Name, tplPath, renderData, {
    ...cfg,
    beforeRender ({ data }) {
      return {
        ...data,
        _res_path: data.pluResPath || data._res_path,
        _layout_path: layoutPath + path.sep,
        defaultLayout: path.join(layoutPath, 'default.html'),
        sys: {
          scale: pct,
          copyright: `Created By ${Version.name} & limbus-plugin v${Version.version}`
        },
        quality: 100
      }
    }
  })
}