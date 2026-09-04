// ===== 日期工具 =====
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const pad2 = n => String(n).padStart(2, '0')

export function addDays(base, n) {
  const d = base ? new Date(base) : new Date()
  d.setDate(d.getDate() + n)
  return d
}

// 今天/明天/后天的日期文案，如 “9月4日 周五”
export function dayText(offset) {
  const d = addDays(new Date(), offset)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}`
}

// ---------- 服务端 serviceDate(YYYY-MM-DD) 与前端“今/明/后天”日历的映射 ----------

/** Date → YYYY-MM-DD（本地时区，与服务端约定一致） */
export function ymd(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 今天 YYYY-MM-DD */
export function todayYmd() {
  return ymd(new Date())
}

/** 距今天 offset 天的 YYYY-MM-DD（0=今天，供预约提交用） */
export function serviceDateOf(offset) {
  return ymd(addDays(new Date(), offset))
}

/** 把 serviceDate 映射为“今天/明天/后天”下标（0..days-1），窗口外/非法返回 -1 */
export function dayIndexOf(dateStr, days = 3) {
  if (!dateStr) return -1
  const t = new Date(`${todayYmd()}T00:00:00`)
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return -1
  const off = Math.round((d - t) / 86400000)
  return off >= 0 && off < days ? off : -1
}

/** 农历等扩展位预留：将某格 serviceDate+slot 转展示文案 */
export function dateTimeLabel(dateStr, slot) {
  const off = dayIndexOf(dateStr)
  const dayName = off === 0 ? '今天' : off === 1 ? '明天' : off === 2 ? '后天' : (dateStr || '')
  return { off, dayName }
}
