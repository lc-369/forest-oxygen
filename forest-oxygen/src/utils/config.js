// ===== 全局常量配置（时段、角色、基础阈值） =====

// 固定四个时段（0~3）
export const SLOT_TIMES = [
  { slot: 0, label: '上午① 08:30-10:00' },
  { slot: 1, label: '上午② 10:30-12:00' },
  { slot: 2, label: '下午① 14:00-15:30' },
  { slot: 3, label: '下午② 16:00-17:30' }
]

export const SLOT_TITLE = { 0: '上午①', 1: '上午②', 2: '下午①', 3: '下午②' }
export const SLOT_TIME = { 0: '08:30-10:00', 1: '10:30-12:00', 2: '14:00-15:30', 3: '16:00-17:30' }

// 预约日期跨度：今/明/后天
export const DAYS = [
  { day: 0, label: '今天' },
  { day: 1, label: '明天' },
  { day: 2, label: '后天' }
]

// 角色与编号首位
export const ROLE_META = {
  admin: { prefix: '0', label: '系统管理员', tag: 'danger' },
  worker: { prefix: '1', label: '护工', tag: 'success' },
  customer: { prefix: '2', label: '客户', tag: 'primary' }
}

// 环境数据模拟阈值（在合理范围内动态更新）
export const ENV_LIMITS = {
  temperature: { min: 18, max: 28, unit: '℃', label: '园区温度' },
  humidity: { min: 45, max: 85, unit: '%RH', label: '空气湿度' },
  pm25: { min: 5, max: 35, unit: 'μg/m³', label: 'PM2.5' },
  anion: { min: 2000, max: 6500, unit: '个/cm³', label: '负氧离子' }
}

// 空气质量等级（由 PM2.5 推导）
export function airLevel(pm25) {
  if (pm25 <= 15) return { text: '优', level: 'success' }
  if (pm25 <= 35) return { text: '良', level: 'primary' }
  if (pm25 <= 75) return { text: '轻度污染', level: 'warning' }
  return { text: '中度污染', level: 'danger' }
}

// 六位编号生成（按角色前缀 + 角色内序号）
export function rolePrefix(role) {
  return ROLE_META[role]?.prefix || '9'
}

export function formatId(role, seq) {
  return `${rolePrefix(role)}${String(seq).padStart(5, '0')}`
}

export function idSeq(id) {
  return Number(String(id).slice(1)) || 0
}
