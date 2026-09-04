// ===== 各角色顶部导航配置 =====
import {
  DataBoard, User, UserFilled, List, Calendar, Tickets, ChatDotRound
} from '@element-plus/icons-vue'

export const ROLE_MENUS = {
  admin: [
    { to: '/admin/dashboard', label: '数据看板', icon: DataBoard },
    { to: '/admin/clients', label: '客户管理', icon: User },
    { to: '/admin/workers', label: '护工管理', icon: UserFilled },
    { to: '/admin/projects', label: '项目管理', icon: List }
  ],
  worker: [
    { to: '/worker/profile', label: '个人中心', icon: User },
    { to: '/worker/schedule', label: '服务时间状态', icon: Calendar },
    { to: '/worker/projects', label: '项目总览', icon: Tickets }
  ],
  customer: [
    { to: '/customer/profile', label: '个人中心', icon: User },
    { to: '/customer/dashboard', label: '数据看板', icon: DataBoard },
    { to: '/customer/my-projects', label: '我的项目', icon: Calendar },
    { to: '/customer/projects', label: '项目总览', icon: Tickets },
    { to: '/customer/ai-consult', label: 'AI咨询', icon: ChatDotRound }
  ]
}

// 角色默认落地页
export const HOME_PATH = {
  admin: '/admin/dashboard',
  worker: '/worker/profile',
  customer: '/customer/dashboard'
}
