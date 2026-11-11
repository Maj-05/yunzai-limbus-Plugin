import db from './db.mjs'

/**
 * 数据版本 / 数据龄检查。
 * meta.json 的 sourceVersion 形如 "YYYY-MM-DD"（构建当天上游数据日期）。
 * 服务器本地时钟与它比较得出「数据龄」（天），超过阈值提示建议 #limbus更新 重建。
 * 无外网依赖：不拉取上游版本，只基于本地 meta 与系统日期。
 */

const STALE_DAYS = 30 // 数据龄超过 30 天视为可能过旧

/** 解析 "YYYY-MM-DD" 或 ISO 时间戳 → Date，失败返回 null */
function parseDate (s) {
  if (!s) return null
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** 返回 { sourceVersion, days, stale, label }；stale=true 表示数据龄超阈值 */
export function checkDataAge () {
  db.load()
  const v = db.meta?.sourceVersion || null
  const base = parseDate(v)
  let days = null
  if (base) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    days = Math.max(0, Math.round((now - base) / 86400000))
  }
  const stale = days != null && days > STALE_DAYS
  const label = days == null ? '未知' : (days === 0 ? '今天' : `${days} 天前`)
  return { sourceVersion: v, days, stale, label, threshold: STALE_DAYS }
}