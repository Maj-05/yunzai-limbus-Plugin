/**
 * 搜索结果暂存：多命中时记录待选择的候选列表，用户回复序号即可选中。
 * 按用户 ID 存一份，新查询覆盖旧的，30 分钟后过期。
 */
const pending = new Map()
const TTL = 30 * 60 * 1000

/** 记录某用户的多选待定状态（可带 page 页码用于分页浏览） */
export function rememberSelect(userId, { ids, kindName, render, tpl, page = 0, pageSize = 8 }) {
  pending.set(String(userId), { ids, kindName, render, tpl, page, pageSize, time: Date.now() })
}

/** 读取并返回某用户的待定选择（已过期则清除返回 null） */
export function takeSelect(userId) {
  const key = String(userId)
  const item = pending.get(key)
  if (!item) return null
  if (Date.now() - item.time > TTL) { pending.delete(key); return null }
  return item
}

/** 直接取而不删除（用于判断是否有待定），清理过期项 */
export function peekSelect(userId) {
  const key = String(userId)
  const item = pending.get(key)
  if (!item) return null
  if (Date.now() - item.time > TTL) { pending.delete(key); return null }
  return item
}

export function clearSelect(userId) { pending.delete(String(userId)) }

/**
 * 更新某用户待定选择的页码（用于翻页浏览）。
 * fn: (currentPage) => nextPage 返回新页码；越界则 clamp 到有效范围。
 * 返回 null 表示无待定选择。
 */
export function updatePage(userId, fn) {
  const key = String(userId)
  const item = pending.get(key)
  if (!item) return null
  if (Date.now() - item.time > TTL) { pending.delete(key); return null }
  const maxPage = Math.max(0, Math.ceil(item.ids.length / (item.pageSize || 8)) - 1)
  const next = Math.min(Math.max(0, fn(item.page)), maxPage)
  item.page = next
  item.time = Date.now()
  return next
}
