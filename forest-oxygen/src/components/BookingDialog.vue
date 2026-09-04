<template>
  <el-dialog
    :model-value="modelValue"
    :title="`预约 · ${project?.name}`"
    width="820px"
    top="6vh"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template v-if="project">
      <el-alert type="success" :closable="false" show-icon class="top-alert">
        选择日期与时段后，系统将自动从该时段空闲护工中为您匹配一名。每人每天每个时段仅可预约一项。
      </el-alert>

      <div v-loading="loading" class="slot-body" element-loading-text="正在读取时段余量…">
        <template v-if="!loading">
          <div v-for="d in DAYS" :key="d.day" class="day-group">
            <div class="day-label">{{ d.label }} · {{ dayText(d.day) }}</div>
            <div class="slot-grid">
              <div v-for="cell in cells(d.day)" :key="cell.key" class="slot-cell" :class="cell.cls">
                <div class="sc-title">{{ SLOT_TITLE[cell.slot] }}</div>
                <div class="sc-time">{{ SLOT_TIME[cell.slot] }}</div>
                <div v-if="cell.reason" class="sc-reason">{{ cell.reason }}</div>
                <el-button
                  v-else
                  type="success"
                  round
                  size="large"
                  :loading="bookingKey === cell.key"
                  @click="doBook(cell.serviceDate, cell.slot)"
                >
                  预约
                </el-button>
              </div>
            </div>
          </div>
          <div class="legend">
            <span><i class="dot dot-ok"></i>可预约</span>
            <span><i class="dot dot-full"></i>已约满</span>
            <span><i class="dot dot-mine"></i>该时段我已预约其他项目</span>
          </div>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { DAYS, SLOT_TITLE, SLOT_TIME } from '@/utils/config'
import { dayText, serviceDateOf } from '@/utils/dates'

const props = defineProps({
  modelValue: Boolean,
  project: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'booked'])

const loading = ref(false)
const bookingKey = ref('')
// 时段占用数据 {serviceDate, slots:[{slot,count,capacity,left,available}]}
const occDays = ref([])
// 本人窗口 rows: {serviceDate, slot, booking|null}
const myRows = ref([])

async function load() {
  if (!props.project) return
  loading.value = true
  try {
    const [occ, mine] = await Promise.all([
      api.occupancy(props.project.id, { days: 3 }),
      api.myBookings()
    ])
    occDays.value = occ.days
    myRows.value = mine.rows || []
  } catch (e) {
    ElMessage.error(e.message || '读取预约信息失败')
    emit('update:modelValue', false)
  } finally {
    loading.value = false
  }
}

// 打开 / 切换项目时拉取最新余量
watch(() => props.modelValue && props.project?.id, v => { if (v) load() })
watch(() => props.project?.id, () => { bookingKey.value = '' })

function occOf(serviceDate, slot) {
  const day = occDays.value.find(d => d.serviceDate === serviceDate)
  return day ? day.slots.find(s => s.slot === slot) : null
}
function myBookingAt(serviceDate, slot) {
  const row = myRows.value.find(r => r.serviceDate === serviceDate && r.slot === slot)
  return row && row.booking ? row.booking : null
}

function cells(day) {
  const serviceDate = serviceDateOf(day)
  return [0, 1, 2, 3].map(slot => {
    const key = `${serviceDate}-${slot}`
    const base = { slot, serviceDate, key }

    // 项目停用：不可预约（正常客户列表仅出现进行中项目，作兜底）
    if (props.project.status !== 'active') {
      return { ...base, cls: 'is-off', reason: '项目已停用' }
    }
    // 本人该时段已有预约（任意项目）
    const mine = myBookingAt(serviceDate, slot)
    if (mine) {
      return {
        ...base, cls: 'is-mine',
        reason: mine.projectId === props.project.id ? '我此时段已预约该项目' : '该时段我已预约其他项目'
      }
    }
    const occ = occOf(serviceDate, slot)
    if (!occ) return { ...base, cls: 'is-free', reason: '' }
    // 容量已满
    if (!occ.available && occ.left <= 0) {
      return { ...base, cls: 'is-full', reason: `已约满 ${occ.count}/${occ.capacity}` }
    }
    return { ...base, cls: 'is-free', reason: '' }
  })
}

async function doBook(serviceDate, slot) {
  bookingKey.value = `${serviceDate}-${slot}`
  try {
    const booking = await api.book({ projectId: props.project.id, serviceDate, slot })
    ElMessage.success(`预约成功！为您匹配的护工是 ${booking.workerName}（${booking.workerId}）`)
    await load()
    emit('booked', booking)
    emit('update:modelValue', false)
  } catch (e) {
    ElMessage.warning(e.message || '预约失败，请稍后重试')
  } finally {
    bookingKey.value = ''
  }
}
</script>

<style scoped>
.top-alert {
  margin-bottom: 14px;
}
.slot-body {
  min-height: 120px;
}
.day-group {
  margin-bottom: 18px;
}
.day-label {
  font-weight: 700;
  color: #2d6a4f;
  margin-bottom: 10px;
  font-size: 16px;
}
.slot-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.slot-cell {
  border: 1px solid #e2ece6;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  background: #fff;
  min-height: 118px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.sc-title {
  font-weight: 700;
  color: #22352b;
}
.sc-time {
  color: #7a8a83;
  font-size: 13px;
  margin-bottom: 8px;
}
.sc-reason {
  color: #7a8a83;
  font-size: 14px;
  padding: 4px;
}
.slot-cell.is-off {
  background: #f3f4f6;
  opacity: 0.7;
}
.slot-cell.is-full {
  background: #fdf6f0;
}
.slot-cell.is-mine {
  background: #eef7ff;
  border-color: #a3cdf0;
}
.slot-cell.is-mine .sc-reason {
  color: #2a6fb6;
}
.legend {
  display: flex;
  gap: 20px;
  margin-top: 6px;
  color: #7a8a83;
  font-size: 14px;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 5px;
}
.dot-ok {
  background: #52b788;
}
.dot-full {
  background: #e9a23b;
}
.dot-mine {
  background: #a3cdf0;
}
@media (max-width: 720px) {
  .slot-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
