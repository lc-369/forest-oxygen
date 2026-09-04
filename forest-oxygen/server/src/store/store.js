// ===== 数据存储层（文件替身实现，后续可换 MySQL） =====
// 设计说明：
//  1. 本文件是《需求分析》§4.1“方案 A”在 MySQL 接入前的过渡实现：以 dataFile
//     JSON 文件作为唯一数据源（schemaVersion 固定，字段与 sql/schema-mysql.sql 对齐：
//     serviceDate 为绝对日期、预约状态机 booked→done/cancelled、记录不物理删除）。
//  2. 业务服务层只依赖本模块暴露的“同步内存集合 + 编号生成 + 持久化”，因此将来
//     接入 MySQL 时，仅需在 src/store 新增同名仓储实现并替换 createStore 的调用点。
//  3. 默认初始化仅写入：引导管理员（配置项）＋ 服务项目目录清单（附录一）。
//     不写入任何模拟客户/护工/预约 —— 真实账号经注册接口建立。
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { todayStr } from '../utils/datetime.js'
import { PROJECT_CATALOG } from './catalog.js'

const SCHEMA_VERSION = 1

// 六位编号：0 管理员 / 1 护工 / 2 客户（需求 §2.1 自动分配）
const PREFIX = { admin: '0', worker: '1', customer: '2' }
const pad = (n, w) => String(n).padStart(w, '0')

export function createStore(options) {
  const { dataFile, admin, bcryptRounds } = options
  if (!dataFile || !admin) throw new Error('createStore 需要 dataFile 与 admin 参数')

  const repo = { dataSource: 'file', dataFile, users: [], projects: [], bookings: [], loginLocks: {} }

  // ---------- 编号生成（从既有数据推导最大序号，保证重启不重复） ----------
  const maxUserSeq = role => {
    const seqs = repo.users.filter(u => u.role === role)
      .map(u => Number(String(u.id).slice(1)) || 0)
    return seqs.length ? Math.max(...seqs) : 0
  }
  repo.genUserId = role => `${PREFIX[role]}${pad(maxUserSeq(role) + 1, 5)}`
  repo.genProjectId = () => {
    const seqs = repo.projects.map(p => Number(String(p.id).replace(/^P/, '')) || 0)
    const max = seqs.length ? Math.max(...seqs) : 0
    return `P${pad(max + 1, 3)}`
  }
  repo.genBookingId = () => {
    const seqs = repo.bookings.map(b => Number(String(b.id).replace(/^B/, '')) || 0)
    const max = seqs.length ? Math.max(...seqs) : 0
    return `B${pad(max + 1, 5)}`
  }

  // ---------- 持久化 ----------
  function ensureDir(file) {
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }

  function save() {
    ensureDir(dataFile)
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      users: repo.users,
      projects: repo.projects,
      bookings: repo.bookings,
      loginLocks: repo.loginLocks
    }
    // 原子写：先写临时文件再改名，避免中途崩溃损坏主文件
    const tmp = `${dataFile}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8')
    fs.renameSync(tmp, dataFile)
  }

  // ---------- 载入或初始化 ----------
  function load() {
    if (fs.existsSync(dataFile)) {
      let parsed
      try {
        parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
      } catch (e) {
        // 文件损坏：备份后重建，避免服务循环崩溃；日志保留现场供排查
        const backup = `${dataFile}.corrupt-${Date.now()}`
        try { fs.renameSync(dataFile, backup) } catch (_) { /* 忽略 */ }
        console.warn(`[store] 数据文件无法解析，已备份为 ${backup} 并重建。`)
        parsed = null
      }
      if (parsed) {
        repo.users = Array.isArray(parsed.users) ? parsed.users : []
        repo.projects = Array.isArray(parsed.projects) ? parsed.projects : []
        repo.bookings = Array.isArray(parsed.bookings) ? parsed.bookings : []
        repo.loginLocks = parsed.loginLocks && typeof parsed.loginLocks === 'object' ? parsed.loginLocks : {}
      }
    }
    seedIfEmpty()
  }

  // 默认初始化：仅管理员 + 项目目录；不制造模拟用户与预约
  function seedIfEmpty() {
    let changed = false
    if (!repo.users.some(u => u.role === 'admin')) {
      repo.users.push({
        id: repo.genUserId('admin'), role: 'admin', phone: admin.phone,
        passwordHash: bcrypt.hashSync(admin.password, bcryptRounds),
        name: admin.name, age: 45, gender: '保密', createdAt: Date.now()
      })
      changed = true
    }
    if (!repo.projects.length) {
      repo.projects.push(...PROJECT_CATALOG.map(p => ({ ...p, createdAt: Date.now() })))
      changed = true
    }
    if (changed) save()
  }

  // ---------- 过账（Rollover，§4.1.3） ----------
  // 将 status='booked' 且 serviceDate < today 的记录统一置为 'done'。
  // 幂等；可在服务启动及每次涉及预约的读写前调用。
  repo.rollover = now => {
    const t = todayStr(now)
    let n = 0
    for (const b of repo.bookings) {
      if (b.status === 'booked' && b.serviceDate < t) {
        b.status = 'done'
        b.rolledAt = Date.now()
        n++
      }
    }
    if (n) save()
    return n
  }

  repo.save = save

  // 文件存储的 save() 为同步写，已即时落盘；flush() 仅用于兼容 MySQL 驱动的
  // “写接口响应前 await repo.flush()”约定，此处直接 resolve。
  repo.flush = () => Promise.resolve()

  repo.init = () => {
    load()
    repo.rollover(new Date())
    return repo
  }

  return repo
}
