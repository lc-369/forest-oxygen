// ===== JWT 签发与校验 =====
import jwt from 'jsonwebtoken'
import { unauthorized } from './errors.js'

export function signToken(cfg, user) {
  return jwt.sign(
    { id: user.id, role: user.role, phone: user.phone },
    cfg.jwtSecret,
    { expiresIn: Math.floor(cfg.jwtExpiresMs / 1000) } // 单位：秒
  )
}

export function verifyToken(cfg, token) {
  try {
    return jwt.verify(token, cfg.jwtSecret)
  } catch (e) {
    throw unauthorized('登录状态已失效，请重新登录')
  }
}
