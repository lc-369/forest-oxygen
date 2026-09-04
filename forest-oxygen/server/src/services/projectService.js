// ===== 服务项目管理 =====
import { badRequest, notFound } from '../utils/errors.js'
import { PROJECT_STATUSES } from '../utils/validate.js'
import { addDays, isValidDateStr } from '../utils/datetime.js'

function findOrThrow(repo, id) {
  const p = repo.projects.find(x => x.id === id)
  if (!p) throw notFound('项目不存在')
  return p
}

function normCreate(payload) {
  const name = String(payload.name || '').trim()
  const location = String(payload.location || '').trim()
  if (!name) throw badRequest('BAD_NAME', '项目名称不能为空')
  if (!location) throw badRequest('BAD_LOCATION', '地点不能为空')

  const fee = Number(payload.fee)
  if (!Number.isFinite(fee) || fee < 0) throw badRequest('BAD_FEE', '费用需为不小于 0 的数字')

  const capacity = Number(payload.capacity)
  if (!Number.isInteger(capacity) || capacity < 1) throw badRequest('BAD_CAPACITY', '同一时段最大容量需为 ≥1 的整数')

  const status = payload.status || 'active'
  if (!PROJECT_STATUSES.includes(status)) throw badRequest('BAD_STATUS', '状态仅支持 active / disabled')

  return {
    name, location, fee,
    capacity,
    status,
    duration: String(payload.duration || '').trim(),
    flow: String(payload.flow || '').trim(),
    suitable: String(payload.suitable || '').trim(),
    taboo: String(payload.taboo || '').trim()
  }
}

export const projectService = {
  /** 列表：管理员/护工可见全部（护工同管理员为只读总览）；客户仅见进行中项目 */
  list(repo, { role, status } = {}) {
    let list = repo.projects
    if (role === 'customer') list = list.filter(p => p.status === 'active')
    if (status) list = list.filter(p => p.status === status)
    return list
      .slice()
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map(p => ({ ...p }))
  },

  get(repo, id) {
    return { ...findOrThrow(repo, id) }
  },

  create(repo, payload) {
    const base = normCreate(payload)
    const id = repo.genProjectId()
    const project = { id, ...base, createdAt: Date.now() }
    repo.projects.push(project)
    repo.save()
    return { id, project: { ...project } }
  },

  update(repo, id, patch) {
    const p = findOrThrow(repo, id)
    const n = normCreate({
      name: patch.name ?? p.name,
      location: patch.location ?? p.location,
      fee: patch.fee ?? p.fee,
      capacity: patch.capacity ?? p.capacity,
      status: patch.status ?? p.status,
      duration: patch.duration ?? p.duration,
      flow: patch.flow ?? p.flow,
      suitable: patch.suitable ?? p.suitable,
      taboo: patch.taboo ?? p.taboo
    })
    Object.assign(p, n)
    repo.save()
    return { ...p }
  },

  /**
   * 某项目在 [base, base+days) 各日的 4 时段预约占用
   * 返回：{ project, days: [ { serviceDate, slots: [ {slot,count,capacity,left,available} ] } ] }
   */
  occupancy(repo, id, base, days) {
    const p = findOrThrow(repo, id)
    const out = []
    for (let i = 0; i < days; i++) {
      const serviceDate = addDays(base, i)
      const slots = []
      for (let slot = 0; slot < 4; slot++) {
        const count = repo.bookings.filter(b =>
          b.status === 'booked' && b.projectId === id && b.serviceDate === serviceDate && b.slot === slot
        ).length
        const left = Math.max(0, p.capacity - count)
        slots.push({
          slot,
          count,
          capacity: p.capacity,
          left,
          // 停用项目不可约；已满不可约
          available: p.status === 'active' && left > 0
        })
      }
      out.push({ serviceDate, slots })
    }
    return { project: { ...p }, days: out }
  }
}

/** 校验日期字符串，非法抛 400 */
export function assertValidBase(date) {
  if (!isValidDateStr(date)) throw badRequest('BAD_DATE', '日期格式应为 YYYY-MM-DD')
}
