/**
 * 搜索结果暂存：多命中时记录待选择的候选列表，用户回复序号即可选中。
 * 按用户 ID 存一份，新查询覆盖旧的，30 分钟后过期。
 */
const pending = new Map()
const TTL = 30 * 60 * 1000

/** 记录某用户的多选待定状态 */
export function rememberSelect(userId, { ids, kindName, render, tpl }) {
  pending.set(String(userId), { ids, kindName, render, tpl, time: Date.now() })
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
