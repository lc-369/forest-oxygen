// ===== 业务异常与统一错误结构 =====
// 约定：后端响应一律为 { ok, msg?, data? }（错误时 ok=false，HTTP 状态码见 HttpError.status）

export class HttpError extends Error {
  constructor(status, code, msg) {
    super(msg)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export const badRequest = (code, msg) => new HttpError(400, code, msg)
export const unauthorized = (msg = '请先登录') => new HttpError(401, 'UNAUTHORIZED', msg)
export const forbidden = (msg = '无权访问该资源') => new HttpError(403, 'FORBIDDEN', msg)
export const notFound = (msg = '资源不存在') => new HttpError(404, 'NOT_FOUND', msg)
export const conflict = (code, msg) => new HttpError(409, code, msg)

/** 组装成功响应 */
export const okData = data => ({ ok: true, data })
export const okMsg = (msg, data) => data !== undefined ? { ok: true, msg, data } : { ok: true, msg }
