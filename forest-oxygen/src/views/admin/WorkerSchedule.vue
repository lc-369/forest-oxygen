<template>
  <div v-loading="loading">
    <div v-if="worker" class="content-wrap">
      <div class="head-row">
        <el-button size="large" @click="router.back()">
          <el-icon style="margin-right: 6px"><Back /></el-icon>返回
        </el-button>
        <h2 class="page-title" style="margin-bottom: 0">护工排班 · {{ worker.name }}</h2>
      </div>

      <!-- 基本信息 -->
      <el-card shadow="never" class="panel">
        <div class="info-grid">
          <div class="info-item"><span class="k">工号</span><span class="v">{{ worker.id }}</span></div>
          <div class="info-item"><span class="k">姓名</span><span class="v">{{ worker.name }}</span></div>
          <div class="info-item"><span class="k">性别</span><span class="v">{{ worker.gender }}</span></div>
          <div class="info-item"><span class="k">年龄</span><span class="v">{{ worker.age }} 岁</span></div>
          <div class="info-item"><span class="k">手机</span><span class="v">{{ worker.phone }}</span></div>
          <div class="info-item"><span class="k">薪资</span><span class="v">¥ {{ worker.salary }} / 月</span></div>
          <div class="info-item wide"><span class="k">可服务项目</span>
            <span class="v">
              <el-tag v-for="pid in worker.skills" :key="pid" effect="plain" class="skill-tag">{{ projectName(pid) }}</el-tag>
            </span>
          </div>
          <div class="info-item"><span class="k">在职状态</span>
            <span class="v">
              <el-tag :type="worker.status === 'active' ? 'success' : 'info'">{{ worker.status === 'active' ? '在职' : '离职' }}</el-tag>
            </span>
          </div>
        </div>
        <el-alert
          v-if="worker.status === 'resigned'"
          type="warning" :closable="false" show-icon
          title="该护工已离职，系统不会再为其自动分配新服务。"
          style="margin-top: 14px"
        />
        <el-alert
          type="info" :closable="false" show-icon
          title="以下为今 / 明 / 后天三个日期 × 每日 4 个时段的服务安排，由系统预约时自动排班，不可人工更改。按隐私约定，本页仅展示客户姓名与编号，健康档案仅当值护工本人可见。"
          style="margin-top: 14px"
        />
      </el-card>

      <!-- 按时段的服务安排 -->
      <el-card v-for="d in DAYS" :key="d.day" shadow="never" class="panel" :header="`${d.label}（${dayText(d.day)}）`">
        <el-table :data="rowsOf(d.day)" size="large" empty-text="本日无安排">
          <el-table-column label="时段" width="200">
            <template #default="{ row }">{{ SLOT_TITLE[row.slot] }}<span class="time-mini">{{ SLOT_TIME[row.slot] }}</span></template>
          </el-table-column>
          <el-table-column label="服务安排" min-width="300">
            <template #default="{ row }">
              <template v-if="row.booking">
                <el-tag type="success" size="large">服务中</el-tag>
                <span class="cell-text">
                  {{ row.booking.projectName }} · 客户：{{ row.booking.customerName }}（{{ row.booking.customerId }}）
                </span>
              </template>
              <template v-else>
                <el-tag type="info" effect="plain" size="large">空闲</el-tag>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="预约单号" width="160">
            <template #default="{ row }">
              <span v-if="row.booking">{{ row.booking.id }}</span>
              <span v-else class="text-secondary">—</span>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
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
const worker = ref(null)
// cells：{serviceDate, slot, booking:{id,customerId,customerName,projectId,projectName}|null}
const cells = ref([])
const projMap = ref({})

async function load() {
  loading.value = true
  try {
    const data = await api.workerSchedule(route.params.id, 3)
    worker.value = data.worker
    cells.value = data.cells || []
    const pu = await api.projects()
    const map = {}
    ;(pu.items || []).forEach(p => { map[p.id] = p.name })
    projMap.value = map
  } catch (e) {
    ElMessage.error(e.message || '排班信息加载失败')
    router.back()
  } finally {
    loading.value = false
  }
}

function projectName(pid) {
  return projMap.value[pid] || pid
}

function rowsOf(day) {
  const sd = serviceDateOf(day)
  return cells.value
    .filter(c => c.serviceDate === sd)
    .sort((a, b) => a.slot - b.slot)
    .map(c => ({ slot: c.slot, booking: c.booking }))
}

onMounted(load)
</script>

<style scoped>
.content-wrap {
  min-height: 40vh;
}
.head-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.panel {
  border-radius: 14px;
  margin-top: 16px;
}
.info-grid .wide {
  grid-column: span 2;
}
.skill-tag {
  margin: 2px 6px 2px 0;
}
.time-mini {
  margin-left: 8px;
  color: #7a8a83;
  font-size: 14px;
}
.cell-text {
  margin-left: 8px;
}
</style>
