// ===== 服务项目路由 =====
import { Router } from 'express'
import { projectService, assertValidBase } from '../services/projectService.js'
import { okData, okMsg, badRequest } from '../utils/errors.js'
import { ah, authRequired, requireRole, windowDays } from '../middleware/middleware.js'
import { todayStr } from '../utils/datetime.js'

export default function projectsRouter(cfg, repo) {
  const r = Router()
  r.use(authRequired(cfg))

  // GET /api/projects —— 项目列表（管理员含停用；客户/护工仅进行中）
  r.get('/', (req, res) => {
    const status = req.query.status || undefined
    const list = projectService.list(repo, { role: req.user.role, status })
    res.json(okData({ total: list.length, items: list }))
  })

  // GET /api/projects/:id/occupancy?date=YYYY-MM-DD&days=n —— 时段占用/余量
  r.get('/:id/occupancy', (req, res) => {
    const base = (req.query.date || todayStr()).trim()
    assertValidBase(base)
    const days = windowDays(cfg, req.query.days)
    res.json(okData(projectService.occupancy(repo, req.params.id, base, days)))
  })

  // GET /api/projects/:id —— 项目详情
  r.get('/:id', (req, res) => {
    res.json(okData(projectService.get(repo, req.params.id)))
  })

  // 以下仅管理员
  r.post('/', requireRole('admin'), ah(async (req, res) => {
    const { id, project } = projectService.create(repo, req.body || {})
    await repo.flush()
    res.json(okMsg('项目创建成功', { id, project }))
  }))

  r.put('/:id', requireRole('admin'), ah(async (req, res) => {
    if (!req.body || typeof req.body !== 'object') throw badRequest('BAD_BODY', '请求体缺失')
    const project = projectService.update(repo, req.params.id, req.body)
    await repo.flush()
    res.json(okMsg('保存成功', project))
  }))

  return r
}
