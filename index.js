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
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }