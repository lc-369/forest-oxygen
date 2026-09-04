// ===== 认证路由：登录 / 注册 =====
import { Router } from 'express'
import { userService } from '../services/userService.js'
import { okData, okMsg } from '../utils/errors.js'
import { ah } from '../middleware/middleware.js'

export default function authRouter(cfg, repo) {
  const r = Router()

  // POST /api/auth/login {phone, password}
  r.post('/login', ah(async (req, res) => {
    const { phone, password } = req.body || {}
    const { token, user } = await userService.login(repo, cfg, { phone, password })
    await repo.flush() // 成功时清除失败记录要落库
    res.json(okData({ token, user }))
  }))

  // POST /api/auth/register {role, phone, password, name, ...}
  r.post('/register', ah(async (req, res) => {
    const { id, user } = await userService.register(repo, cfg, req.body || {})
    await repo.flush()
    res.json(okMsg('注册成功，请登录', { id, user }))
  }))

  return r
}
