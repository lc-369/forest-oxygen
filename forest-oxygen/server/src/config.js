// ===== 服务配置：读取 .env（可缺省），全部提供默认值 =====
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..')

// 极简 .env 解析（不引入额外依赖；键名大小写不敏感）
function loadEnv(file) {
  const out = {}
  let raw = ''
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch (e) {
    return out // 无 .env 文件时使用默认值
  }
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx <= 0) continue
    out[t.slice(0, idx).trim()] = t.slice(idx + 1).trim()
  }
  return out
}

const env = loadEnv(path.join(ROOT, '.env'))

// 读取优先级：真实环境变量(process.env) > .env 文件 > 默认值
const pick = key => {
  const pe = process.env[key]
  return pe === undefined || pe === '' ? env[key] : pe
}

const num = (key, fallback) => {
  const v = pick(key)
  if (v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const str = (key, fallback) => {
  const v = pick(key)
  return v === undefined || v === '' ? fallback : v
}

const cfg = {
  root: ROOT,
  port: num('PORT', 3001),

  jwtSecret: str('JWT_SECRET', 'forest-oxygen-dev-secret-change-me'),
  jwtExpiresMs: num('JWT_EXPIRES_MS', 8 * 60 * 60 * 1000), // 默认 8 小时

  // 预约窗口天数：今/明/后天 => 3
  windowDays: num('BOOKING_WINDOW_DAYS', 3),

  // 登录失败锁定
  maxFails: num('LOGIN_MAX_FAILS', 5),
  lockMinutes: num('LOGIN_LOCK_MINUTES', 15),

  bcryptRounds: num('BCRYPT_ROUNDS', 10),

  // 引导管理员账号（仅当库中无任何用户时创建一次）
  adminPhone: str('ADMIN_PHONE', '13800000001'),
  adminPassword: str('ADMIN_PASSWORD', '12345678'),
  adminName: str('ADMIN_NAME', '系统管理员'),

  // 存储引擎：mysql（推荐，见 .env STORE=mysql）| file（旧 JSON 文件存储）
  store: str('STORE', 'file'),

  // MySQL 连接（STORE=mysql 时使用；仅授权 DML 的应用账号即可）
  db: {
    host: str('DB_HOST', '127.0.0.1'),
    port: num('DB_PORT', 3306),
    user: str('DB_USER', 'root'),
    password: str('DB_PASSWORD', ''),
    database: str('DB_NAME', 'forest_oxygen')
  },

  // 文件存储位置（STORE=file 时使用，接入 MySQL 后不再使用）
  dataFile: str('DATA_FILE', path.join(ROOT, 'data', 'store.json')),

  envRefreshMs: num('ENV_REFRESH_MS', 6000)
}

export default cfg
