/** 命令前缀：支持 # / / 以及可选的「边狱」前缀 */
export const rulePrefix = '(?:#|\\/)(?:边狱|巴士|limbus|Limbus|084)?'

/**
 * 从消息中剥离前缀，提取关键字
 */
export function stripPrefix (msg, ...keywords) {
  let q = String(msg || '').replace(/#|\//g, '').trim()
  for (const k of keywords) {
    q = q.replace(new RegExp(`^${k}`, 'i'), '').trim()
  }
  return q
}