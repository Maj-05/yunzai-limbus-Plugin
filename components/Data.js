import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const _path = process.cwd()
const pluginRoot = path.resolve(__dirname, '..')

let pkg = { version: '1.0.0' }
try {
  pkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8'))
} catch (e) {}

export const Version = {
  name: 'Yunzai-Bot',
  version: pkg.version,
  yunzai: process.env.YUNZAI_VERSION || ''
}

/** 简化版 Data 工具 */
export const Data = {
  createDir (p, root = '') {
    const full = path.join(root || pluginRoot, p)
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true })
  },
  readJSON (file, root = '') {
    try {
      const full = path.join(root || pluginRoot, file)
      if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, 'utf8'))
    } catch (e) { console.error(e) }
    return {}
  },
  def () {
    for (const v of arguments) {
      if (v !== undefined) return v
    }
  }
}