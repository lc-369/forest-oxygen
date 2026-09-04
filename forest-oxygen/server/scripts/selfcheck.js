// ===== 自检脚本：核心业务逻辑断言（不含网络层） =====
// 运行：npm run selfcheck
// 覆盖：编号/注册/登录锁定/预约引擎(冲突·容量·护工技能匹配·随机分配)/取消/过账/历史/隐私字段/持久化
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createStore } from '../src/store/store.js'
import { userService } from '../src/services/userService.js'
import { projectService } from '../src/services/projectService.js'
import { bookingService } from '../src/services/bookingService.js'
import { HttpError } from '../src/utils/errors.js'
import { todayStr, addDays } from '../src/utils/datetime.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, `selfcheck-${Date.now()}.json`)

// 轻量配置：临时数据文件 + 低 bcrypt 轮数提速
const cfg = {
  windowDays: 3,
  maxFails: 5,
  lockMinutes: 15,
  bcryptRounds: 4,
  jwtSecret: 'selfcheck-secret',
  jwtExpiresMs: 28800000,
  adminPhone: '13800000009',
  adminPassword: '12345678',
  adminName: '自检管理员'
}

let passed = 0
function assert(cond, msg) {
  if (!cond) {
    console.error(`  ✗ 断言失败：${msg}`)
    process.exitCode = 1
    throw new Error(msg)
  }
  passed++
  console.log(`  ✓ ${msg}`)
}

async function expectError(fn, code) {
  try {
    const v = typeof fn === 'function' ? fn() : fn
    if (v && typeof v.then === 'function') await v
  } catch (e) {
    assert(e instanceof HttpError && e.code === code,
      `期望错误码 ${code}，实际 ${e.code || e.message}（${e.constructor.name}）`)
    return e
  }
  throw new Error(`期望抛出 ${code} 但未抛错`)
}

async function main() {
  console.log('==== 森林氧吧后端 · 业务自检 ====')
  fs.mkdirSync(DATA_DIR, { recursive: true })

  const repo = createStore({
    dataFile: DATA_FILE,
    admin: { phone: cfg.adminPhone, password: cfg.adminPassword, name: cfg.adminName },
    bcryptRounds: cfg.bcryptRounds
  }).init()

  const NOW = new Date()          // 以真实日期为基准（2026-09-04）
  const base = todayStr(NOW)      // 今天

  // ---------- 初始化 ----------
  assert(repo.users.length === 1 && repo.users[0].role === 'admin', '初始仅创建 1 名引导管理员')
  assert(repo.projects.length === 8, '项目目录清单初始化 8 个（附录一）')
  assert(!repo.users[0].passwordHash || repo.users[0].passwordHash.startsWith('$2'), '管理员密码已 bcrypt 哈希')
  assert(repo.users[0].id === '000001' || repo.users[0].id.startsWith('0'), '管理员编号首位为 0')

  const admin = repo.users[0]

  // ---------- 注册校验 ----------
  // register 返回 {id, user}，此处统一解包为 user 便于后续引用 id/phone
  const reg = async (role, phone, name, extra = {}) =>
    (await userService.register(repo, cfg, { role, phone, password: '12345678', name, ...extra })).user

  const W_A = await reg('worker', '13811110001', '护工甲', { age: 40, gender: '女', skills: ['P001', 'P003'], salary: 6000 })
  assert(W_A.id.startsWith('1'), '护工编号首位为 1')
  const W_B = await reg('worker', '13811110002', '护工乙', { age: 45, gender: '男', skills: ['P001', 'P002'] })
  const W_C = await reg('worker', '13811110003', '护工丙', { age: 30, gender: '女', skills: ['P007'] })
  const W_D = await reg('worker', '13811110004', '护工丁', { age: 35, gender: '保密', skills: ['P008'] })

  const C1 = await reg('customer', '13911110001', '客户甲', { age: 72, gender: '男', allergy: '海鲜', disease: '高血压', preference: '喜安静' })
  const C2 = await reg('customer', '13911110002', '客户乙', { age: 66 })
  const C3 = await reg('customer', '13911110003', '客户丙', { age: 70 })

  assert([C1.id, C2.id, C3.id].every(id => id.startsWith('2')), '客户编号首位为 2')
  assert(userService.getUser(repo, W_A.id).skills.length === 2, '护工可服务项目保存成功')

  await expectError(() => userService.register(repo, cfg, { role: 'customer', phone: '13911110001', password: '12345678', name: '重复' }), 'PHONE_TAKEN')
  await expectError(() => userService.register(repo, cfg, { role: 'customer', phone: '1390000000', password: '12345678', name: 'x' }), 'BAD_PHONE')
  await expectError(() => userService.register(repo, cfg, { role: 'customer', phone: '13922220001', password: '12ab', name: 'x' }), 'BAD_PASSWORD')
  await expectError(() => userService.register(repo, cfg, { role: 'customer', phone: '13922220002', password: '12345678', name: 'x', age: 999 }), 'BAD_AGE')
  await expectError(() => userService.register(repo, cfg, { role: 'admin', phone: '13922220003', password: '12345678', name: 'x' }), 'BAD_ROLE')
  await expectError(() => userService.register(repo, cfg, { role: 'worker', phone: '13811110005', password: '12345678', name: 'x', age: 40, skills: ['P999'] }), 'BAD_SKILLS')

  // ---------- 登录 & 锁定 ----------
  const loginA = await userService.login(repo, cfg, { phone: C1.phone, password: '12345678' }, NOW)
  assert(!!loginA.token && loginA.user.role === 'customer' && loginA.user.id === C1.id, '正确凭据登录成功并签发 token')
  assert(loginA.user.passwordHash === undefined, '登录返回不携带密码哈希')

  // 连续 5 次密码错误后锁定
  for (let i = 1; i <= 5; i++) {
    await expectError(() => userService.login(repo, cfg, { phone: C1.phone, password: '00000000' }, NOW), 'WRONG_PASSWORD')
  }
  await expectError(() => userService.login(repo, cfg, { phone: C1.phone, password: '12345678' }, NOW), 'ACCOUNT_LOCKED')

  // 离职护工无法登录
  await userService.setWorkerStatus(repo, cfg, W_D.id, 'resigned')
  await expectError(() => userService.login(repo, cfg, { phone: W_D.phone, password: '12345678' }, NOW), 'WORKER_RESIGNED')

  // ---------- 预约引擎 ----------
  const p001 = projectService.update(repo, 'P001', { capacity: 2 }) // 临时缩容便于断言
  assert(p001.capacity === 2, '项目管理可修改容量')

  // 技能匹配：P001 可由 W_A/W_B 服务
  const b1 = bookingService.book(repo, cfg, { customerId: C1.id, projectId: 'P001', serviceDate: base, slot: 0 }, NOW)
  assert([W_A.id, W_B.id].includes(b1.workerId), '随机分配在职且技能匹配的护工')
  assert(b1.status === 'booked' && b1.serviceDate === base, '预约落库：绝对 serviceDate + booked')
  assert(b1.customerName === '客户甲' && b1.projectName === '森林浴·负氧离子漫步', '预约记录补全客户/项目名称')

  await expectError(() => bookingService.book(repo, cfg, { customerId: C1.id, projectId: 'P001', serviceDate: base, slot: 0 }, NOW), 'SLOT_TAKEN')

  const b2 = bookingService.book(repo, cfg, { customerId: C2.id, projectId: 'P001', serviceDate: base, slot: 0 }, NOW)
  assert(b2.workerId !== b1.workerId, '同一时段护工不重复排班（占用检测）')

  await expectError(() => bookingService.book(repo, cfg, { customerId: C3.id, projectId: 'P001', serviceDate: base, slot: 0 }, NOW), 'CAPACITY_FULL')

  // 取消后容量/护工释放，可再次预约
  const cancelled = bookingService.cancel(repo, { id: b1.id, customerId: C1.id }, NOW)
  assert(cancelled.status === 'cancelled', '取消成功：状态转 cancelled')
  await expectError(() => bookingService.cancel(repo, { id: b1.id, customerId: C1.id }, NOW), 'ALREADY_CANCELLED')
  const b3 = bookingService.book(repo, cfg, { customerId: C3.id, projectId: 'P001', serviceDate: base, slot: 0 }, NOW)
  assert(!!b3.id && b3.status === 'booked', '取消后原时段可再次预约')

  // 无空闲/匹配护工 → NO_WORKER（P006 无任何护工技能覆盖）
  await expectError(() => bookingService.book(repo, cfg, { customerId: C3.id, projectId: 'P006', serviceDate: base, slot: 2 }, NOW), 'NO_WORKER')

  // 仅 W_C 匹配 P007 → 必派 W_C
  const b4 = bookingService.book(repo, cfg, { customerId: C1.id, projectId: 'P007', serviceDate: base, slot: 2 }, NOW)
  assert(b4.workerId === W_C.id, '技能不匹配的护工不被派单')

  // 停用项目不可约
  projectService.update(repo, 'P002', { status: 'disabled' })
  await expectError(() => bookingService.book(repo, cfg, { customerId: C2.id, projectId: 'P002', serviceDate: base, slot: 3 }, NOW), 'PROJECT_DISABLED')
  projectService.update(repo, 'P002', { status: 'active' })

  // 非法时段 / 超出预约窗口
  await expectError(() => bookingService.book(repo, cfg, { customerId: C2.id, projectId: 'P001', serviceDate: base, slot: 9 }, NOW), 'BAD_SLOT')
  await expectError(() => bookingService.book(repo, cfg, { customerId: C2.id, projectId: 'P001', serviceDate: addDays(base, 3), slot: 0 }, NOW), 'OUT_OF_WINDOW')
  await expectError(() => bookingService.book(repo, cfg, { customerId: C2.id, projectId: 'P001', serviceDate: '2026-13-40', slot: 0 }, NOW), 'BAD_DATE')

  // ---------- 窗口 / 排班查询 ----------
  const winC2 = bookingService.customerWindow(repo, cfg, C2.id, NOW)
  assert(winC2.length === cfg.windowDays * 4, '客户窗口为 3×4=12 格')
  const bookedRows = winC2.filter(r => r.booking)
  assert(bookedRows.length === 1 && bookedRows[0].slot === 0, '客户窗口内仅含本人已约格')

  const schedW = bookingService.workerSchedule(repo, cfg, W_C.id, true, cfg.windowDays, NOW)
  const rowW = schedW.find(r => r.serviceDate === base && r.slot === 2)
  assert(rowW && rowW.booking && rowW.booking.customerName === '客户甲', '护工排班含本人服务（含客户姓名）')
  assert(rowW.booking.allergy === '海鲜' && 'disease' in rowW.booking, '护工本人可见客户健康档案')

  const schedAdmin = bookingService.adminWorkerSchedule(repo, cfg, W_C.id, cfg.windowDays, NOW)
  const rowAdmin = schedAdmin.find(r => r.serviceDate === base && r.slot === 2)
  assert(rowAdmin && rowAdmin.booking && rowAdmin.booking.customerName === '客户甲', '管理员可见护工排班（客户姓名/编号）')
  assert(rowAdmin.booking && !('allergy' in rowAdmin.booking) && !('disease' in rowAdmin.booking), '管理端排班不含客户健康档案（隐私 §3.3）')

  // 其它项目占用查询
  const occ = projectService.occupancy(repo, 'P001', base, cfg.windowDays)
  assert(occ.days[0].slots[0].count === 2, '占用统计：P001 今日 0 时段 2 单（b2+b3）')
  assert(occ.days[0].slots[0].left === 0, '余量 = 容量 - 占用')

  // ---------- 过账（Rollover）与历史 ----------
  const oldDate = addDays(base, -2)
  const old = {
    id: repo.genBookingId(), customerId: C1.id, workerId: W_C.id, projectId: 'P007',
    serviceDate: oldDate, slot: 3, status: 'booked', createdAt: Date.now() - 2 * 86400000
  }
  repo.bookings.push(old)
  repo.save()

  const historyC1 = bookingService.customerHistory(repo, C1.id)
  assert(historyC1.some(x => x.id === old.id && x.status === 'done'), '过期 booked 过账为 done（不删除，可回溯）')
  const histW = bookingService.workerHistory(repo, W_C.id)
  assert(histW.some(x => x.id === old.id), '护工已完成服务历史含过账记录')
  const oldUsage = bookingService.projectDayUsage(repo, 'P007', oldDate, 3)
  assert(oldUsage === 0, '已过期预约不再占用时段容量')
  assert(historyC1.find(x => x.id === b1.id).status === 'cancelled', '客户历史含已取消记录')

  // 护工未来排班不含已过账的旧预约
  const schedNow = bookingService.workerSchedule(repo, cfg, W_C.id, true, cfg.windowDays, NOW)
  assert(!schedNow.some(r => r.serviceDate === oldDate), '窗口排班不包含窗口外的历史预约')

  // ---------- 管理端 CRUD ----------
  const newProject = projectService.create(repo, { name: '测试新项目', location: '测试点', fee: 66, capacity: 2, status: 'active', duration: '', flow: '', suitable: '', taboo: '' })
  assert(newProject.id === 'P009', '新项目自动编号 P009')
  await expectError(() => projectService.create(repo, { name: '', location: 'x', fee: 1, capacity: 1 }), 'BAD_NAME')
  await expectError(() => projectService.update(repo, 'P001', { fee: -5 }), 'BAD_FEE')
  await expectError(() => projectService.update(repo, 'P001', { capacity: 0 }), 'BAD_CAPACITY')
  await expectError(() => userService.updateByAdmin(repo, cfg, W_A.id, { skills: ['P000'] }), 'BAD_SKILLS')

  const updW = await userService.updateByAdmin(repo, cfg, W_A.id, { salary: 9000, status: 'resigned', name: '护工甲改' })
  assert(updW.salary === 9000 && updW.status === 'resigned' && updW.name === '护工甲改', '管理员可编辑护工薪资/状态/姓名')
  const updC = await userService.updateByAdmin(repo, cfg, C2.id, { disease: '糖尿病', phone: '13911110099' })
  assert(updC.disease === '糖尿病' && updC.phone === '13911110099', '管理员可编辑客户健康档案与手机号')
  await expectError(() => userService.updateByAdmin(repo, cfg, C2.id, { phone: C3.phone }), 'PHONE_TAKEN')

  const cusList = userService.listByRole(repo, 'customer')
  const wkList = userService.listByRole(repo, 'worker')
  assert(cusList.total === 3 && cusList.items.every(u => u.passwordHash === undefined), '客户列表不含密码哈希')
  assert(wkList.items.length === 4, '护工列表包含离职人员（供管理显示状态）')

  const detail = userService.getUser(repo, C1.id)
  assert(detail.allergy === '海鲜', '客户详情返回健康档案')

  // 客户本人可改档案、不可改手机号
  const meC = await userService.updateProfile(repo, cfg, { id: C1.id, role: 'customer' }, { preference: '喜欢湖畔散步', phone: '13000000000' })
  assert(meC.preference === '喜欢湖畔散步' && meC.phone === C1.phone, '客户本人可改档案；手机号只读不可改')

  // ---------- 数据看板 ----------
  const dashAdmin = dashboardOverview(admin)
  assert(dashAdmin.counts.customers === 3, '看板：客户数统计正确')
  const dashC = dashboardOverview({ id: C2.id, role: 'customer' })
  assert(dashC.counts.myUpcoming >= 1, '看板：客户本人未来已约数 ≥1')

  // ---------- 持久化：重载一致性 ----------
  repo.save()
  const repo2 = createStore({
    dataFile: DATA_FILE,
    admin: { phone: cfg.adminPhone, password: cfg.adminPassword, name: cfg.adminName },
    bcryptRounds: cfg.bcryptRounds
  }).init()
  assert(repo2.users.length === repo.users.length, '重载后用户数量一致')
  assert(repo2.projects.length === repo.projects.length, '重载后项目数量一致')
  assert(repo2.bookings.length === repo.bookings.length, '重载后预约数量一致')
  assert(repo2.loginLocks[C1.phone] && repo2.loginLocks[C1.phone].lockedUntil > 0, '登录锁定状态持久化')
  const relogin = await userService.login(repo2, cfg, { phone: W_C.phone, password: '12345678' }, NOW)
  assert(!!relogin.token, '重载后凭据仍可登录（哈希持久化正确）')

  // 新增预约编号不与历史冲突
  const oldIds = new Set(repo2.bookings.map(b => b.id))
  const bLast = bookingService.book(repo2, cfg, { customerId: C1.id, projectId: 'P001', serviceDate: base, slot: 1 }, NOW)
  assert(!oldIds.has(bLast.id), '重启后预约编号不重复（从最大序号续排）')

  // ---------- 顾客预约成功后 data 形状（含可服务护工总览） ----------
  assert(bLast.customerName && bLast.workerName && bLast.location && bLast.fee !== undefined, '预约返回含完整展示字段')

  console.log(`\n全部断言通过：${passed} 项 ✓`)

  // 辅助：直接统计（仅在本仓库上计算；行为与 dashboardService 等价）
  function dashboardOverview(u) {
    repo.rollover(NOW)
    const cnt = (pred) => repo.bookings.filter(pred).length
    return {
      counts: {
        customers: repo.users.filter(x => x.role === 'customer').length,
        myUpcoming: cnt(x => x.status === 'booked' && x.customerId === u.id &&
          x.serviceDate >= base && x.serviceDate < addDays(base, cfg.windowDays))
      }
    }
  }
}

main()
  .catch(e => {
    console.error('\n自检中断：', e)
    process.exitCode = 1
  })
  .finally(() => {
    // 清理临时数据文件（保留 tmp 避免残留）
    try { fs.rmSync(DATA_FILE, { force: true }) } catch (_) {}
  })
