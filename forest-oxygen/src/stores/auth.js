import { defineStore } from 'pinia'
import { api } from '@/api'
import { getToken, setSession, clearSession, restoredAuth } from '@/api/http'
import { ROLE_META } from '@/utils/config'

export const useAuthStore = defineStore('auth', {
  state: () => {
    const snap = restoredAuth()
    return {
      token: getToken(),
      id: snap.id || '',
      role: snap.role || '',
      /** 当前登录人完整资料（登录成功/进入布局后从 /me 拉取） */
      user: null,
      loadingProfile: false
    }
  },

  getters: {
    isLoggedIn: s => !!s.token && !!s.id,
    /** 兼容旧模板：profile 即缓存的本人资料 */
    profile: s => s.user,
    roleLabel() {
      return ROLE_META[this.role]?.label || ''
    },
    roleTag() {
      return ROLE_META[this.role]?.tag || 'info'
    }
  },

  actions: {
    /** 登录：后端签发 JWT + 返回用户资料 */
    async login(phone, password) {
      const data = await api.login(phone, password) // {token, user}
      this.token = data.token
      this.id = data.user.id
      this.role = data.user.role
      this.user = data.user
      setSession(data.token, data.user)
      return data.user
    },

    /** 注册（role ∈ worker/customer），成功后回到登录页由用户登录 */
    async register(payload) {
      const data = await api.register(payload) // {id, user}
      return data.user
    },

    /** 拉取本人资料（进入角色布局 / 手工刷新时调用） */
    async loadProfile() {
      if (!this.isLoggedIn) return null
      this.loadingProfile = true
      try {
        const user = await api.me()
        this.user = user
        this.id = user.id
        this.role = user.role
        return user
      } catch (e) {
        // 401 已由请求层统一清理会话；此处兜底清理本地状态
        if (e.status === 401) this.logout(true)
        return null
      } finally {
        this.loadingProfile = false
      }
    },

    /** 更新本人资料（客户健康档案 / 改密等），同步本地缓存 */
    async updateProfile(payload) {
      const user = await api.updateMe(payload)
      this.user = user
      return user
    },

    logout(silent = false) {
      this.token = ''
      this.id = ''
      this.role = ''
      this.user = null
      clearSession()
      if (!silent) { /* 由调用方负责跳转 */ }
    }
  }
})
