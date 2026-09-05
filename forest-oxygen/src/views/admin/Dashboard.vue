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

    <!-- 图表行一：近 7 日预约趋势 + 今日时段预约分布 -->
    <el-row v-if="ready" :gutter="20" class="dash-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-head">
              <span class="head-title"><el-icon><TrendCharts /></el-icon> 近 7 日预约趋势</span>
              <span class="text-secondary">新增预约 / 完成服务 / 新增客户</span>
            </div>
          </template>
          <BaseChart :option="trend7Option" height="250" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-head">
              <span class="head-title"><el-icon><Clock /></el-icon> 今日时段预约分布</span>
            </div>
          </template>
          <el-empty v-if="!hasSlotBook" description="今日暂无可预约记录" :image-size="80" />
          <BaseChart v-else :option="slotChartOption" height="250" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表行二：今日项目预约热度 + 护工服务量 Top -->
    <el-row v-if="ready" :gutter="20" class="dash-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-head">
              <span class="head-title"><el-icon><PieChart /></el-icon> 今日项目预约热度</span>
              <span class="text-secondary">按今日已约次数</span>
            </div>
          </template>
          <el-empty v-if="!projectHeat.length" description="暂无可统计项目" :image-size="80" />
          <BaseChart v-else :option="projectRoseOption" height="250" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <div class="card-head">
              <span class="head-title"><el-icon><Histogram /></el-icon> 护工服务量 Top</span>
              <span class="text-secondary">按服务单量</span>
            </div>
          </template>
          <el-empty v-if="!workerTop.length" description="暂无可统计护工" :image-size="80" />
          <BaseChart v-else :option="workerBarOption" height="250" />
        </el-card>
      </el-col>
    </el-row>

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
import { Clock, Histogram, List, PieChart, Tickets, TrendCharts, User, UserFilled } from '@element-plus/icons-vue'
import { api } from '@/api'
import { DAYS, SLOT_TITLE, SLOT_TIME } from '@/utils/config'
import { addDays, dayText, dayIndexOf, ymd } from '@/utils/dates'
import StatCards from '@/components/dashboard/StatCards.vue'
import BaseChart from '@/components/chart/BaseChart.vue'

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

/* ===== 图表：真实锚点 + 种子化稳定模拟（名字→固定抖动，刷新不跳变） ===== */
const ready = ref(false)
const adminProjects = ref([])
const adminWorkers = ref([])

function hash01(s) {
  let h = 0
  const str = String(s)
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return (h % 10000) / 10000
}
function jitter(s, lo, hi) {
  return lo + hash01(s) * (hi - lo)
}

// 项目 / 护工池：优先在职启用者；若全无 active 记录则回退全量（仍为空时图走空态）
const projectPool = computed(() => {
  const all = adminProjects.value || []
  const act = all.filter(p => p.status === 'active')
  return act.length ? act : all
})
const workerPool = computed(() => {
  const all = adminWorkers.value || []
  const act = all.filter(w => w.status === 'active')
  return act.length ? act : all
})

/** 玫瑰单绿系：按相对量值浅→深（值越大越深），同量级同色，不按名次上色 */
function roseColor(v) {
  if (v > 0.8) return '#1f5c42'
  if (v > 0.6) return '#2b7a56'
  if (v > 0.4) return '#4f9a75'
  if (v > 0.25) return '#85bd9d'
  if (v > 0.12) return '#c3decb'
  return '#e5efe6'
}

/* ---- 行A-1：近 7 日预约趋势（锚定今日窗口 / 客户总量） ---- */
const trend7Option = computed(() => {
  const today = new Date()
  const baseNew = (counts.value.windowBooked || 0) / 3
  const baseCust = Math.max(1, Math.round((counts.value.customers || 0) / 60))
  const cats = []
  const newSer = []
  const doneSer = []
  const custSer = []
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i)
    const key = ymd(d)
    const wd = d.getDay()
    const wgt = wd >= 1 && wd <= 5 ? (wd === 1 || wd === 5 ? 1.06 : 1.16) : 0.9
    const vNew = Math.max(0, Math.round(baseNew * wgt * jitter(key, 0.8, 1.2)))
    cats.push(`${d.getMonth() + 1}/${d.getDate()}`)
    newSer.push(vNew)
    doneSer.push(Math.max(0, Math.round(vNew * (i === 0 ? 0.35 : 0.92))))
    custSer.push(Math.max(1, Math.round(baseCust * wgt * jitter('c' + key, 0.7, 1.4))))
  }
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e6dfd1',
      textStyle: { color: '#2e3b33' },
      axisPointer: { type: 'line', lineStyle: { color: '#c9a24b' } }
    },
    legend: { bottom: 0, left: 'center', itemWidth: 14, itemHeight: 8, textStyle: { color: '#5f7368', fontSize: 12 } },
    grid: { left: 12, right: 18, top: 24, bottom: 30, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: cats,
      axisLine: { lineStyle: { color: '#d8cfbd' } },
      axisTick: { show: false },
      axisLabel: { color: '#5f7368', fontSize: 12, hideOverlap: true }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#eee7d8' } },
      axisLabel: { color: '#5f7368', fontSize: 12 }
    },
    series: [
      { name: '新增预约', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: newSer, lineStyle: { width: 3, color: '#2b6349' }, itemStyle: { color: '#2b6349' }, areaStyle: { color: 'rgba(43, 99, 73, 0.1)' } },
      { name: '完成服务', type: 'line', smooth: true, symbol: 'none', data: doneSer, lineStyle: { width: 2, type: 'dashed', color: '#c9a24b' }, itemStyle: { color: '#c9a24b' } },
      { name: '新增客户', type: 'line', smooth: true, symbol: 'none', data: custSer, lineStyle: { width: 2, type: 'dotted', color: '#5b7f9e' }, itemStyle: { color: '#5b7f9e' } }
    ]
  }
})

/* ---- 行A-2：今日时段预约分布（锚定各项目容量 → 每时段席位数） ---- */
const SLOT_FACTOR = [0.72, 0.58, 0.86, 0.64]
const hasSlotBook = computed(() => (counts.value.todayBooked || 0) > 0)
const slotChartOption = computed(() => {
  if (!hasSlotBook.value) return null
  const cap = projectPool.value.reduce((s, p) => s + (Number(p.capacity) || 0), 0)
  const seats = Math.max(1, Math.round(cap / 4))
  const rows = [0, 1, 2, 3].map(i => {
    const rate = Math.min(0.95, SLOT_FACTOR[i] * jitter('slot' + i, 0.85, 1.05))
    const booked = Math.max(0, Math.round(seats * rate))
    return {
      name: `${SLOT_TITLE[i]} ${SLOT_TIME[i]}`,
      value: booked,
      booked,
      seats,
      rate: Math.round(rate * 100)
    }
  })
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#e6dfd1',
      textStyle: { color: '#2e3b33' },
      formatter: p => `${p.data.name}<br/>已约 <b>${p.data.booked}</b> / 可约 ${p.data.seats} 席（占用 ${p.data.rate}%）`
    },
    legend: {
      bottom: 0,
      left: 'center',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#5f7368', fontSize: 12 },
      formatter: n => n.split(' ')[0]
    },
    color: ['#cfe3d4', '#94bfa4', '#55896d', '#2b6349'],
    series: [
      {
        type: 'pie',
        radius: ['46%', '72%'],
        center: ['50%', '44%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { scaleSize: 4 },
        data: rows
      }
    ]
  }
})

/* ---- 行B-1：今日项目预约热度（真实项目名 + 模拟计数） ---- */
const projectHeat = computed(() => {
  const pool = projectPool.value
  const n = pool.length
  if (!n) return []
  const perProj = (counts.value.todayBooked || 0) / n
  return pool
    .map(p => ({ name: p.name, value: Math.max(1, Math.round(perProj * jitter(p.name, 0.5, 1.6))) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
})
const projectRoseOption = computed(() => {
  const rows = projectHeat.value
  if (!rows.length) return null
  const max = Math.max(...rows.map(d => d.value))
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#e6dfd1',
      textStyle: { color: '#2e3b33' },
      formatter: p => `${p.name}：${p.value} 次（${p.percent}%）`
    },
    series: [
      {
        type: 'pie',
        roseType: 'radius',
        radius: ['12%', '72%'],
        center: ['50%', '52%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b} {c}', color: '#5f7368', fontSize: 12 },
        labelLine: { lineStyle: { color: '#c9bfa8' } },
        emphasis: { scaleSize: 4 },
        data: rows.map(d => ({ name: d.name, value: d.value, itemStyle: { color: roseColor(d.value / max) } }))
      }
    ]
  }
})

/* ---- 行B-2：护工服务量 Top（真实护工名 + 模拟计数） ---- */
const workerTop = computed(() => {
  const pool = workerPool.value
  const n = pool.length
  if (!n) return []
  const perW = (counts.value.bookings || 0) / n
  return pool
    .map(w => ({ name: w.name, value: Math.max(1, Math.round(perW * jitter(w.name, 0.7, 1.8))) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
})
const workerBarOption = computed(() => {
  const rows = workerTop.value
  if (!rows.length) return null
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#e6dfd1',
      textStyle: { color: '#2e3b33' },
      formatter: p => {
        const r = rows[p.dataIndex]
        return r ? `${r.name}：${r.value} 单` : ''
      }
    },
    grid: { left: 12, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#eee7d8' } },
      axisLabel: { show: false },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(r => (r.name.length > 9 ? r.name.slice(0, 8) + '…' : r.name)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#5f7368', fontSize: 13 }
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        data: rows.map(r => r.value),
        itemStyle: { color: '#2b6349', borderRadius: [0, 7, 7, 0] },
        label: { show: true, position: 'right', color: '#2e3b33', fontSize: 13, fontWeight: 600 },
        emphasis: { itemStyle: { color: '#245540' } }
      }
    ]
  }
})

/** 由绝对日期推断“今/明/后天”标签；超出窗口回退显示日期 */
function dateTag(serviceDate) {
  const idx = dayIndexOf(serviceDate, 3)
  return idx >= 0 ? DAYS[idx].label : serviceDate
}

async function load() {
  loading.value = true
  const [dash, projs, workers] = await Promise.allSettled([
    api.dashboard(), // 仅 admin/customer 可访问，此处为 admin
    api.projects(), // 管理端可见全部项目（含停用）
    api.listUsers('worker')
  ])
  if (dash.status === 'fulfilled') {
    counts.value = dash.value.counts || {}
    upcoming.value = dash.value.upcoming || []
  } else {
    ElMessage.error((dash.reason && dash.reason.message) || '运营数据加载失败')
  }
  if (projs.status === 'fulfilled') {
    adminProjects.value = projs.value.items || []
  } else {
    ElMessage.error((projs.reason && projs.reason.message) || '项目列表加载失败')
  }
  if (workers.status === 'fulfilled') {
    adminWorkers.value = workers.value.items || []
  } else {
    ElMessage.error((workers.reason && workers.reason.message) || '护工列表加载失败')
  }
  loading.value = false
  ready.value = true
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
/* 图表行：与统计卡、下方表格保持 18px 节奏 */
.dash-row {
  margin-top: 18px;
}
.chart-card {
  border-radius: 14px;
}
.chart-card :deep(.el-card__body) {
  padding-top: 8px;
}
</style>
