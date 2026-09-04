// ===== Express 应用组装 =====
import express from 'express'
import cors from 'cors'

import authRouter from './routes/auth.js'
import meRouter from './routes/me.js'
import usersRouter from './routes/users.js'
import projectsRouter from './routes/projects.js'
import serviceRouter from './routes/bookings.js'

import { notFoundHandler, errorHandler } from './middleware/middleware.js'

/** 构建应用（cfg / repo 可注入，便于自检脚本复用同一实例） */
export function createApp(cfg, repo) {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors())
  app.use(express.json({ limit: '256kb' }))

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, data: { name: '森林氧吧后端', version: '1.1.0', now: Date.now() } })
  })

  app.use('/api/auth', authRouter(cfg, repo))
  app.use('/api/me', meRouter(cfg, repo))
  app.use('/api/users', usersRouter(cfg, repo))
  app.use('/api/projects', projectsRouter(cfg, repo))
  app.use('/api', serviceRouter(cfg, repo))

  // 兜底
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
