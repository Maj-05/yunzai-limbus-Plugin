/**
 * 数据校验脚本：检查 resources/data 下手工维护的静态数据是否结构完整、无重复、
 * 必填字段齐全，防止手工编辑（statuses/flows/events/supplement）时出错。
 * 运行：node scripts/check_data.mjs
 * 有错误时退出码 1，供 CI / 提交前检查使用。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', 'resources', 'data')

const errors = []
const warns = []

function read(name) {
  const p = path.join(DATA_DIR, name + '.json')
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    errors.push(`${name}.json 无法解析: ${e.message}`)
    return null
  }
}

function checkArray(name, required, uniqueBy) {
  const list = read(name)
  if (!Array.isArray(list)) {
    if (list !== null) errors.push(`${name}.json 顶层必须是数组`)
    return list
  }
  if (!list.length) errors.push(`${name}.json 为空`)
  const seen = new Map()
  for (const [i, it] of list.entries()) {
    for (const f of required) {
      if (it[f] === undefined || it[f] === null || it[f] === '') {
        errors.push(`${name}[${i}] 缺少必填字段 "${f}"`)
      }
    }
    if (uniqueBy && it[uniqueBy] != null) {
      const k = String(it[uniqueBy])
      if (seen.has(k)) errors.push(`${name}[${i}] 字段 "${uniqueBy}" 重复: ${k} (首次在 ${seen.get(k)})`)
      else seen.set(k, i)
    }
  }
  return list
}

const log = (s) => process.stdout.write(s + '\n')

const statuses = checkArray('statuses', ['key', 'name', 'desc'], 'name')
const flows = checkArray('flows', ['key', 'name', 'keywords'], 'name')
const events = checkArray('events', ['name', 'desc', 'options'], 'name')
const supplement = checkArray('supplement', ['id', 'name'], null)

if (Array.isArray(flows)) {
  for (const [i, f] of flows.entries()) {
    if (!Array.isArray(f.keywords) || !f.keywords.length) errors.push(`flows[${i}] keywords 必须是非空数组`)
  }
}

if (Array.isArray(events)) {
  for (const e of events) {
    if (!Array.isArray(e.options) || !e.options.length) errors.push(`events[${e.name}] options 必须是非空数组`)
    for (const [j, o] of (e.options || []).entries()) {
      if (!o || !o.text || !o.result) errors.push(`events[${e.name}].options[${j}] 缺少 text/result`)
    }
  }
}

if (errors.length) {
  log(`[check_data] 发现 ${errors.length} 个错误:`)
  errors.forEach((e) => log('  ✗ ' + e))
  process.exit(1)
} else {
  log(`[check_data] OK: statuses=${statuses?.length ?? 0} flows=${flows?.length ?? 0} events=${events?.length ?? 0} supplement=${supplement?.length ?? 0}`)
  if (warns.length) warns.forEach((w) => log('  ⚠ ' + w))
}
