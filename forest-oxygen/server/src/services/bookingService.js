// ===== 预约服务（预约引擎核心，保持纯同步以保证校验与写入原子） =====
// 覆盖 §4/§4.1：绝对 serviceDate 落库；今/明/后天窗口校验；客户同日期同时段
// 不重复预约；项目容量上限；护工随机分配（在职 + 技能匹配 + 该时段空闲）；
// 取消；过账 Rollover（已到期 booked → done）；窗口/历史查询。
import { HttpError, badRequest, notFound } from '../utils/errors.js'
import { normSlot } from '../utils/validate.js'
import { todayStr, addDays, withinWindow, isValidDateStr } from '../utils/datetime.js'

const SLOTS = [0, 1, 2, 3]

function findUser(repo, id) {
  return repo.users.find(u => u.id === id) || null
}
function findProject(repo, id) {
  return repo.projects.find(p => p.id === id) || null
}

/** 预约记录补全项目/护工/客户名称等展示字段 */
function enrich(repo, b, withHealth) {
  const p = findProject(repo, b.projectId)
  const w = findUser(repo, b.workerId)
  const c = findUser(repo, b.customerId)
  const out = {
    ...b,
    projectName: p ? p.name : '—',
    location: p ? p.location : '',
    fee: p ? p.fee : 0,
    workerName: w ? w.name : '—',
    customerName: c ? c.name : '—'
  }
  if (withHealth && c) {
    out.allergy = c.allergy || ''
    out.disease = c.disease || ''
    out.preference = c.preference || ''
  }
  return out
}

/** 每次预约读写前先过账，保证“过期即完成”一致 */
function rollover(repo) {
  repo.rollover(new Date())
}

function assertDateInWindow(repo, cfg, date, now = new Date()) {
  if (!isValidDateStr(date)) throw badRequest('BAD_DATE', '日期格式应为 YYYY-MM-DD')
  const today = todayStr(now)
  if (!withinWindow(date, today, cfg.windowDays)) {
    throw badRequest('OUT_OF_WINDOW', '只能预约今、明、后天（请选择可预约日期）')
  }
  return date
}

function assertProjectBookable(repo, projectId) {
  const p = findProject(repo, projectId)
  if (!p) throw notFound('项目不存在')
  if (p.status !== 'active') throw badRequest('PROJECT_DISABLED', '该项目已停用，暂不可预约')
  return p
}

/** 该日期时段内可被派单的空闲在职护工（技能匹配 + 未被占用） */
function eligibleWorkers(repo, projectId, serviceDate, slot) {
  const busy = new Set(
    repo.bookings
      .filter(b => b.status === 'booked' && b.serviceDate === serviceDate && b.slot === slot)
      .map(b => b.workerId)
  )
  return repo.users.filter(u =>
    u.role === 'worker' &&
    u.status === 'active' &&
    Array.isArray(u.skills) && u.skills.includes(projectId) &&
    !busy.has(u.id)
  )
}

export const bookingService = {
  // ================= 写操作 =================

  /** 客户预约：校验 → 随机分配护工 → 落库（纯同步，原子完成） */
  book(repo, cfg, { customerId, projectId, serviceDate, slot }, now = new Date()) {
    rollover(repo)
    assertDateInWindow(repo, cfg, serviceDate, now)
    const p = assertProjectBookable(repo, projectId)
    const s = normSlot(slot)

    // 客户同一 日期+时段 不可重复预约（含跨项目）
    const dup = repo.bookings.find(b =>
      b.status === 'booked' && b.customerId === customerId &&
      b.serviceDate === serviceDate && b.slot === s)
    if (dup) {
      const other = findProject(repo, dup.projectId)
      throw new HttpError(409, 'SLOT_TAKEN', `您在该时段已有预约（${other ? other.name : '其他项目'}），请更换时段`)
    }

    // 项目容量
    const used = repo.bookings.filter(b =>
      b.status === 'booked' && b.projectId === projectId &&
      b.serviceDate === serviceDate && b.slot === s).length
    if (used >= p.capacity) {
      throw new HttpError(409, 'CAPACITY_FULL', '该时段预约人数已满，请选择其他时段')
    }

    // 护工匹配并随机分配
    const pool = eligibleWorkers(repo, projectId, serviceDate, s)
    if (!pool.length) {
      throw new HttpError(409, 'NO_WORKER', '该时段暂无匹配的空闲护工，请更换时段')
    }
    const worker = pool[Math.floor(Math.random() * pool.length)]

    const booking = {
      id: repo.genBookingId(),
      customerId, workerId: worker.id, projectId,
      serviceDate, slot: s,
      status: 'booked',
      createdAt: now.getTime()
    }
    repo.bookings.push(booking)
    repo.save()
    return enrich(repo, booking, false)
  },

  /** 取消预约（仅本人、仅 booked 态可取消） */
  cancel(repo, { id, customerId }, now = new Date()) {
    rollover(repo)
    const b = repo.bookings.find(x => x.id === id)
    if (!b || b.customerId !== customerId) throw notFound('预约不存在')
    if (b.status === 'done') throw badRequest('ALREADY_DONE', '该服务已完成，无法取消')
    if (b.status === 'cancelled') throw badRequest('ALREADY_CANCELLED', '该预约已取消，无需重复操作')
    b.status = 'cancelled'
    b.cancelledAt = now.getTime()
    repo.save()
    return enrich(repo, b, false)
  },

  // ================= 客户查询 =================

  /** 客户未来窗口（今/明/后天）已约安排 */
  customerWindow(repo, cfg, customerId, now = new Date()) {
    rollover(repo)
    const base = todayStr(now)
    const out = []
    for (let off = 0; off < cfg.windowDays; off++) {
      const d = addDays(base, off)
      for (const slot of SLOTS) {
        const b = repo.bookings.find(x =>
          x.status === 'booked' && x.customerId === customerId &&
          x.serviceDate === d && x.slot === slot)
        out.push({ serviceDate: d, slot, booking: b ? enrich(repo, b, false) : null })
      }
    }
    return out
  },

  /** 客户历史记录：已完成/已取消，按日期倒序 */
  customerHistory(repo, customerId) {
    rollover(repo)
    return repo.bookings
      .filter(b => b.customerId === customerId && (b.status === 'done' || b.status === 'cancelled'))
      .sort((a, b) => (a.serviceDate === b.serviceDate ? a.slot - b.slot : a.serviceDate < b.serviceDate ? 1 : -1))
      .map(b => enrich(repo, b, false))
  },

  // ================= 护工查询 =================

  /** 护工未来窗口排班（每格含预约详情；本人视角带客户健康档案） */
  workerSchedule(repo, cfg, workerId, withHealth, days = cfg.windowDays, now = new Date()) {
    rollover(repo)
    const base = todayStr(now)
    const out = []
    for (let off = 0; off < days; off++) {
      const d = addDays(base, off)
      for (const slot of SLOTS) {
        const b = repo.bookings.find(x =>
          x.status === 'booked' && x.workerId === workerId &&
          x.serviceDate === d && x.slot === slot)
        out.push({ serviceDate: d, slot, booking: b ? enrich(repo, b, withHealth) : null })
      }
    }
    return out
  },

  /** 护工已完成服务（回顾用，不可修改） */
  workerHistory(repo, workerId) {
    rollover(repo)
    return repo.bookings
      .filter(b => b.workerId === workerId && b.status === 'done')
      .sort((a, b) => (a.serviceDate === b.serviceDate ? a.slot - b.slot : a.serviceDate < b.serviceDate ? 1 : -1))
      .map(b => {
        const e = enrich(repo, b, false)
        return { id: e.id, serviceDate: e.serviceDate, slot: e.slot, projectName: e.projectName, location: e.location, customerName: e.customerName, customerId: e.customerId }
      })
  },

  /** 管理员查看某护工排班（每格仅客户姓名+编号，不含健康档案） */
  adminWorkerSchedule(repo, cfg, workerId, days = cfg.windowDays, now = new Date()) {
    const cells = bookingService.workerSchedule(repo, cfg, workerId, false, days, now)
    return cells.map(c => ({
      serviceDate: c.serviceDate,
      slot: c.slot,
      booking: c.booking
        ? {
            id: c.booking.id,
            customerId: c.booking.customerId,
            customerName: c.booking.customerName,
            projectId: c.booking.projectId,
            projectName: c.booking.projectName
          }
        : null
    }))
  },

  // ================= 管理端通用 =================

  /** 管理员查任意客户的窗口/历史预约 */
  queryCustomer(repo, cfg, customerId, mode, now = new Date()) {
    rollover(repo)
    if (!findUser(repo, customerId)) throw notFound('客户不存在')
    if (mode === 'history') {
      return bookingService.customerHistory(repo, customerId)
    }
    return bookingService.customerWindow(repo, cfg, customerId, now)
      .map(c => c.booking)
      .filter(Boolean)
  },

  /** 某项目在窗口内每日各时段占用数（返回数组，供列表/看板使用） */
  projectDayUsage(repo, projectId, serviceDate, slot) {
    return repo.bookings.filter(b =>
      b.status === 'booked' && b.projectId === projectId &&
      b.serviceDate === serviceDate && b.slot === slot).length
  }
}
