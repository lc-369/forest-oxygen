// ===== 本人账号路由 =====
import { Router } from 'express'
import { userService } from '../services/userService.js'
import { okData, okMsg } from '../utils/errors.js'
import { ah, authRequired } from '../middleware/middleware.js'

export default function meRouter(cfg, repo) {
  const r = Router()
  r.use(authRequired(cfg))

  // GET /api/me —— 当前登录人资料
  r.get('/', (req, res) => {
    res.json(okData(userService.me(repo, req.user)))
  })

  // PUT /api/me —— 更新本人可编辑字段 / 修改密码
  r.put('/', ah(async (req, res) => {
    const user = await userService.updateProfile(repo, cfg, req.user, req.body || {})
    await repo.flush()
    res.json(okMsg('保存成功', user))
  }))

  return r
}
