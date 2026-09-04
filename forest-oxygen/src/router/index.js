import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { HOME_PATH } from './menus'

import RoleLayout from '@/layout/RoleLayout.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'

// 管理员模块
import AdminDashboard from '@/views/admin/Dashboard.vue'
import AdminClients from '@/views/admin/Clients.vue'
import AdminWorkers from '@/views/admin/Workers.vue'
import WorkerSchedule from '@/views/admin/WorkerSchedule.vue'
import AdminProjects from '@/views/admin/Projects.vue'
import ProjectForm from '@/views/admin/ProjectForm.vue'
import ProjectDetail from '@/views/common/ProjectDetail.vue'

// 护工模块
import WorkerProfile from '@/views/worker/Profile.vue'
import WorkerService from '@/views/worker/ServiceTime.vue'
import WorkerProjects from '@/views/worker/Projects.vue'

// 客户模块
import CustomerProfile from '@/views/customer/Profile.vue'
import CustomerDashboard from '@/views/customer/Dashboard.vue'
import CustomerMyProjects from '@/views/customer/MyProjects.vue'
import CustomerProjects from '@/views/customer/Projects.vue'
import AiConsult from '@/views/customer/AiConsult.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },

  {
    path: '/admin',
    component: RoleLayout,
    meta: { auth: true, roles: ['admin'] },
    redirect: HOME_PATH.admin,
    children: [
      { path: 'dashboard', name: 'admin-dashboard', component: AdminDashboard },
      { path: 'clients', name: 'admin-clients', component: AdminClients },
      { path: 'workers', name: 'admin-workers', component: AdminWorkers },
      { path: 'workers/:id/schedule', name: 'admin-worker-schedule', component: WorkerSchedule },
      { path: 'projects', name: 'admin-projects', component: AdminProjects },
      { path: 'projects/new', name: 'admin-project-new', component: ProjectForm },
      { path: 'projects/:id/edit', name: 'admin-project-edit', component: ProjectForm },
      { path: 'projects/:id', name: 'admin-project-view', component: ProjectDetail }
    ]
  },
  {
    path: '/worker',
    component: RoleLayout,
    meta: { auth: true, roles: ['worker'] },
    redirect: HOME_PATH.worker,
    children: [
      { path: 'profile', name: 'worker-profile', component: WorkerProfile },
      { path: 'schedule', name: 'worker-schedule', component: WorkerService },
      { path: 'projects', name: 'worker-projects', component: WorkerProjects },
      { path: 'projects/:id', name: 'worker-project-view', component: ProjectDetail }
    ]
  },
  {
    path: '/customer',
    component: RoleLayout,
    meta: { auth: true, roles: ['customer'] },
    redirect: HOME_PATH.customer,
    children: [
      { path: 'profile', name: 'customer-profile', component: CustomerProfile },
      { path: 'dashboard', name: 'customer-dashboard', component: CustomerDashboard },
      { path: 'my-projects', name: 'customer-my-projects', component: CustomerMyProjects },
      { path: 'projects', name: 'customer-projects', component: CustomerProjects },
      { path: 'projects/:id', name: 'customer-project-view', component: ProjectDetail },
      { path: 'ai-consult', name: 'customer-ai', component: AiConsult }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  // 已登录访问登录/注册页 → 直接回到角色主页
  if ((to.path === '/login' || to.path === '/register') && auth.isLoggedIn) {
    return HOME_PATH[auth.role] || '/login'
  }

  if (to.meta.auth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (to.meta.roles && auth.isLoggedIn && !to.meta.roles.includes(auth.role)) {
    // 越权访问 → 回到本人角色主页
    return HOME_PATH[auth.role] || '/login'
  }
  return true
})

export default router
