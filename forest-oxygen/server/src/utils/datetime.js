// ===== 日期工具：一律使用本地时区的日历日期字符串 YYYY-MM-DD =====
// 业务存储层采用【绝对服务日期】(serviceDate)，“今/明/后天”只是查询窗口视图。

export const pad2 = n => String(n).padStart(2, '0')

/** Date -> 'YYYY-MM-DD'（按本地时区） */
export function toDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 今天（可按 now 注入，便于测试） */
export function todayStr(now = new Date()) {
  return toDateStr(now)
}

/** 解析 'YYYY-MM-DD'，非法返回 null */
export function parseDateStr(s) {
  if (typeof s !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (!m) return null
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return { y, mo, d, date: dt }
}

export function isValidDateStr(s) {
  return parseDateStr(s) !== null
}

/** base(YYYY-MM-DD) 偏移 delta 天的日历日期 */
export function addDays(base, delta) {
  const p = parseDateStr(base)
  if (!p) throw new Error(`非法日期: ${base}`)
  const dt = new Date(p.y, p.mo - 1, p.d + delta)
  return toDateStr(dt)
}

/** from 到 to 相差的天数（整数；to 早于 from 时为负） */
export function diffDays(from, to) {
  const a = parseDateStr(from); const b = parseDateStr(to)
  if (!a || !b) throw new Error(`非法日期: ${from} / ${to}`)
  return Math.round((Date.UTC(b.y, b.mo - 1, b.d) - Date.UTC(a.y, a.mo - 1, a.d)) / 86400000)
}

/** [base, base+days) 区间的日期数组 */
export function dateRange(base, days) {
  const out = []
  for (let i = 0; i < days; i++) out.push(addDays(base, i))
  return out
}

/** date ∈ [base, base+days) 窗口内 */
export function withinWindow(date, base, days) {
  const off = diffDays(base, date)
  return off >= 0 && off < days
}

/** 当前时刻毫秒时间戳（created_at 等存储用） */
export function nowMs(now = new Date()) {
  return now.getTime()
}
