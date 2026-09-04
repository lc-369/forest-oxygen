// ===== 网络请求层 =====
// 职责：统一 baseURL、注入 Bearer Token、解包 {ok,data} 响应、把业务错误归一为 ApiError。
// 登录/注册等白名单接口不做会话清理，其余接口遇 401(UNAUTHORIZED) 自动退出回登录页。

import axios from 'axios'

// 会话本地存储键（与服务端 JWT 配套）
export const TOKEN_KEY = 'fo_token'
export const AUTH_KEY = 'fo_auth' // { id, role } 角色快照，用于路由守卫即时判断

export class ApiError extends Error {
  constructor(status, code, msg) {
    super(msg)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// 认证白名单：登录 / 注册接口返回 401 时属于“业务失败”，不应清会话
const isAuthUrl = url => /\/auth\/(login|register)/.test(url)

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(AUTH_KEY, JSON.stringify({ id: user.id, role: user.role }))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(AUTH_KEY)
}

// 重启后用于路由守卫恢复角色（无需等待网络）
export function restoredAuth() {
  return readLocal(AUTH_KEY) || { id: '', role: '' }
}

const http = axios.create({ baseURL: '/api', timeout: 15000 })

// 请求拦截：附带 Bearer token
http.interceptors.request.use(cfg => {
  const token = getToken()
  if (token) {
    cfg.headers = cfg.headers || {}
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

// 响应拦截：成功直接给响应体；失败统一抛 ApiError{status, code, msg}
http.interceptors.response.use(
  resp => resp.data,
  err => {
    const status = err.response ? err.response.status : 0
    const body = (err.response && err.response.data) || {}
    const code = body.code || (status ? `HTTP_${status}` : 'NETWORK')
    const msg = body.msg || err.message || '网络异常，请稍后重试'

    // token 失效/缺失（非登录注册流程）→ 清会话并回登录页
    if (status === 401 && code === 'UNAUTHORIZED' && !isAuthUrl(err.config?.url || '')) {
      clearSession()
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(new ApiError(status, code, msg))
  }
)

/**
 * 统一请求：成功返回响应体 data；纯提示响应（无 data）返回整个 body。
 * @param {{method:string, url:string, params?:object, data?:object}} opt
 */
export async function request(opt) {
  const body = await http.request(opt)
  return body && body.data !== undefined ? body.data : body
}

export default http
