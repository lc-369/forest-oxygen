<template>
  <div class="role-layout">
    <!-- ===== 全局顶部标题栏 ===== -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="brand-logo">🌲</span>
        <span class="brand-name">森林氧吧 · AI智慧康养</span>
        <el-button
          class="map-btn"
          :type="showMap ? 'primary' : 'default'"
          size="large"
          round
          @click="showMap = !showMap"
        >
          <el-icon style="margin-right: 6px"><Location /></el-icon>
          园区地图
        </el-button>
      </div>
      <div class="topbar-right">
        <span class="top-date">{{ todayText }}</span>
        <el-tag :type="auth.roleTag" effect="light" round>{{ auth.roleLabel }}</el-tag>
        <span class="username">{{ auth.profile?.name }}</span>
        <el-button type="danger" size="large" plain round @click="handleLogout">
          <el-icon style="margin-right: 6px"><SwitchButton /></el-icon>退出登录
        </el-button>
      </div>
    </header>

    <!-- ===== 园区地图（展开/收起） ===== -->
    <transition name="fold">
      <div v-if="showMap" class="map-area">
        <img :src="mapImg" alt="森林氧吧园区导览地图" class="map-img" />
        <p class="map-tip">园区导览地图（示意图）· 点击右上角「园区地图」可收起</p>
      </div>
    </transition>

    <!-- ===== 顶部导航 ===== -->
    <nav class="role-nav">
      <el-menu mode="horizontal" :default-active="route.path" :router="true" :ellipsis="false">
        <el-menu-item v-for="m in menus" :key="m.to" :index="m.to">
          <el-icon><component :is="m.icon" /></el-icon>
          <span class="nav-label">{{ m.label }}</span>
        </el-menu-item>
      </el-menu>
    </nav>

    <!-- ===== 内容区 ===== -->
    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </router-view>
    </main>

    <footer class="layout-footer">森林氧吧 · AI智慧康养系统 &nbsp;|&nbsp; 数据经后端服务统一存储 · 密码加密 · 按角色权限访问</footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { ROLE_MENUS, HOME_PATH } from '@/router/menus'
import { dayText } from '@/utils/dates'
import mapImg from '@/assets/map.svg'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const showMap = ref(false)
const menus = computed(() => ROLE_MENUS[auth.role] || [])
const todayText = computed(() => dayText(0))

// 进入角色布局时刷新本人资料（姓名/角色信息以服务端为准）
onMounted(() => {
  if (auth.isLoggedIn) auth.loadProfile()
})

function handleLogout() {
  ElMessageBox.confirm('确定要退出当前账号吗？', '退出登录', {
    confirmButtonText: '退出', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    auth.logout()
    ElMessage.success('已安全退出')
    router.push('/login')
  }).catch(() => {})
}

// 会话超时：30 分钟无操作自动退出
let timer = null
function resetTimer() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (auth.isLoggedIn) {
      ElMessage.warning('长时间未操作，已自动退出登录')
      auth.logout()
      router.replace('/login')
    }
  }, 30 * 60 * 1000)
}
const events = ['click', 'keydown', 'mousemove', 'scroll']
events.forEach(ev => document.addEventListener(ev, resetTimer, { passive: true }))
resetTimer()

// 组件卸载时移除全局监听与定时器，避免开发热更/退出残留
onBeforeUnmount(() => {
  events.forEach(ev => document.removeEventListener(ev, resetTimer))
  clearTimeout(timer)
})
</script>

<style scoped>
.role-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f2ea; /* 米白页面底色 */
}
/* 顶部栏 */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  height: 68px;
  /* 墨绿主渐变 + 右上金色柔光点缀 */
  background:
    radial-gradient(880px 160px at 84% -40px, rgba(201, 162, 75, 0.38), transparent 62%),
    linear-gradient(92deg, #183a2b 0%, #24513d 50%, #35644b 100%);
  color: #fff;
  box-shadow: 0 2px 12px rgba(24, 40, 30, 0.28);
  border-bottom: 1px solid rgba(201, 162, 75, 0.35);
  z-index: 5;
}
.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  font-size: 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(233, 205, 140, 0.55);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 2px 6px rgba(0, 0, 0, 0.18);
  border-radius: 14px;
}
.brand-name {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.map-btn {
  margin-left: 10px;
  --el-button-bg-color: rgba(255, 255, 255, 0.16);
  --el-button-text-color: #fff;
  --el-button-border-color: rgba(255, 255, 255, 0.4);
}
.topbar-right .username {
  font-size: 17px;
  font-weight: 600;
}
.top-date {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 4px 12px;
  border-radius: 999px;
  white-space: nowrap;
}
/* 地图区 */
.map-area {
  background: #fff;
  border-bottom: 1px solid #e9e2d5;
  padding: 14px 24px;
  text-align: center;
}
.map-img {
  max-width: 760px;
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
.map-tip {
  margin-top: 8px;
  color: #5f7368;
  font-size: 14px;
}
.fold-enter-active,
.fold-leave-active {
  transition: all 0.3s ease;
}
.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
/* 导航 */
.role-nav {
  background: #fbf8f1;
  border-bottom: 1px solid #e9e2d5;
  padding: 0 24px;
}
.role-nav :deep(.el-menu--horizontal) {
  border-bottom: none;
}
.role-nav :deep(.el-menu) {
  background: transparent;
  --el-menu-hover-bg-color: #efe8da;
}
.role-nav :deep(.el-menu-item) {
  font-size: 17px;
  height: 58px;
  line-height: 58px;
}
.role-nav :deep(.el-menu-item.is-active) {
  font-weight: 700;
}
.nav-label {
  margin-left: 6px;
}
/* 内容 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 22px clamp(14px, 3vw, 40px) 30px;
}
.layout-footer {
  text-align: center;
  color: #8a7f6a;
  font-size: 13px;
  padding: 8px 0;
  background: #efe8db;
}
@media (max-width: 1280px) {
  .brand-name {
    font-size: 18px;
  }
  .top-date {
    display: none;
  }
}
</style>
