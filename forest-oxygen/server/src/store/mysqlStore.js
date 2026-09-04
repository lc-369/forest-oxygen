// =====================================================================
// MySQL 存储驱动（业务代码的“内存仓库 + 落盘”实现对 MySQL 的实现）
// 设计说明：
//  · 业务服务层对 repo 的约定完全不变（users/projects/bookings/loginLocks
//    数组 + 编号生成 + rollover + save/init），本文件只是把“落盘”目标从
//    JSON 文件换成 MySQL 库 forest_oxygen（表结构见 sql/schema-mysql.sql）。
//  · 启动时一次性把 MySQL 全量载入内存作为工作区（读取/规则判断保持同步、
//    零改动）；每次业务写操作调用 save() 后，把“整库重写”压入一条串行队列
//    异步落库（本系统数据量小，整库重写代价可接受；逻辑与旧文件存储每次
//    全量序列化一致）。写接口在响应前 await repo.flush() 等待本次落库完成。
//  · 落库失败会记日志并不中断进程，内存仍为准；后续任一次写操作会再次整库
//    重写自愈。断线自动重连。
//  · worker_skill 关联表在载入时合并为 user.skills 数组，重写时再拆回。
// =====================================================================
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import { PROJECT_CATALOG } from './catalog.js'

const PREFIX = { admin: '0', worker: '1', customer: '2' }
const pad = (n, w) => String(n).padStart(w, '0')
const pad2 = n => String(n).padStart(2, '0')

/** 毫秒时间戳 -> 'YYYY-MM-DD HH:mm:ss'（本地时区） */
function msToDt(ms) {
  if (ms === null || ms === undefined) return null
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** 'YYYY-MM-DD HH:mm:ss' / 'YYYY-MM-DDTHH:mm:ss' -> 毫秒（本地时区）；空返回 null */
function dtToMs(v) {
  if (v === null || v === undefined) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(v))
  if (!m) return null
  const [, y, mo, dd, h, mi, se] = m
  return new Date(Number(y), Number(mo) - 1, Number(dd), Number(h), Number(mi), Number(se)).getTime()
}

export async function createMysqlStore(cfg) {
  const { db } = cfg
  if (!db || !db.host || !db.user || !db.database) {
    throw new Error('MySQL 存储需要 DB_HOST/DB_USER/DB_NAME 配置（见 server/.env）')
  }
  const { admin, bcryptRounds } = cfg

  const repo = { dataSource: 'mysql', users: [], projects: [], bookings: [], loginLocks: {} }
  let conn = null

  // ---------- 连接与重连 ----------
  async function ensureConn() {
    if (conn) {
      try { await conn.ping(); return conn } catch (e) { /* 掉线，重建 */ }
      try { await conn.end() } catch (e) { /* 忽略 */ }
      conn = null
    }
    conn = await mysql.createConnection({
      host: db.host, port: db.port || 3306,
      user: db.user, password: db.password || '',
      database: db.database, charset: 'utf8mb4', dateStrings: true
    })
    return conn
  }

  async function q(sql, params) {
    const c = await ensureConn()
    const [rows] = await c.query(sql, params || [])
    return rows
  }

  // ---------- 编号生成（内存推导，重启不重复） ----------
  const maxSeq = (arr, role) => {
    const seqs = arr.filter(u => u.role === role)
      .map(u => Number(String(u.id).slice(1)) || 0)
    return seqs.length ? Math.max(...seqs) : 0
  }
  repo.genUserId = role => `${PREFIX[role]}${pad(maxSeq(repo.users, role) + 1, 5)}`
  repo.genProjectId = () => {
    const seqs = repo.projects.map(p => Number(String(p.id).replace(/^P/, '')) || 0)
    return `P${pad((seqs.length ? Math.max(...seqs) : 0) + 1, 3)}`
  }
  repo.genBookingId = () => {
    const seqs = repo.bookings.map(b => Number(String(b.id).replace(/^B/, '')) || 0)
    return `B${pad((seqs.length ? Math.max(...seqs) : 0) + 1, 5)}`
  }

  // ---------- 载入：MySQL -> 内存工作区 ----------
  async function load() {
    const userRows = await q('SELECT * FROM `user` ORDER BY id')
    const skillRows = await q('SELECT * FROM `worker_skill` ORDER BY worker_id, project_id')
    const projectRows = await q('SELECT * FROM `project` ORDER BY id')
    const bookingRows = await q('SELECT * FROM `booking` ORDER BY id')
    const lockRows = await q('SELECT * FROM `login_lock`')

    const skillsOf = new Map()
    for (const s of skillRows) {
      const list = skillsOf.get(s.worker_id) || []
      list.push(s.project_id)
      skillsOf.set(s.worker_id, list)
    }

    repo.users = userRows.map(u => {
      const base = {
        id: u.id, role: u.role, phone: u.phone, passwordHash: u.password_hash,
        name: u.name, age: Number(u.age), gender: u.gender, createdAt: dtToMs(u.created_at)
      }
      if (u.role === 'worker') {
        base.salary = Number(u.salary)
        base.status = u.status
        base.skills = skillsOf.get(u.id) || []
      } else if (u.role === 'customer') {
        base.allergy = u.allergy || ''
        base.disease = u.disease || ''
        base.preference = u.preference || ''
      }
      return base
    })

    repo.projects = projectRows.map(p => ({
      id: p.id, name: p.name, location: p.location, fee: Number(p.fee),
      capacity: Number(p.capacity), status: p.status,
      duration: p.duration || '', flow: p.flow || '',
      suitable: p.suitable || '', taboo: p.taboo || '',
      createdAt: dtToMs(p.created_at)
    }))

    repo.bookings = bookingRows.map(b => ({
      id: b.id, customerId: b.customer_id, workerId: b.worker_id, projectId: b.project_id,
      serviceDate: b.service_date, slot: Number(b.slot), status: b.status,
      createdAt: dtToMs(b.created_at), cancelledAt: dtToMs(b.cancelled_at)
    }))

    repo.loginLocks = {}
    for (const l of lockRows) {
      const until = dtToMs(l.locked_until)
      repo.loginLocks[l.phone] = { count: Number(l.fail_count), lockedUntil: until || 0 }
    }
  }

  // ---------- 初始化引导（库空时写入管理员 + 项目清单，与文件存储一致） ----------
  let bootDirty = false
  function seedIfEmpty() {
    if (!repo.users.some(u => u.role === 'admin')) {
      repo.users.push({
        id: repo.genUserId('admin'), role: 'admin', phone: admin.phone,
        passwordHash: bcrypt.hashSync(admin.password, bcryptRounds),
        name: admin.name, age: 45, gender: '保密', createdAt: Date.now()
      })
      bootDirty = true
    }
    if (!repo.projects.length) {
      repo.projects.push(...PROJECT_CATALOG.map(p => ({ ...p, createdAt: Date.now() })))
      bootDirty = true
    }
  }

  // ---------- 过账（Rollover，§4.1.3） ----------
  repo.rollover = now => {
    const t = new Date(now || new Date())
    const base = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
    let n = 0
    for (const b of repo.bookings) {
      if (b.status === 'booked' && b.serviceDate < base) {
        b.status = 'done'
        b.rolledAt = t.getTime()
        n++
      }
    }
    if (n) repo.save()
    return n
  }

  // ---------- 整库落盘（串行队列，全量重写） ----------
  async function flushNow() {
    const c = await ensureConn()
    await c.beginTransaction()
    try {
      await c.query('SET FOREIGN_KEY_CHECKS=0')
      await c.query('DELETE FROM `booking`')
      await c.query('DELETE FROM `worker_skill`')
      await c.query('DELETE FROM `login_lock`')
      await c.query('DELETE FROM `project`')
      await c.query('DELETE FROM `user`')

      const ph = rows => rows.map(() => '(?)').join(',')
      if (repo.users.length) {
        const vals = repo.users.map(u => [
          u.id, u.role, u.phone, u.passwordHash, u.name, u.age ?? 0, u.gender ?? '保密',
          u.role === 'worker' ? (u.salary ?? 0) : 0,
          u.role === 'worker' ? (u.status ?? 'active') : 'active',
          u.role === 'customer' ? (u.allergy || '') : '',
          u.role === 'customer' ? (u.disease || '') : '',
          u.role === 'customer' ? (u.preference || '') : '',
          msToDt(u.createdAt)
        ])
        await c.query(`INSERT INTO \`user\` (id,role,phone,password_hash,name,age,gender,salary,status,allergy,disease,preference,created_at) VALUES ${ph(vals)}`, vals)
      }
      const skills = []
      repo.users.forEach(u => (u.skills || []).forEach(pid => skills.push([u.id, pid])))
      if (skills.length) {
        await c.query(`INSERT INTO \`worker_skill\` (worker_id,project_id) VALUES ${ph(skills)}`, skills)
      }
      if (repo.projects.length) {
        const vals = repo.projects.map(p => [
          p.id, p.name, p.location, p.fee ?? 0, p.capacity ?? 1, p.status ?? 'active',
          p.duration || '', p.flow || '', p.suitable || '', p.taboo || '', msToDt(p.createdAt)
        ])
        await c.query(`INSERT INTO \`project\` (id,name,location,fee,capacity,status,duration,flow,suitable,taboo,created_at) VALUES ${ph(vals)}`, vals)
      }
      if (repo.bookings.length) {
        const vals = repo.bookings.map(b => [
          b.id, b.customerId, b.workerId, b.projectId,
          b.serviceDate, b.slot, b.status,
          msToDt(b.createdAt), msToDt(b.createdAt),
          b.cancelledAt ? msToDt(b.cancelledAt) : null
        ])
        await c.query(`INSERT INTO \`booking\` (id,customer_id,worker_id,project_id,service_date,slot,status,created_at,updated_at,cancelled_at) VALUES ${ph(vals)}`, vals)
      }
      const locks = Object.entries(repo.loginLocks)
      if (locks.length) {
        const vals = locks.map(([phone, r]) => [phone, r.count || 0, r.lockedUntil ? msToDt(r.lockedUntil) : null])
        await c.query(`INSERT INTO \`login_lock\` (phone,fail_count,locked_until) VALUES ${ph(vals)}`, vals)
      }
      await c.query('SET FOREIGN_KEY_CHECKS=1')
      await c.commit()
    } catch (e) {
      try { await c.rollback() } catch (_) { /* 忽略 */ }
      throw e
    }
  }

  // save()：业务写路径调用（同步签名）；实际压入串行队列异步落库
  let chain = Promise.resolve()
  repo.save = () => {
    chain = chain
      .then(() => flushNow())
      .catch(err => console.error('[mysqlStore] 落库失败（内存仍为准，下次写会自愈）：', err && err.message))
    return undefined
  }

  /** 返回“当前队列”的 Promise：写接口在响应前 await 它，保证本次落库完成 */
  repo.flush = () => chain

  /** 初始化：载入 -> 过账 -> 空库引导 -> （若有改动）落库 */
  repo.init = async () => {
    await ensureConn()
    await load()
    repo.rollover(new Date())
    seedIfEmpty()
    if (bootDirty) await repo.flush()
    return repo
  }

  return repo
}
