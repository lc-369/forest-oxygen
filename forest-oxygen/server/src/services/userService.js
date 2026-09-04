// ===== 用户/认证服务 =====
// 覆盖：注册、登录（含失败锁定 §3.3）、管理员新增/编辑/状态切换、本人资料更新、改密。
// 密码一律 bcrypt 哈希存储（服务端不落盘明文）。
import bcrypt from 'bcryptjs'
import { HttpError, badRequest, notFound, unauthorized } from '../utils/errors.js'
import { signToken } from '../utils/token.js'
import {
  normAge, normPhone, normPassword, normGender, normName, normRoleIn,
  ROLES_REGISTRABLE
} from '../utils/validate.js'

// ---------- 工具 ----------
export const hashPassword = (pwd, cfg) => bcrypt.hash(pwd, cfg.bcryptRounds)

/** 去掉敏感字段，供接口返回；字段随角色带上对应扩展信息 */
function publicUser(u) {
  if (!u) return null
  const { passwordHash, ...safe } = u
  return safe
}

/** 编号精确查询，缺失抛 404 */
function findOrThrow(repo, id, role) {
  const u = repo.users.find(x => x.id === id && (!role || x.role === role))
  if (!u) {
    throw notFound(role ? `${role === 'worker' ? '护工' : role === 'customer' ? '客户' : '用户'}不存在` : '用户不存在')
  }
  return u
}

/** 校验 skills 为项目编号数组且均真实存在（护工可服务项目） */
function normSkills(repo, raw) {
  if (raw === undefined || raw === null || raw === '') return []
  const list = Array.isArray(raw) ? raw : String(raw).split(/[,，、\s]+/).filter(Boolean)
  const ids = [...new Set(list.map(x => String(x).trim().toUpperCase()).filter(Boolean))]
  const exist = new Set(repo.projects.map(p => p.id))
  for (const id of ids) {
    if (!exist.has(id)) throw badRequest('BAD_SKILLS', `可服务项目不存在：${id}`)
  }
  return ids
}

/** 管理员 / 注册侧构造用户字段（按角色白名单） */
function roleFields(repo, payload, role) {
  const base = { gender: normGender(payload.gender), age: normAge(payload.age) }
  if (role === 'worker') {
    return {
      ...base,
      salary: Math.max(0, Math.round(Number(payload.salary) || 0)),
      status: 'active',
      skills: normSkills(repo, payload.skills)
    }
  }
  if (role === 'customer') {
    return {
      ...base,
      allergy: String(payload.allergy || '').trim(),
      disease: String(payload.disease || '').trim(),
      preference: String(payload.preference || '').trim()
    }
  }
  return { ...base }
}

/** 名字兼容 name/nickname 两种提交 */
const pickName = payload => normName(payload.name !== undefined ? payload.name : payload.nickname)

/** 号码唯一性检查（updatingId 提供时排除自身） */
function assertPhoneUnique(repo, phone, updatingId) {
  if (repo.users.some(u => u.phone === phone && u.id !== updatingId)) {
    throw new HttpError(409, 'PHONE_TAKEN', '该手机号已被注册')
  }
}

export const userService = {
  // ================= 认证 =================

  /** 登录（可注入 now 以便自检模拟时间） */
  async login(repo, cfg, { phone, password }, now = new Date()) {
    const p = normPhone(phone)
    const nowMs = now.getTime()
    const rec = repo.loginLocks[p] || { count: 0, lockedUntil: 0 }

    if (rec.lockedUntil > nowMs) {
      const minutes = Math.max(1, Math.ceil((rec.lockedUntil - nowMs) / 60000))
      throw new HttpError(429, 'ACCOUNT_LOCKED', `尝试次数过多，账号已锁定，请 ${minutes} 分钟后再试`)
    }

    const user = repo.users.find(u => u.phone === p)
    if (!user) {
      this._recordFail(repo, cfg, p, nowMs)
      throw new HttpError(401, 'PHONE_NOT_REGISTERED', '该手机号尚未注册')
    }
    if (user.role === 'worker' && user.status === 'resigned') {
      throw new HttpError(401, 'WORKER_RESIGNED', '该护工已离职，无法登录，请联系管理员')
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      const fail = this._recordFail(repo, cfg, p, nowMs)
      const extra = fail.locked ? '（已达上限，账号将锁定）' : `（还可尝试 ${fail.remaining} 次）`
      throw new HttpError(401, 'WRONG_PASSWORD', `密码错误${extra}`)
    }

    // 成功：清除失败记录
    if (repo.loginLocks[p]) {
      delete repo.loginLocks[p]
      repo.save()
    }
    const token = signToken(cfg, user)
    return { token, user: publicUser(user) }
  },

  /** 记录一次失败；达到阈值锁定 lockMinutes 分钟 */
  _recordFail(repo, cfg, phone, nowMs) {
    const rec = repo.loginLocks[phone] || { count: 0, lockedUntil: 0 }
    rec.count = (rec.count || 0) + 1
    if (rec.count >= cfg.maxFails) {
      rec.lockedUntil = nowMs + cfg.lockMinutes * 60 * 1000
      rec.count = 0
    }
    repo.loginLocks[phone] = rec
    repo.save()
    return {
      locked: rec.lockedUntil > nowMs,
      remaining: Math.max(0, cfg.maxFails - rec.count)
    }
  },

  /** 注册（role ∈ 客户/护工） */
  async register(repo, cfg, payload) {
    const role = normRoleIn(ROLES_REGISTRABLE, payload.role)
    const phone = normPhone(payload.phone)
    const pwd = normPassword(payload.password)
    const name = pickName(payload)
    assertPhoneUnique(repo, phone)
    const extra = roleFields(repo, payload, role)

    const hash = await hashPassword(pwd, cfg)
    // 双检防并发重复注册：await 之后再次核对
    assertPhoneUnique(repo, phone)
    const id = repo.genUserId(role)
    const user = {
      id, role, phone, passwordHash: hash, name,
      ...extra, createdAt: Date.now()
    }
    repo.users.push(user)
    repo.save()
    return { id, user: publicUser(user) }
  },

  /** 管理员新增客户/护工账号（密码缺省 12345678，须 8 位数字） */
  async createByAdmin(repo, cfg, payload) {
    const role = normRoleIn(ROLES_REGISTRABLE, payload.role)
    const phone = normPhone(payload.phone)
    const pwd = normPassword(payload.password == null || payload.password === '' ? '12345678' : payload.password)
    const name = pickName(payload)
    assertPhoneUnique(repo, phone)
    const extra = roleFields(repo, payload, role)

    const hash = await hashPassword(pwd, cfg)
    assertPhoneUnique(repo, phone)
    const id = repo.genUserId(role)
    const user = {
      id, role, phone, passwordHash: hash, name,
      ...extra, createdAt: Date.now()
    }
    repo.users.push(user)
    repo.save()
    return { id, user: publicUser(user) }
  },

  // ================= 管理员视图 =================

  /** 按角色列出全部用户（安全字段外带扩展字段） */
  listByRole(repo, role) {
    const list = repo.users
      .filter(u => u.role === role)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map(publicUser)
    return { total: list.length, items: list }
  },

  getUser(repo, id, expectedRole) {
    return publicUser(findOrThrow(repo, id, expectedRole))
  },

  /** 管理员编辑用户（角色白名单字段；可改手机号/重置密码/护工状态与技能薪资） */
  async updateByAdmin(repo, cfg, id, patch) {
    const target = findOrThrow(repo, id)

    if (patch.password != null && patch.password !== '') {
      target.passwordHash = await hashPassword(normPassword(patch.password, '新密码'), cfg)
    }
    if (patch.phone != null) {
      const p = normPhone(patch.phone)
      assertPhoneUnique(repo, p, id)
      target.phone = p
    }
    if (patch.name != null) target.name = normName(patch.name)
    if (patch.gender != null) target.gender = normGender(patch.gender)
    if (patch.age != null) target.age = normAge(patch.age)

    if (target.role === 'worker') {
      if (patch.status != null) {
        if (!['active', 'resigned'].includes(patch.status)) {
          throw badRequest('BAD_STATUS', '状态仅支持 active / resigned')
        }
        target.status = patch.status
      }
      if (patch.salary != null) target.salary = Math.max(0, Math.round(Number(patch.salary) || 0))
      if (patch.skills != null) target.skills = normSkills(repo, patch.skills)
    } else if (target.role === 'customer') {
      if (patch.allergy != null) target.allergy = String(patch.allergy).trim()
      if (patch.disease != null) target.disease = String(patch.disease).trim()
      if (patch.preference != null) target.preference = String(patch.preference).trim()
    }

    repo.save()
    return publicUser(target)
  },

  /** 护工在职/离职快速切换 */
  async setWorkerStatus(repo, cfg, id, status) {
    return userService.updateByAdmin(repo, cfg, id, { status })
  },

  // ================= 本人 =================

  me(repo, authUser) {
    return publicUser(findOrThrow(repo, authUser.id))
  },

  /** 本人资料更新：客户可改健康档案字段；护工个人中心只读；均可改密码 */
  async updateProfile(repo, cfg, authUser, patch) {
    const u = findOrThrow(repo, authUser.id)
    let changed = false

    if (patch.oldPassword != null || patch.newPassword != null) {
      if (!patch.oldPassword || !patch.newPassword) {
        throw badRequest('BAD_PASSWORD', '请同时填写原密码与新密码')
      }
      const oldOk = await bcrypt.compare(patch.oldPassword, u.passwordHash)
      if (!oldOk) throw new HttpError(400, 'OLD_PASSWORD_WRONG', '原密码不正确')
      const next = normPassword(patch.newPassword, '新密码')
      if (next === String(patch.oldPassword)) {
        throw badRequest('BAD_PASSWORD', '新密码不能与原密码相同')
      }
      u.passwordHash = await hashPassword(next, cfg)
      changed = true
    }

    if (u.role === 'customer') {
      if (patch.name != null) { u.name = normName(patch.name); changed = true }
      if (patch.gender != null) { u.gender = normGender(patch.gender); changed = true }
      if (patch.age != null) { u.age = normAge(patch.age); changed = true }
      if (patch.allergy != null) { u.allergy = String(patch.allergy).trim(); changed = true }
      if (patch.disease != null) { u.disease = String(patch.disease).trim(); changed = true }
      if (patch.preference != null) { u.preference = String(patch.preference).trim(); changed = true }
    } else if (u.role === 'admin') {
      if (patch.name != null) { u.name = normName(patch.name); changed = true }
      if (patch.gender != null) { u.gender = normGender(patch.gender); changed = true }
    }
    // 护工：个人中心字段只读，仅允许改密码
    if (changed) repo.save()
    return publicUser(u)
  },

  /** 按手机号查询（供演示账号提示等，管理端使用） */
  findByPhone(repo, phone) {
    return repo.users.find(u => u.phone === phone) || null
  }
}

export { publicUser }
