import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')

let pkg = { version: '1.0.0' }
try {
  pkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8'))
} catch (e) {}

export default {
  /** 日志里显示的名字（供 runtimeRender copyright 使用） */
  name: 'Yunzai-Bot',
  /** 插件自身版本号（读 package.json） */
  version: pkg.version,
  /** Yunzai 版本（TRSS/Miao 会在 runtime 里注入） */
  yunzai: process.env.YUNZAI_VERSION || ''
}