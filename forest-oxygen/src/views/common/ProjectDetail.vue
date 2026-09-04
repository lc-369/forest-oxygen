<template>
  <div v-loading="loading" v-if="project">
    <div class="head-row">
      <el-button size="large" @click="router.back()">
        <el-icon style="margin-right: 6px"><Back /></el-icon>返回
      </el-button>
      <h2 class="page-title" style="margin-bottom: 0">{{ project.name }}</h2>
      <el-tag :type="project.status === 'active' ? 'success' : 'info'" size="large" effect="dark">
        {{ project.status === 'active' ? '进行中' : '已停用' }}
      </el-tag>
    </div>

    <!-- 基本信息 -->
    <el-card shadow="never" class="panel">
      <div class="info-grid">
        <div class="info-item"><span class="k">项目编号</span><span class="v">{{ project.id }}</span></div>
        <div class="info-item"><span class="k">项目地点</span><span class="v">{{ project.location }}</span></div>
        <div class="info-item"><span class="k">单次时长</span><span class="v">{{ project.duration }}</span></div>
        <div class="info-item"><span class="k">费用</span><span class="v">¥ {{ project.fee }} / 次</span></div>
        <div class="info-item"><span class="k">时段最大容量</span><span class="v">{{ project.capacity }} 人</span></div>
      </div>
    </el-card>

    <!-- 详细描述 -->
    <el-card shadow="never" class="panel">
      <template #header><span class="head-title">服务详情</span></template>
      <div class="detail-block">
        <p class="detail-label">📋 服务流程</p>
        <p class="detail-text">{{ project.flow || '暂无' }}</p>
      </div>
      <div class="detail-block">
        <p class="detail-label">👤 适合人群</p>
        <p class="detail-text">{{ project.suitable || '暂无' }}</p>
      </div>
      <div class="detail-block">
        <p class="detail-label">⚠️ 禁忌事项</p>
        <p class="detail-text">{{ project.taboo || '暂无' }}</p>
      </div>
    </el-card>

    <!-- 时段预约/容量 -->
    <el-card shadow="never" class="panel">
      <template #header><span class="head-title">时段预约情况（今 / 明 / 后天 × 4 时段）</span></template>
      <el-row :gutter="16">
        <el-col v-for="d in DAYS" :key="d.day" :md="8" :sm="24" class="day-col">
          <div class="day-title">{{ d.label }} · {{ dayText(d.day) }}</div>
          <div v-for="row in rowsOf(d.day)" :key="row.slot" class="occu-row">
            <span class="occu-time">{{ SLOT_TITLE[row.slot] }}<span class="time-mini">{{ SLOT_TIME[row.slot] }}</span></span>
            <el-progress
              class="occu-bar"
              :percentage="row.ratio"
              :color="row.ratio >= 100 ? '#e4572e' : '#52b788'"
              :stroke-width="16"
              :format="() => `${row.count}/${row.capacity}`"
            />
          </div>
        </el-col>
      </el-row>
      <el-alert
        v-if="project.status === 'disabled'"
        type="info" :closable="false" show-icon title="该项目已停用，暂不可预约。" style="margin-top: 16px"
      />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { DAYS, SLOT_TITLE, SLOT_TIME } from '@/utils/config'
import { dayText, serviceDateOf } from '@/utils/dates'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const project = ref(null)
// occupancy.days：[{serviceDate, slots:[{slot,count,capacity,left,available}]}]
const occDays = ref([])

async function load() {
  loading.value = true
  try {
    const data = await api.occupancy(route.params.id, { days: 3 })
    project.value = data.project
    occDays.value = data.days
  } catch (e) {
    ElMessage.error(e.message || '项目信息加载失败')
    router.back()
  } finally {
    loading.value = false
  }
}

function rowsOf(day) {
  const sd = serviceDateOf(day)
  const entry = occDays.value.find(d => d.serviceDate === sd)
  if (!entry) return []
  return entry.slots.map(s => {
    const cap = s.capacity || 1
    return {
      slot: s.slot,
      count: s.count,
      capacity: cap,
      ratio: Math.min(100, Math.round((s.count / cap) * 100))
    }
  })
}

onMounted(load)
</script>

<style scoped>
.head-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.panel {
  border-radius: 14px;
  margin-bottom: 16px;
}
.head-title {
  font-size: 17px;
  font-weight: 700;
  color: #2d6a4f;
}
.detail-block {
  margin-bottom: 14px;
}
.detail-label {
  font-weight: 700;
  color: #2d6a4f;
  margin-bottom: 6px;
}
.detail-text {
  line-height: 1.8;
  color: #3d4f47;
  background: #f7faf8;
  border-radius: 10px;
  padding: 12px 14px;
}
.day-col {
  margin-bottom: 18px;
}
.day-title {
  font-weight: 700;
  color: #2d6a4f;
  margin-bottom: 10px;
  font-size: 16px;
}
.occu-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.occu-time {
  width: 120px;
  font-size: 15px;
  flex-shrink: 0;
}
.time-mini {
  display: block;
  color: #7a8a83;
  font-size: 12px;
}
.occu-bar {
  flex: 1;
}
</style>
