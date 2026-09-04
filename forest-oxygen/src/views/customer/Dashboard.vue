<template>
  <div>
    <h2 class="page-title">数据看板</h2>

    <el-card shadow="never" class="welcome">
      <div class="welcome-inner">
        <div class="w-emoji">🌲</div>
        <div>
          <div class="w-title">{{ me?.name }}，欢迎回到森林氧吧</div>
          <div class="w-sub">及时预约康养项目、查看完成情况。以下为您在园区的个人服务概览（仅本人可见）。</div>
        </div>
      </div>
    </el-card>

    <StatCards :stats="statCards" />

    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-head">
          <span class="head-title"><el-icon><LocationInformation /></el-icon> 园区环境实时监测</span>
          <span class="text-secondary">（数据每 6 秒自动刷新）</span>
        </div>
      </template>
      <EnvBoard />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { DataAnalysis, Calendar, CircleCheck, Tickets } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import StatCards from '@/components/dashboard/StatCards.vue'
import EnvBoard from '@/components/dashboard/EnvBoard.vue'

const auth = useAuthStore()
const me = computed(() => auth.profile)
const counts = ref({})

const statCards = computed(() => [
  { label: '可选康养项目', value: counts.value.projectsActive ?? 0, icon: DataAnalysis, bg: '#e6f1fb', color: '#2a6fb6' },
  { label: '未来三天已约', value: counts.value.myUpcoming ?? 0, icon: Calendar, bg: '#e8f5ee', color: '#2d6a4f' },
  { label: '已完成服务', value: counts.value.myDone ?? 0, icon: CircleCheck, bg: '#f0ecfd', color: '#6a4fc0' },
  { label: '累计预约', value: counts.value.myTotal ?? 0, icon: Tickets, bg: '#fde8ee', color: '#d0437b' }
])

onMounted(async () => {
  try {
    const data = await api.dashboard()
    counts.value = data.counts || {}
  } catch (e) {
    ElMessage.error(e.message || '看板加载失败')
  }
})
</script>

<style scoped>
.welcome {
  border-radius: 14px;
  margin-bottom: 18px;
  background: linear-gradient(120deg, #e8f5ee, #f2fbf6);
  border: 1px solid #cfe3d7;
}
.welcome-inner {
  display: flex;
  gap: 16px;
  align-items: center;
}
.w-emoji {
  font-size: 44px;
}
.w-title {
  font-size: 21px;
  font-weight: 800;
  color: #2d6a4f;
}
.w-sub {
  margin-top: 4px;
  color: #5f776c;
  font-size: 15px;
}
.block-card {
  margin-top: 18px;
  border-radius: 14px;
}
.card-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.head-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d6a4f;
}
</style>
