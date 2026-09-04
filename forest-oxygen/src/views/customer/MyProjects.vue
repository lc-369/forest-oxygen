<template>
  <div>
    <h2 class="page-title">我的项目</h2>
    <p class="text-secondary" style="margin-bottom: 12px">查看我未来三天各时段的预约安排，可随时取消。</p>

    <div class="day-summary">
      <el-tag v-for="s in summary" :key="s.label" size="large" effect="plain" :type="s.type">{{ s.label }}</el-tag>
      <span class="text-secondary summary-tip">共 12 个时段（每天 4 段），已约 {{ totalBooked }} 段</span>
    </div>

    <el-card v-loading="loading" v-for="d in DAYS" :key="d.day" shadow="never" class="panel" :header="`${d.label} · ${dayText(d.day)}`">
      <div v-for="cell in rowsOf(d.day)" :key="cell.slot" class="row-cell">
        <div class="time-col">
          <div class="slot-title">{{ SLOT_TITLE[cell.slot] }}</div>
          <div class="slot-time">{{ SLOT_TIME[cell.slot] }}</div>
        </div>

        <template v-if="cell.booking">
          <div class="book-info">
            <div class="line"><span class="k">项目</span><span class="v">{{ cell.booking.projectName }}</span></div>
            <div class="line"><span class="k">地点</span><span class="v">{{ cell.booking.location }}</span></div>
            <div class="line"><span class="k">费用</span><span class="v">¥ {{ cell.booking.fee }} / 次</span></div>
            <div class="line"><span class="k">护工</span><span class="v">{{ cell.booking.workerName }}（{{ cell.booking.workerId }}）</span></div>
          </div>
          <el-button type="danger" plain size="large" @click="cancelBooking(cell.booking)">
            <el-icon style="margin-right: 4px"><CircleClose /></el-icon>取消
          </el-button>
        </template>
        <template v-else>
          <div class="empty-state">
            <el-tag type="info" effect="plain" size="large">未预约</el-tag>
            <span class="text-secondary">如需预约，请前往「项目总览」选择项目与时段</span>
          </div>
        </template>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'
import { DAYS, SLOT_TITLE, SLOT_TIME } from '@/utils/config'
import { dayText, serviceDateOf } from '@/utils/dates'

const loading = ref(false)
// 窗口内 3×4 格：{serviceDate, slot, booking|null}，booking 由服务端补全名称
const cells = ref([])

const totalBooked = computed(() => cells.value.filter(c => c.booking).length)
const summary = computed(() =>
  DAYS.map(d => {
    const sd = serviceDateOf(d.day)
    const n = cells.value.filter(c => c.serviceDate === sd && c.booking).length
    return { label: `${d.label}已约 ${n} 段`, type: n > 0 ? 'success' : 'info' }
  })
)

async function load() {
  loading.value = true
  try {
    const data = await api.myBookings() // {days, base, rows}
    cells.value = data.rows || []
  } catch (e) {
    ElMessage.error(e.message || '预约安排加载失败')
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

function cancelBooking(booking) {
  ElMessageBox.confirm(
    `确定取消「${booking.projectName}」（${booking.workerName}）的预约吗？`,
    '取消预约',
    { confirmButtonText: '确定取消', cancelButtonText: '再想想', type: 'warning' }
  ).then(async () => {
    try {
      await api.cancelBooking(booking.id)
      ElMessage.success('已成功取消，该时段恢复为未预约')
      await load()
    } catch (e) {
      ElMessage.error(e.message || '取消失败，请稍后重试')
    }
  }).catch(() => {})
}

onMounted(load)
</script>

<style scoped>
.day-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.day-summary .summary-tip {
  font-size: 14px;
}
.panel {
  border-radius: 14px;
  margin-bottom: 16px;
}
.row-cell {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 10px;
  border-bottom: 1px dashed #e2ece6;
}
.row-cell:last-child {
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
.book-info {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 30px;
  background: #e8f5ee;
  border: 1px solid #cfe3d7;
  border-radius: 10px;
  padding: 10px 14px;
}
.book-info .line {
  display: flex;
  gap: 8px;
  font-size: 15px;
}
.book-info .k {
  color: #7a8a83;
}
.book-info .v {
  font-weight: 600;
  color: #22352b;
}
.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
}
</style>
