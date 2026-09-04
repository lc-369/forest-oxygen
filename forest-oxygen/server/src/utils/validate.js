// ===== 通用字段校验（与《需求分析》§2.1 一致） =====
import { badRequest } from './errors.js'

export const PHONE_RE = /^1\d{10}$/
export const PWD_RE = /^\d{8}$/       // 密码为 8 位数字
export const NAME_MAX = 30
export const GENDERS = ['男', '女', '保密']
export const ROLES = ['admin', 'worker', 'customer']
export const ROLES_REGISTRABLE = ['worker', 'customer']
export const SLOT_RANGE = [0, 1, 2, 3]
export const WORKER_STATUSES = ['active', 'resigned']
export const PROJECT_STATUSES = ['active', 'disabled']

/** 校验并归一化年龄：0~150 整数，非法返回 badRequest */
export function normAge(raw) {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > 150) {
    throw badRequest('BAD_AGE', '年龄需为 0~150 之间的整数')
  }
  return n
}

/** 校验 11 位手机号并返回原值（空/格式错抛错） */
export function normPhone(raw) {
  const s = String(raw == null ? '' : raw).trim()
  if (!PHONE_RE.test(s)) {
    throw badRequest('BAD_PHONE', '请输入 11 位有效手机号')
  }
  return s
}

/** 校验 8 位数字密码 */
export function normPassword(raw, label = '密码') {
  const s = String(raw == null ? '' : raw)
  if (!PWD_RE.test(s)) {
    throw badRequest('BAD_PASSWORD', `${label}应为 8 位数字`)
  }
  return s
}

/** 校验性别：允许 男/女/保密，缺省 保密 */
export function normGender(raw) {
  const g = raw === undefined || raw === null || raw === '' ? '保密' : String(raw)
  if (!GENDERS.includes(g)) throw badRequest('BAD_GENDER', '性别仅支持：男 / 女 / 保密')
  return g
}

/** 校验名称非空、长度 ≤ 30 */
export function normName(raw) {
  const s = String(raw == null ? '' : raw).trim()
  if (!s) throw badRequest('BAD_NAME', '姓名不能为空')
  if (s.length > NAME_MAX) throw badRequest('BAD_NAME', `姓名长度不能超过 ${NAME_MAX} 字`)
  return s
}

/** 校验时段 0..3 */
export function normSlot(raw) {
  const n = Number(raw)
  if (!SLOT_RANGE.includes(n)) throw badRequest('BAD_SLOT', '时段取值应为 0~3')
  return n
}

/** 校验角色字符串 */
export function normRoleIn(roles, raw) {
  const r = String(raw == null ? '' : raw).toLowerCase()
  if (!roles.includes(r)) throw badRequest('BAD_ROLE', `角色不合法（仅支持 ${roles.join('/')}）`)
  return r
}
