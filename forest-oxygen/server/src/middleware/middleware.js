// ===== Express 中间件：认证 / 角色守卫 / 统一错误处理 =====
import { verifyToken } from '../utils/token.js'
import { unauthorized, forbidden, HttpError } from '../utils/errors.js'

/** 认证：解析 Authorization: Bearer <token>，失败走统一 401 */
export function authRequired(cfg) {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (!token) return next(unauthorized('请先登录'))
    try {
      req.user = verifyToken(cfg, token)
      return next()
    } catch (e) {
      return next(e) // verifyToken 内部已转换为 HttpError(401)
    }
  }
}

/** 角色守卫：仅在 authRequired 之后使用 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden('无权访问该功能'))
    }
    return next()
  }
}

/** 包装 async 路由，让 Promise 拒绝进入错误处理器 */
export const ah = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/** 解析并校验窗口天数（1~10，默认 cfg.windowDays） */
export function windowDays(cfg, raw) {
  if (raw === undefined || raw === null || raw === '') return cfg.windowDays
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 10) {
    const e = new HttpError(400, 'BAD_DAYS', 'days 需为 1~10 的整数')
    throw e
  }
  return n
}

/** 404 兜底（路由未命中） */
export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', msg: '接口不存在' })
}

/** 全局错误处理 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ ok: false, code: err.code, msg: err.message })
  }
  console.error('[server] 未捕获异常：', err)
  return res.status(500).json({ ok: false, code: 'INTERNAL', msg: '服务器内部错误，请稍后重试' })
}
