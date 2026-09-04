// ===== 后端接口封装（与 server/src/routes 一一对应） =====
// 所有方法均返回服务端响应体的 data 部分；失败时抛出 ApiError（见 http.js）。
import { request } from './http'

export const api = {
  // ---------- 认证 ----------
  login: (phone, password) => request({ method: 'post', url: '/auth/login', data: { phone, password } }),
  /** 注册 {role, phone, password, name, gender, age, ...} → {id, user} */
  register: payload => request({ method: 'post', url: '/auth/register', data: payload }),

  // ---------- 本人 ----------
  me: () => request({ method: 'get', url: '/me' }),
  updateMe: payload => request({ method: 'put', url: '/me', data: payload }),

  // ---------- 管理端：用户（仅 admin） ----------
  listUsers: role => request({ method: 'get', url: '/users', params: { role } }),          // {total, items}
  createUser: payload => request({ method: 'post', url: '/users', data: payload }),         // {id, user}
  getUser: id => request({ method: 'get', url: `/users/${id}` }),                            // user
  updateUser: (id, payload) => request({ method: 'put', url: `/users/${id}`, data: payload }), // user
  /** 护工排班（不含健康档案）→ {worker, days, base, cells} */
  workerSchedule: (id, days) => request({ method: 'get', url: `/users/${id}/schedule`, params: { days } }),
  /** 客户预约 window | history → {customer, mode, items} */
  customerBookings: (id, mode = 'window') => request({ method: 'get', url: `/users/${id}/bookings`, params: { mode } }),

  // ---------- 项目 ----------
  /** {total, items}，服务端按角色决定可见范围 */
  projects: (status) => request({ method: 'get', url: '/projects', params: status ? { status } : {} }),
  project: id => request({ method: 'get', url: `/projects/${id}` }),
  createProject: payload => request({ method: 'post', url: '/projects', data: payload }),   // {id, project}
  updateProject: (id, payload) => request({ method: 'put', url: `/projects/${id}`, data: payload }),
  /** 某项目时段占用 → {project, days:[{serviceDate, slots:[{slot,count,capacity,left,available}]}]} */
  occupancy: (id, { date, days }) => request({
    method: 'get', url: `/projects/${id}/occupancy`,
    params: { date: date || undefined, days: days || undefined }
  }),

  // ---------- 客户：预约（仅 customer） ----------
  myBookings: () => request({ method: 'get', url: '/bookings/my' }),          // {days, base, rows}
  myHistory: () => request({ method: 'get', url: '/bookings/my/history' }),   // {items}
  book: payload => request({ method: 'post', url: '/bookings', data: payload }), // {projectId,serviceDate,slot}
  cancelBooking: id => request({ method: 'post', url: `/bookings/${id}/cancel` }),

  // ---------- 护工：排班（仅 worker） ----------
  mySchedule: days => request({ method: 'get', url: '/schedule/me', params: { days } }),   // {days, base, cells}
  myWorkHistory: () => request({ method: 'get', url: '/schedule/me/history' }),            // {items}

  // ---------- 看板 ----------
  dashboard: () => request({ method: 'get', url: '/dashboard' })
}
