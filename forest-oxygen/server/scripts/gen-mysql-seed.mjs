// =====================================================================
// 森林氧吧 · MySQL 灌数生成器（演示/联调数据，供 schema 建表后灌入）
// 用途：向 forest_oxygen 库写入一套“足够且自洽”的演示数据：
//   1 管理员 + 6 在职护工 + 1 离职护工 + 9 客户 + 8 目录项目
//   + 历史(已完成/已取消) + 今/明/后天窗口内的进行中预约。
// 一致性约束与业务代码对齐：护工须在职且技能含该项目；同一护工在同一
// 日期+时段至多服务一人；客户同一 日期+时段 至多一条；booked 计入项目
// 容量，done/cancelled 不计；only booked 落在 [今天, 今天+2]。
// 输出：server/sql/seed.sql（纯 SQL，utf8mb4，可用 mysql < seed.sql 灌入）
// 用法：cd server && node scripts/gen-mysql-seed.mjs
// =====================================================================
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import { PROJECT_CATALOG } from '../src/store/catalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'sql', 'seed.sql')

// 所有演示账号统一口令（仅用于本地演示；正式环境务必修改）
const PLAIN_PWD = '12345678'

// ---------- 本地日期工具（与库内绝对 serviceDate 对齐） ----------
const pad = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = () => fmt(new Date())
const offsetDate = (base, o) => {
  const [y, m, d] = base.split('-').map(Number)
  return fmt(new Date(y, m - 1, d + o))
}
// 确定性的伪随机（保证每次生成结果可复现）
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260904)
const pick = arr => arr[Math.floor(rnd() * arr.length)]

// ---------- SQL 转义 ----------
const s = v => {
  if (v === null || v === undefined) return 'NULL'
  const str = String(v)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\r?\n/g, '\\n')
  return `'${str}'`
}
const dt = (baseDate, addDays, hour, min = 0) => `${offsetDate(baseDate, addDays)} ${pad(hour)}:${pad(min)}:00`

// ---------- 账号数据 ----------
const ADMIN = { id: '000001', role: 'admin', phone: '13800000001', name: '系统管理员', age: 45, gender: '保密' }

const WORKERS = [
  { id: '100001', phone: '13900000011', name: '陈国华', age: 52, gender: '男', salary: 6800, status: 'active', skills: ['P001', 'P002', 'P006', 'P007'] },
  { id: '100002', phone: '13900000012', name: '林静雯', age: 38, gender: '女', salary: 7600, status: 'active', skills: ['P003', 'P004', 'P005'] },
  { id: '100003', phone: '13900000013', name: '王建国', age: 45, gender: '男', salary: 6200, status: 'active', skills: ['P001', 'P002', 'P007', 'P008'] },
  { id: '100004', phone: '13900000014', name: '苏婉清', age: 41, gender: '女', salary: 7800, status: 'active', skills: ['P003', 'P004', 'P005', 'P006'] },
  { id: '100005', phone: '13900000015', name: '郑阿明', age: 58, gender: '男', salary: 5800, status: 'active', skills: ['P001', 'P007', 'P008'] },
  { id: '100006', phone: '13900000016', name: '高丽娟', age: 36, gender: '女', salary: 6400, status: 'active', skills: ['P002', 'P005', 'P006', 'P008'] },
  { id: '100007', phone: '13900000017', name: '吴德海', age: 50, gender: '男', salary: 6000, status: 'resigned', skills: ['P001', 'P002', 'P007'] }
]
const activeWorkers = WORKERS.filter(w => w.status === 'active')

const CUSTOMERS = [
  { id: '200001', phone: '13800000021', name: '李福生', age: 72, gender: '男', allergy: '海鲜', disease: '高血压', preference: '偏爱上午时段，动作宜和缓' },
  { id: '200002', phone: '13800000022', name: '张淑芬', age: 68, gender: '女', allergy: '', disease: '糖尿病、类风湿', preference: '偏好艾灸与中药足浴调理' },
  { id: '200003', phone: '13800000023', name: '周婉仪', age: 75, gender: '女', allergy: '花生', disease: '冠心病', preference: '喜安静环境，需护工从旁照护' },
  { id: '200004', phone: '13800000024', name: '刘德厚', age: 70, gender: '男', allergy: '芒果', disease: '轻度认知障碍', preference: '希望家人陪同，节奏放慢' },
  { id: '200005', phone: '13800000025', name: '孙巧云', age: 66, gender: '女', allergy: '', disease: '骨质疏松', preference: '偏爱温和的走步与八段锦' },
  { id: '200006', phone: '13800000026', name: '赵永康', age: 79, gender: '男', allergy: '羊肉', disease: '高血压、高血脂', preference: '偏好太极与八段锦晨练' },
  { id: '200007', phone: '13800000027', name: '钱丽华', age: 63, gender: '女', allergy: '坚果', disease: '', preference: '喜爱园艺花艺与药膳餐' },
  { id: '200008', phone: '13800000028', name: '周博文', age: 58, gender: '男', allergy: '', disease: '肩周炎', preference: '偏好中医理疗类项目' },
  { id: '200009', phone: '13800000029', name: '吴静娴', age: 71, gender: '女', allergy: '海鲜', disease: '慢性胃炎', preference: '偏好药膳调理与足浴' }
]

// ---------- 生成 bcrypt 哈希（全部同一口令，盐随机，哈希互异亦可） ----------
const PWD_HASH = bcrypt.hashSync(PLAIN_PWD, 10)

// ---------- 统计 booked 容量占用的辅助 ----------
// key: `${projectId}|${serviceDate}|${slot}` → 计数（仅计入 active=booked）
const winCap = new Map()
const capOf = (pid, sd, slot) => winCap.get(`${pid}|${sd}|${slot}`) || 0
const incCap = (pid, sd, slot) => winCap.set(`${pid}|${sd}|${slot}`, capOf(pid, sd, slot) + 1)

const ID_B = { n: 0, next: () => `B${pad(++ID_B.n, 5)}` }

// 三类不变量
const usedWorker = new Set() // `${workerId}|${date}|${slot}`
const usedCust = new Set()   // `${customerId}|${date}|${slot}`
const workerKey = (w, d, s) => `${w}|${d}|${s}`
const custKey = (c, d, s) => `${c}|${d}|${s}`

const projOf = id => PROJECT_CATALOG.find(p => p.id === id)

/** 找一名可用的在职护工：技能含 projectId 且 (date,slot) 空闲 */
function freeWorkerFor(projectId, date, slot) {
  const pool = activeWorkers.filter(w =>
    w.skills.includes(projectId) && !usedWorker.has(workerKey(w.id, date, slot)))
  return pool.length ? pick(pool) : null
}

// ---------- 窗口期预约（今/明/后天，每 日期×时段 2 条，跨项目不重复） ----------
const todayStr = today()
const windowBookings = []
for (let off = 0; off < 3; off++) {
  const date = offsetDate(todayStr, off)
  for (let slot = 0; slot < 4; slot++) {
    // 收集此时段仍有余量的候选项目
    const candidates = PROJECT_CATALOG.filter(p => capOf(p.id, date, slot) < p.capacity)
    // 乱序挑选两个不同项目
    const shuffled = candidates.slice().sort(() => rnd() - 0.5)
    const chosen = []
    for (const p of shuffled) {
      if (chosen.length >= 2) break
      if (chosen.some(c => c.id === p.id)) continue
      chosen.push(p)
    }
    for (const p of chosen) {
      const worker = freeWorkerFor(p.id, date, slot)
      if (!worker) continue
      // 找一个尚无 (date,slot) 预约的客户
      const custPool = CUSTOMERS.filter(c => !usedCust.has(custKey(c.id, date, slot)))
      if (!custPool.length) continue
      const customer = pick(custPool)
      usedWorker.add(workerKey(worker.id, date, slot))
      usedCust.add(custKey(customer.id, date, slot))
      incCap(p.id, date, slot)
      const hour = slot < 2 ? (slot === 0 ? 9 : 10) : slot + 11 // 预约提交大致白天
      windowBookings.push({
        id: ID_B.next(), customerId: customer.id, workerId: worker.id, projectId: p.id,
        serviceDate: date, slot, status: 'booked',
        createdAt: dt(offsetDate(date, -1), 0, hour + (off % 2), 10 + slot * 7)
      })
    }
  }
}

// ---------- 历史记录：已完成 / 已取消（均为过去日期，倒排生成更自然） ----------
const history = []
const pastPlan = [1, 2, 3, 5, 6, 8, 9, 11, 12, 13].map(off => ({ off, n: 2, status: 'done' }))
  .concat([4, 7, 10].map(off => ({ off, n: 1, status: 'cancelled' })))
for (const { off, n, status } of pastPlan) {
  const date = offsetDate(todayStr, -off)
  for (let k = 0; k < n; k++) {
    // 随机选一个项目（合法性由下方护工/客户筛选保证）
    const p = pick(PROJECT_CATALOG)
    // 找一个有技能且 (date,slot) 空闲的护工（历史同样不出现同一人同一时段两单）
    const slot = (off + k) % 4
    const worker = freeWorkerFor(p.id, date, slot)
    if (!worker) continue
    const custPool = CUSTOMERS.filter(c => !usedCust.has(custKey(c.id, date, slot)))
    if (!custPool.length) continue
    const customer = pick(custPool)
    usedWorker.add(workerKey(worker.id, date, slot))
    usedCust.add(custKey(customer.id, date, slot))
    const bookH = slot < 2 ? 9 : 14
    const created = dt(date, -1, bookH, 20)
    history.push({
      id: ID_B.next(), customerId: customer.id, workerId: worker.id, projectId: p.id,
      serviceDate: date, slot, status,
      createdAt: created,
      cancelledAt: status === 'cancelled' ? dt(date, -1, 18, 5) : null
    })
  }
}

// ---------- 组装 SQL ----------
const lines = []
lines.push('-- =====================================================================')
lines.push('-- 森林氧吧 · forest_oxygen 演示数据（由 scripts/gen-mysql-seed.mjs 生成）')
lines.push(`-- 生成日期 ${dt(todayStr, 0, 0).slice(0, 10)}；演示口令统一 ${PLAIN_PWD}（本地演示用）`)
lines.push('-- 含：管理员1/在职护工6/离职护工1/客户9/项目8；预约单共 ' +
  `${windowBookings.length}(进行中) + ${history.length}(历史)`)
lines.push('-- 用法：先执行 schema-mysql.sql，再执行本文件')
lines.push('-- =====================================================================')
lines.push('')
lines.push('SET NAMES utf8mb4;')
lines.push(`USE \`forest_oxygen\`;`)
lines.push('SET FOREIGN_KEY_CHECKS = 0;')
lines.push('')

// 1) user
lines.push('-- 用户（管理员/护工/客户）')
lines.push('INSERT INTO `user` (`id`,`role`,`phone`,`password_hash`,`name`,`age`,`gender`,`salary`,`status`,`allergy`,`disease`,`preference`,`created_at`) VALUES')
const roleOf = id => (id.startsWith('0') ? 'admin' : id.startsWith('1') ? 'worker' : 'customer')
const userRows = []
const pushUser = u => userRows.push(`(${s(u.id)},${s(roleOf(u.id))},${s(u.phone)},${s(PWD_HASH)},${s(u.name)},${u.age},${s(u.gender)},${s(u.salary || 0)},${s(u.status || 'active')},${s(u.allergy || '')},${s(u.disease || '')},${s(u.preference || '')},${s(dt(todayStr, -30, 9, 0))})`)
pushUser(ADMIN)
WORKERS.forEach(pushUser)
CUSTOMERS.forEach(pushUser)
lines.push(userRows.join(',\n') + ';')
lines.push('')

// 2) worker_skill
lines.push('-- 护工可服务项目')
lines.push('INSERT INTO `worker_skill` (`worker_id`,`project_id`) VALUES')
const sk = []
WORKERS.forEach(w => w.skills.forEach(p => sk.push(`(${s(w.id)},${s(p)})`)))
lines.push(sk.join(',\n') + ';')
lines.push('')

// 3) project
lines.push('-- 服务项目（目录清单）')
lines.push('INSERT INTO `project` (`id`,`name`,`location`,`fee`,`capacity`,`status`,`duration`,`flow`,`suitable`,`taboo`,`created_at`) VALUES')
const projRows = PROJECT_CATALOG.map(p => `(${s(p.id)},${s(p.name)},${s(p.location)},${p.fee},${p.capacity},${s(p.status)},${s(p.duration)},${s(p.flow)},${s(p.suitable)},${s(p.taboo)},${s(dt(todayStr, -30, 9, 5))})`)
lines.push(projRows.join(',\n') + ';')
lines.push('')

// 4) booking（含进行中与历史）
lines.push('-- 预约记录（含进行中/已完成/已取消）')
const bookingRows = [...windowBookings, ...history].map(b => `(${s(b.id)},${s(b.customerId)},${s(b.workerId)},${s(b.projectId)},${s(b.serviceDate)},${b.slot},${s(b.status)},${s(b.createdAt)},${s(b.createdAt)},${s(b.cancelledAt)})`)
lines.push('INSERT INTO `booking` (`id`,`customer_id`,`worker_id`,`project_id`,`service_date`,`slot`,`status`,`created_at`,`updated_at`,`cancelled_at`) VALUES')
lines.push(bookingRows.join(',\n') + ';')
lines.push('')

lines.push('SET FOREIGN_KEY_CHECKS = 1;')
lines.push('')
lines.push('-- 复核：各表应有多少行')
lines.push(`SELECT 'user' tbl, COUNT(*) n FROM \`user\` UNION ALL SELECT 'worker_skill', COUNT(*) FROM \`worker_skill\` UNION ALL SELECT 'project', COUNT(*) FROM \`project\` UNION ALL SELECT 'booking', COUNT(*) FROM \`booking\`;`)

fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
console.log(`已生成 ${OUT}`)
console.log(`用户 ${1 + WORKERS.length + CUSTOMERS.length} · 预约 ${windowBookings.length}(booked) + ${history.length}(历史)`)
const bad = history.filter(h => !projOf(h.projectId) || !activeWorkers.some(w => w.id === h.workerId) || !CUSTOMERS.some(c => c.id === h.customerId))
if (bad.length) console.warn('存在非法引用（不应出现）:', bad.length)
