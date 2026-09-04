// ===== 用户管理路由（管理员维护客户/护工） =====
import { Router } from 'express'
import { userService } from '../services/userService.js'
import { bookingService } from '../services/bookingService.js'
import { okData, okMsg } from '../utils/errors.js'
import { ah, authRequired, requireRole, windowDays } from '../middleware/middleware.js'
import { todayStr } from '../utils/datetime.js'
import { normRoleIn, ROLES_REGISTRABLE } from '../utils/validate.js'

export default function usersRouter(cfg, repo) {
  const r = Router()
  r.use(authRequired(cfg), requireRole('admin'))

  // GET /api/users?role=worker|customer
  r.get('/', (req, res) => {
    const role = normRoleIn(ROLES_REGISTRABLE, req.query.role || 'customer')
    res.json(okData(userService.listByRole(repo, role)))
  })

  // POST /api/users —— 管理员新建客户/护工账号
  r.post('/', ah(async (req, res) => {
    const { id, user } = await userService.createByAdmin(repo, cfg, req.body || {})
    await repo.flush()
    res.json(okMsg('账号创建成功', { id, user }))
  }))

  // GET /api/users/:id/schedule —— 查看护工未来排班（仅姓名编号，不含健康档案）
  r.get('/:id/schedule', (req, res) => {
    const days = windowDays(cfg, req.query.days)
    const base = todayStr()
    const target = userService.getUser(repo, req.params.id, 'worker')
    const cells = bookingService.adminWorkerSchedule(repo, cfg, target.id, days)
    res.json(okData({ worker: target, days, base, cells }))
  })

  // GET /api/users/:id/bookings?mode=window|history —— 客户详情预约/历史
  r.get('/:id/bookings', (req, res) => {
    const mode = req.query.mode === 'history' ? 'history' : 'window'
    const customer = userService.getUser(repo, req.params.id, 'customer')
    const list = bookingService.queryCustomer(repo, cfg, customer.id, mode)
    res.json(okData({ customer, mode, items: list }))
  })

  // GET /api/users/:id —— 用户详情
  r.get('/:id', (req, res) => {
    res.json(okData(userService.getUser(repo, req.params.id)))
  })

  // PUT /api/users/:id —— 管理员编辑（角色白名单字段 / 状态 / 技能 / 薪资 / 重置密码）
  r.put('/:id', ah(async (req, res) => {
    const user = await userService.updateByAdmin(repo, cfg, req.params.id, req.body || {})
    await repo.flush()
    res.json(okMsg('保存成功', user))
  }))

  return r
}
