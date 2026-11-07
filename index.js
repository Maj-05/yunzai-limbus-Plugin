import fs from 'node:fs'

const files = fs.readdirSync('./plugins/limbus-plugin/apps').filter(f => f.endsWith('.js'))

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