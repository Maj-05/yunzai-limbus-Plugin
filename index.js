import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 从插件自身目录加载 apps，不依赖插件目录名
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appsDir = path.join(__dirname, 'apps')
const files = fs.readdirSync(appsDir).filter(f => f.endsWith('.js'))

logger.info('-------------------------')
logger.info('limbus-plugin 载入成功!')
logger.info('-------------------------')

let ret = files.map(f => import(`./apps/${f}`))
ret = await Promise.allSettled(ret)

const apps = {}
for (const i in files) {
  const name = files[i].replace('.js', '')
  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  // 取插件类（filter 出 class 导出，避免多导出时误取普通对象）
  const exps = ret[i].value
  let cls = null
  for (const k of Object.keys(exps)) {
    const v = exps[k]
    if (typeof v === 'function' && /^class\s/.test(Function.prototype.toString.call(v))) { cls = v; break }
  }
  apps[name] = cls || Object.values(exps)[0]
}

export { apps }