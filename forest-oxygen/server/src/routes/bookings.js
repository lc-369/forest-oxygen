// ===== 预约 / 排班 / 看板 路由 =====
import { Router } from 'express'
import { bookingService } from '../services/bookingService.js'
import { dashboardService } from '../services/dashboardService.js'
import { okData, okMsg, badRequest } from '../utils/errors.js'
import { ah, authRequired, requireRole, windowDays } from '../middleware/middleware.js'
import { todayStr } from '../utils/datetime.js'

export default function serviceRouter(cfg, repo) {
  const r = Router()
  r.use(authRequired(cfg))

  // ---------- 客户预约 ----------
  // GET /api/bookings/my —— 客户未来窗口排布（含空档）
  r.get('/bookings/my', requireRole('customer'), (req, res) => {
    res.json(okData({ days: cfg.windowDays, base: todayStr(), rows: bookingService.customerWindow(repo, cfg, req.user.id) }))
  })

  // GET /api/bookings/my/history —— 客户历史（已完成/已取消，倒序）
  r.get('/bookings/my/history', requireRole('customer'), (req, res) => {
    res.json(okData({ items: bookingService.customerHistory(repo, req.user.id) }))
  })

  // POST /api/bookings —— 客户预约 {projectId, serviceDate, slot}
  r.post('/bookings', requireRole('customer'), ah(async (req, res) => {
    const body = req.body || {}
    if (!body.projectId || body.serviceDate == null || body.slot == null) {
      throw badRequest('BAD_BODY', '缺少预约参数（projectId / serviceDate / slot）')
    }
    const booking = bookingService.book(repo, cfg, {
      customerId: req.user.id,
      projectId: body.projectId,
      serviceDate: body.serviceDate,
      slot: body.slot
    })
    await repo.flush()
    res.json(okMsg('预约成功', booking))
  }))

  // POST /api/bookings/:id/cancel —— 取消
  r.post('/bookings/:id/cancel', requireRole('customer'), ah(async (req, res) => {
    const booking = bookingService.cancel(repo, { id: req.params.id, customerId: req.user.id })
    await repo.flush()
    res.json(okMsg('已取消预约', booking))
  }))

  // ---------- 护工排班 ----------
  // GET /api/schedule/me?days=n —— 护工本人未来排班（含客户健康档案）
  r.get('/schedule/me', requireRole('worker'), (req, res) => {
    const days = windowDays(cfg, req.query.days)
    const cells = bookingService.workerSchedule(repo, cfg, req.user.id, true, days)
    res.json(okData({ days, base: todayStr(), cells }))
  })

  // GET /api/schedule/me/history —— 护工已完成服务（回顾）
  r.get('/schedule/me/history', requireRole('worker'), (req, res) => {
    res.json(okData({ items: bookingService.workerHistory(repo, req.user.id) }))
  })

  // ---------- 数据看板 ----------
  // GET /api/dashboard —— 角色相关统计
  r.get('/dashboard', requireRole('admin', 'customer'), (req, res) => {
    res.json(okData(dashboardService.overview(repo, cfg, req.user)))
  })

  return r
}
