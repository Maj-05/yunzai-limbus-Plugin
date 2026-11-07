/**
 * 下载人格立绘到 resources/art/（本地缓存）。
 * 数据源：灰机wiki图床（文件名 = {人格id}_normal.png / {id}_gacksung.png）。
 * 规则：MediaWiki uploads/{md5[0]}/{md5[0..2]}/{fn}
 * 输出：resources/art/{id}_{kind}.png（原图缓存），并生成 art_index.json
 *
 * 说明：纯 Node 无 canvas 依赖，无法重编码成 JPEG，这里直接缓存原图 PNG，
 * 由 puppeteer 渲染时加载本地文件（避免每次在线热链原图 1~3MB 的延迟）。
 * 由 apps/update.js 的「拉取立绘」步骤调用。服务器需能访问 huijistatic.com。
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import https from 'node:https'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_ROOT = path.resolve(__dirname, '..')
const DATA = path.join(PLUGIN_ROOT, 'resources', 'data', 'personalities.json')
const EGO_DATA = path.join(PLUGIN_ROOT, 'resources', 'data', 'egos.json')
const OUT_DIR = path.join(PLUGIN_ROOT, 'resources', 'art')
const INDEX = path.join(OUT_DIR, 'art_index.json')

const HOST = 'huiji-public.huijistatic.com'
const BASE = '/limbuscompany/uploads'

function md5Path (fn) {
  const h = crypto.createHash('md5').update(fn, 'utf8').digest('hex')
  return `${h[0]}/${h.slice(0, 2)}/${fn}`
}

function download (url, timeout = 20000, retries = 2) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (limbus-plugin)' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume()
          if (res.headers.location) {
            const req2 = https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r2) => {
              if (r2.statusCode !== 200) { r2.resume(); return reject(new Error('HTTP ' + r2.statusCode)) }
              const chunks = []
              r2.on('data', c => chunks.push(c))
              r2.on('end', () => resolve(Buffer.concat(chunks)))
            })
            req2.on('error', reject)
            return
          }
          return reject(new Error('redirect-loop'))
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error('HTTP ' + res.statusCode))
        }
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      req.on('error', (e) => {
        if (n > 0) setTimeout(() => attempt(n - 1), 500)
        else reject(e)
      })
      req.setTimeout(timeout, () => req.destroy(new Error('timeout')))
    }
    attempt(retries)
  })
}

export async function build () {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const index = {}
  let downloaded = 0
  let failed = 0
  let existed = 0
  const t0 = Date.now()

  // 人格 + EGO 立绘都本地缓存（人格 normal/gacksung，EGO normal）
  const sources = [
    { file: DATA, kinds: ['normal', 'gacksung'], total: 0 },
    { file: EGO_DATA, kinds: ['awaken_profile'], total: 0 }
  ]
  let grandTotal = 0
  for (const src of sources) {
    if (!fs.existsSync(src.file)) continue
    const list = JSON.parse(fs.readFileSync(src.file, 'utf8'))
    src.total = list.length * src.kinds.length
    grandTotal += src.total
    for (const p of list) {
      const id = p.id
      for (const kind of src.kinds) {
        const fn = `${id}_${kind}.png`
        const target = path.join(OUT_DIR, `${id}_${kind}.png`)
        if (fs.existsSync(target) && fs.statSync(target).size > 5000) {
          index[`${id}_${kind}`] = `${id}_${kind}.png`
          existed++
          continue
        }
        const url = `https://${HOST}${BASE}/${md5Path(fn)}`
        try {
          const buf = await download(url)
          if (buf.length < 5000) throw new Error('too-small')
          fs.writeFileSync(target, buf)
          index[`${id}_${kind}`] = `${id}_${kind}.png`
          downloaded++
        } catch (e) {
          failed++
          if (src.file === EGO_DATA) console.log(`[art] EGO ${id} ${kind} 缺失: ${e.message}`)
          else if (kind === 'normal') console.log(`[art] ${id} normal 缺失: ${e.message}`)
        }
      }
      if (grandTotal > 40 && (downloaded + failed) % 25 === 0) {
        console.log(`[art] 进度 ${downloaded + failed}/${grandTotal}`)
      }
    }
  }

  fs.writeFileSync(INDEX, JSON.stringify(index))
  console.log(`[art] 完成: 下载 ${downloaded}, 已有 ${existed}, 失败 ${failed}, 耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  return { downloaded, failed }
}

if (process.argv[1] && process.argv[1].endsWith('fetch_art.mjs')) {
  build().catch(e => { console.error('[art] 失败:', e.message); process.exit(1) })
}

export { md5Path }