<template>
  <div>
    <h2 class="page-title">我的服务时间状态</h2>
    <p class="text-secondary" style="margin-bottom: 16px">
      排班由系统根据客户预约自动分配，护工不可更改。服务前请查看客户的忌口与健康状况。
    </p>

    <el-card v-loading="loading" v-for="d in DAYS" :key="d.day" shadow="never" class="panel" :header="`${d.label} · ${dayText(d.day)}`">
      <div v-for="row in rowsOf(d.day)" :key="row.slot" class="time-row">
        <div class="time-col">
          <div class="slot-title">{{ SLOT_TITLE[row.slot] }}</div>
          <div class="slot-time">{{ SLOT_TIME[row.slot] }}</div>
        </div>

        <template v-if="row.booking">
          <div class="status-tag">
            <el-tag type="success" size="large" effect="dark">服务中</el-tag>
          </div>
          <div class="service-info">
            <div class="line"><span class="k">客户</span><span class="v">{{ row.booking.customerName }}（{{ row.booking.customerId }}）</span></div>
            <div class="line"><span class="k">项目</span><span class="v">{{ row.booking.projectName }}</span></div>
            <div class="line"><span class="k">忌口</span><span class="v">{{ row.booking.allergy || '无' }}</span></div>
            <div class="line"><span class="k">疾病史</span><span class="v">{{ row.booking.disease || '无' }}</span></div>
            <div class="line"><span class="k">偏好</span><span class="v">{{ row.booking.preference || '—' }}</span></div>
          </div>
        </template>
        <template v-else>
          <div class="status-tag"><el-tag type="info" effect="plain" size="large">空闲</el-tag></div>
          <div class="service-info idle-tip">本时段无服务安排，可在园区休息或待命。</div>
        </template>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { DAYS, SLOT_TITLE, SLOT_TIME } from '@/utils/config'
import { dayText, serviceDateOf } from '@/utils/dates'

const loading = ref(false)
// 窗口 cells：{serviceDate, slot, booking|null}（booking 含客户健康档案）
const cells = ref([])

async function load() {
  loading.value = true
  try {
    const data = await api.mySchedule() // {days, base, cells}
    cells.value = data.cells || []
  } catch (e) {
    ElMessage.error(e.message || '排班加载失败')
  } finally {
    loading.value = false
  }
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
.panel {
  border-radius: 14px;
  margin-bottom: 16px;
}
.time-row {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 10px;
  border-bottom: 1px dashed #e2ece6;
}
.time-row:last-child {
  border-bottom: none;
}
.time-col {
  width: 130px;
  flex-shrink: 0;
}
.slot-title {
  font-weight: 700;
  font-size: 16px;
  color: #22352b;
}
.slot-time {
  color: #7a8a83;
  font-size: 14px;
}
.status-tag {
  width: 90px;
  flex-shrink: 0;
}
.service-info {
  flex: 1;
  background: #f7faf8;
  border: 1px solid #e2ece6;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 26px;
}
.service-info .line {
  display: flex;
  gap: 8px;
  font-size: 15px;
}
.service-info .k {
  color: #7a8a83;
}
.service-info .v {
  font-weight: 600;
  color: #22352b;
}
.idle-tip {
  color: #93a69d;
}
</style>
