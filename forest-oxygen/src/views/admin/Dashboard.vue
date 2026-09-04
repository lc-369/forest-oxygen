<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title" style="margin-bottom: 4px">数据看板</h2>
        <div class="text-secondary">{{ todayText }} · 园区运营概况一览，数据与服务端实时联动</div>
      </div>
      <div class="head-actions">
        <el-tag type="success" effect="plain" size="large">
          <el-icon style="margin-right: 4px"><Refresh /></el-icon>自动过账
        </el-tag>
        <el-button size="large" :loading="loading" @click="load">
          <el-icon style="margin-right: 6px"><RefreshLeft /></el-icon>刷新
        </el-button>
      </div>
    </div>

    <StatCards :stats="statCards" />

    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-head">
          <span class="head-title"><el-icon><Calendar /></el-icon> 近期待服务预约</span>
          <span class="text-secondary">共 {{ upcoming.length }} 条已预约</span>
        </div>
      </template>
      <el-table v-loading="loading" :data="upcoming" stripe style="width: 100%">
        <el-table-column label="日期" width="110">
          <template #default="{ row }">
            <el-tag size="large" type="primary" effect="plain">{{ dateTag(row.serviceDate) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时段" width="180">
          <template #default="{ row }">
            {{ SLOT_TITLE[row.slot] }} {{ SLOT_TIME[row.slot] }}
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" min-width="110" />
        <el-table-column prop="projectName" label="服务项目" min-width="160" show-overflow-tooltip />
        <el-table-column label="负责护工" min-width="160">
          <template #default="{ row }">{{ row.workerName }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!upcoming.length" description="暂无预约" :image-size="80" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { User, UserFilled, List, Tickets } from '@element-plus/icons-vue'
import { api } from '@/api'
import { DAYS, SLOT_TITLE, SLOT_TIME } from '@/utils/config'
import { dayText, dayIndexOf } from '@/utils/dates'
import StatCards from '@/components/dashboard/StatCards.vue'

const todayText = computed(() => dayText(0))

const loading = ref(false)
const counts = ref({})
const upcoming = ref([])

const statCards = computed(() => [
  { label: '客户总数', value: counts.value.customers ?? 0, icon: User, bg: '#e8f5ee', color: '#2d6a4f' },
  { label: '在职护工', value: counts.value.workersActive ?? 0, icon: UserFilled, bg: '#e6f1fb', color: '#2a6fb6' },
  { label: '进行中项目', value: counts.value.projectsActive ?? 0, icon: List, bg: '#fdf1e3', color: '#c07a1f' },
  { label: '近三天已预约', value: counts.value.windowBooked ?? 0, icon: Tickets, bg: '#fde8ee', color: '#d0437b' }
])

/** 由绝对日期推断“今/明/后天”标签；超出窗口回退显示日期 */
function dateTag(serviceDate) {
  const idx = dayIndexOf(serviceDate, 3)
  return idx >= 0 ? DAYS[idx].label : serviceDate
}

async function load() {
  loading.value = true
  try {
    const data = await api.dashboard() // 仅 admin/customer 可访问，此处为 admin
    counts.value = data.counts || {}
    upcoming.value = data.upcoming || []
  } catch (e) {
    ElMessage.error(e.message || '看板加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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
