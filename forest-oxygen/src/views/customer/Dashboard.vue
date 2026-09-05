<template>
  <div v-loading="loading" class="cust-dash">
    <!-- A. 问候引导条 -->
    <section class="hero">
      <span class="hero-glow"></span>
      <div class="hero-emoji">🌲</div>
      <div class="hero-text">
        <div class="hero-date">{{ dayText(0) }} · {{ dayText(1) }} / {{ dayText(2) }}</div>
        <div class="hero-greet">{{ greeting }}，{{ me?.name }}</div>
        <div class="hero-sub">{{ heroSub }}</div>
      </div>
      <el-button type="primary" size="large" round class="hero-btn" @click="goTo('/customer/projects')">
        <el-icon style="margin-right: 6px"><Calendar /></el-icon>去预约
      </el-button>
    </section>

    <!-- B. 园区环境实时监测（原位于底部，与四张统计卡交换上移） -->
    <el-card shadow="never" class="block-card dash-row">
      <template #header>
        <div class="card-head">
          <span class="head-title"><el-icon><LocationInformation /></el-icon> 园区环境实时监测</span>
          <span class="text-secondary">（数据每 6 秒自动刷新）</span>
        </div>
      </template>
      <EnvBoard />
    </el-card>

    <!-- B2. 四张统计卡：紧随实时监测正下方，整组与上方环境排同宽居中 -->
    <div class="dash-row stat-band">
      <StatCards layout="vertical" :stats="statTiles" />
    </div>

    <!-- C. 图表行：近 14 天趋势 + 预约构成 -->
    <el-row :gutter="20" class="dash-row">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="block-card chart-card">
          <template #header>
            <div class="card-head">
              <span class="head-title"><el-icon><TrendCharts /></el-icon> 近 14 天服务记录</span>
              <span class="legend">
                <span class="lg"><i class="dot" style="background:#26805a"></i>已完成</span>
                <span class="lg"><i class="dot" style="background:#c98f2e"></i>已取消</span>
              </span>
            </div>
          </template>
          <el-empty v-if="!loading && !hasTrend" description="近 14 天暂无服务记录，预约后这里会展示您的服务走势" :image-size="90" />
          <BaseChart v-if="!loading && hasTrend" :option="trendOption" height="252" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="block-card chart-card">
          <template #header>
            <div class="card-head">
              <span class="head-title"><el-icon><PieChart /></el-icon> 预约构成</span>
            </div>
          </template>
          <el-empty v-if="!loading && !hasDonut" description="暂无预约记录，去「项目总览」体验一次吧" :image-size="90" />
          <div v-if="!loading && hasDonut">
            <div class="donut-wrap">
              <BaseChart :option="donutOption" height="212" />
              <div class="donut-center">
                <div class="dc-num display-num">{{ donutData.total }}</div>
                <div class="dc-label">累计预约</div>
              </div>
            </div>
            <div class="legend-row">
              <span class="lg"><i class="dot" style="background:#26805a"></i>已完成 <b class="display-num">{{ donutData.done }}</b></span>
              <span class="lg"><i class="dot" style="background:#c98f2e"></i>待服务 <b class="display-num">{{ donutData.upcoming }}</b></span>
              <span class="lg"><i class="dot" style="background:#cfc2a6"></i>已取消 <b class="display-num">{{ donutData.cancelled }}</b></span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- C2. 图表行二：我的项目分布（玫瑰）+ 我的康养参与度（雷达），均真实数据 -->
    <el-row :gutter="20" class="dash-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="block-card chart-card">
          <template #header>
            <div class="card-head">
              <span class="head-title"><el-icon><Medal /></el-icon> 我的项目分布</span>
              <span class="text-secondary">按已完成服务次数</span>
            </div>
          </template>
          <el-empty v-if="!loading && !hasRose" description="体验更多康养项目后，这里会呈现您的项目分布" :image-size="90" />
          <BaseChart v-if="!loading && hasRose" :option="roseOption" height="250" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="block-card chart-card">
          <template #header>
            <div class="card-head">
              <span class="head-title"><el-icon><DataAnalysis /></el-icon> 我的康养参与度</span>
              <span class="text-secondary">由服务与预约记录得出 · 非临床指标</span>
            </div>
          </template>
          <el-empty v-if="!loading && !hasRadar" description="暂无参与记录，先到「项目总览」体验园区项目吧" :image-size="90" />
          <BaseChart v-if="!loading && hasRadar" :option="radarOption" height="250" />
        </el-card>
      </el-col>
    </el-row>

    <!-- D. 近期安排（整宽） -->
    <el-card shadow="never" class="block-card dash-row">
      <template #header>
        <div class="card-head">
          <span class="head-title"><el-icon><Calendar /></el-icon> 近期安排（今 / 明 / 后天）</span>
        </div>
      </template>
      <el-empty v-if="!loading && upcomingRows.length === 0" description="近三天暂无预约，点击右上角「去预约」安排您的康养服务" :image-size="90" />
      <div v-else>
        <div v-for="r in upcomingRows" :key="r.booking.id" class="up-row hover-lift">
          <div class="day-pill">{{ r.dayLabel }}</div>
          <div class="up-main">
            <div class="up-name">{{ r.booking.projectName }}</div>
            <div class="up-meta">
              <span class="meta-item"><el-icon><Clock /></el-icon>{{ r.slotTitle }} {{ r.slotTime }}</span>
              <span class="meta-item"><el-icon><LocationInformation /></el-icon>{{ r.booking.location }}</span>
              <span class="meta-item"><el-icon><UserFilled /></el-icon>{{ r.booking.workerName }}</span>
            </div>
          </div>
          <div class="up-fee">¥ {{ r.booking.fee }}<span class="fee-note">/ 次</span></div>
        </div>
        <div v-if="!loading && upcomingRows.length > 0" class="card-more">
          <el-button link type="primary" @click="goTo('/customer/my-projects')">查看我的完整安排 ›</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar, CircleCheck, Clock, DataAnalysis, LocationInformation,
  Medal, PieChart, Tickets, TrendCharts, UserFilled
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import StatCards from '@/components/dashboard/StatCards.vue'
import EnvBoard from '@/components/dashboard/EnvBoard.vue'
import BaseChart from '@/components/chart/BaseChart.vue'
import { DAYS, SLOT_TITLE, SLOT_TIME } from '@/utils/config'
import { addDays, dayText, serviceDateOf, ymd } from '@/utils/dates'

const router = useRouter()
const auth = useAuthStore()
const me = computed(() => auth.profile)

const loading = ref(true)
const counts = ref({})
const cells = ref([])   // myBookings → {serviceDate, slot, booking|null}
const history = ref([]) // myHistory → {serviceDate, status:'done'|'cancelled'}
const trend = ref([])   // 逐日聚合 [{date, label, done, cancelled}]

const greeting = (() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
})()

function goTo(path) {
  router.push(path)
}

/* ---------- 四张长条统计卡（counts 来自看板接口） ---------- */
const statTiles = computed(() => {
  const c = counts.value
  return [
    { label: '可选康养项目', value: c.projectsActive ?? 0, unit: '项', sub: '全园区开放预约', icon: DataAnalysis, tone: 'green' },
    { label: '未来三天已约', value: c.myUpcoming ?? 0, unit: '次', sub: '待您按时到场', icon: Calendar, tone: 'gold' },
    { label: '已完成服务', value: c.myDone ?? 0, unit: '次', sub: '均经系统确认', icon: CircleCheck, tone: 'cream' },
    { label: '累计预约', value: c.myTotal ?? 0, unit: '次', sub: '含完成与取消', icon: Tickets, tone: 'rust' }
  ]
})

/* ---------- 近 14 天服务记录（真实数据聚合） ---------- */
function buildTrend(items) {
  const arr = []
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = addDays(today, -i)
    arr.push({ date: ymd(d), label: `${d.getMonth() + 1}/${d.getDate()}`, done: 0, cancelled: 0 })
  }
  const idx = {}
  arr.forEach((p, i) => (idx[p.date] = i))
  ;(items || []).forEach(it => {
    const i = idx[it.serviceDate]
    if (i == null) return
    if (it.status === 'done') arr[i].done += 1
    else if (it.status === 'cancelled') arr[i].cancelled += 1
  })
  trend.value = arr
}
const hasTrend = computed(() => trend.value.some(p => p.done > 0 || p.cancelled > 0))
const trendOption = computed(() => {
  if (!hasTrend.value) return null
  return {
    grid: { left: 12, right: 18, top: 30, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e6dfd1',
      textStyle: { color: '#2e3b33' },
      axisPointer: { type: 'line', lineStyle: { color: '#c9a24b' } }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.value.map(p => p.label),
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
      {
        name: '已完成',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: trend.value.map(p => p.done),
        lineStyle: { width: 3, color: '#26805a' },
        itemStyle: { color: '#26805a' },
        areaStyle: { color: 'rgba(38, 128, 90, 0.12)' }
      },
      {
        name: '已取消',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: trend.value.map(p => p.cancelled),
        lineStyle: { width: 2, type: 'dashed', color: '#c98f2e' },
        itemStyle: { color: '#c98f2e' }
      }
    ]
  }
})

/* ---------- 预约构成环形图 ---------- */
const donutData = computed(() => {
  const done = counts.value.myDone ?? 0
  const upcoming = counts.value.myUpcoming ?? 0
  const cancelled = history.value.filter(h => h.status === 'cancelled').length
  return { done, upcoming, cancelled, total: done + upcoming + cancelled }
})
const hasDonut = computed(() => donutData.value.total > 0)
const donutOption = computed(() => {
  if (!hasDonut.value) return null
  const { done, upcoming, cancelled } = donutData.value
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#e6dfd1',
      textStyle: { color: '#2e3b33' }
    },
    series: [
      {
        type: 'pie',
        radius: ['56%', '78%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { scaleSize: 5 },
        data: [
          { name: '已完成', value: done, itemStyle: { color: '#26805a' } },
          { name: '待服务', value: upcoming, itemStyle: { color: '#c98f2e' } },
          { name: '已取消', value: cancelled, itemStyle: { color: '#cfc2a6' } }
        ]
      }
    ]
  }
})

/* ---------- 我的项目分布（玫瑰：真实 myHistory 按已完成项目聚合） ---------- */
// 单绿系按相对量值浅→深映射（值越大色越深），仅靠同色深浅 + 直标 + tooltip 传达身份
function roseColor(v) {
  if (v > 0.8) return '#1f5c42'
  if (v > 0.6) return '#2b7a56'
  if (v > 0.4) return '#4f9a75'
  if (v > 0.25) return '#85bd9d'
  if (v > 0.12) return '#c3decb'
  return '#e5efe6'
}
const roseData = computed(() => {
  const m = {}
  history.value.forEach(h => {
    if (h.status !== 'done' || !h.projectName) return
    m[h.projectName] = (m[h.projectName] || 0) + 1
  })
  let rows = Object.entries(m)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  if (rows.length > 6) {
    const top = rows.slice(0, 6)
    const rest = rows.slice(6).reduce((s, r) => s + r.value, 0)
    top.push({ name: '其他项目', value: rest })
    rows = top
  }
  return rows
})
const hasRose = computed(() => roseData.value.length >= 2)
const roseOption = computed(() => {
  if (!hasRose.value) return null
  const max = Math.max(...roseData.value.map(d => d.value))
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
        radius: ['12%', '74%'],
        center: ['50%', '52%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b} {c}', color: '#5f7368', fontSize: 13 },
        labelLine: { lineStyle: { color: '#c9bfa8' } },
        emphasis: { scaleSize: 5 },
        data: roseData.value.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: roseColor(d.value / max) }
        }))
      }
    ]
  }
})

/* ---------- 我的康养参与度（雷达：真实记录派生的 5 维 0–10） ---------- */
const clamp01 = v => Math.max(0, Math.min(10, Math.round(v)))
const radarScores = computed(() => {
  const doneN = counts.value.myDone ?? 0
  const cancN = history.value.filter(h => h.status === 'cancelled').length
  const done14 = trend.value.reduce((s, p) => s + p.done, 0)
  const proj = new Set()
  const slots = new Set()
  history.value.forEach(h => {
    if (h.status !== 'done') return
    if (h.projectName) proj.add(h.projectName)
    if (h.slot != null) slots.add(h.slot)
  })
  return [
    { name: '到访规律', value: clamp01(doneN + cancN > 0 ? (doneN / (doneN + cancN)) * 10 : 0) },
    { name: '服务完成', value: clamp01((Math.min(done14, 8) / 8) * 10) },
    { name: '项目广度', value: clamp01((Math.min(proj.size, 3) / 3) * 10) },
    { name: '时段覆盖', value: clamp01((Math.min(slots.size, 4) / 4) * 10) },
    { name: '近期活跃', value: clamp01((Math.min(counts.value.myUpcoming ?? 0, 4) / 4) * 10) }
  ]
})
const hasRadar = computed(() => radarScores.value.some(a => a.value > 0))
const radarOption = computed(() => {
  if (!hasRadar.value) return null
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#e6dfd1',
      textStyle: { color: '#2e3b33' }
    },
    radar: {
      indicator: radarScores.value.map(a => ({ name: a.name, max: 10 })),
      shape: 'circle',
      center: ['50%', '54%'],
      radius: '66%',
      splitNumber: 4,
      axisName: { color: '#5f7368', fontSize: 13 },
      splitArea: { areaStyle: { color: ['rgba(212, 230, 218, 0.2)', 'rgba(212, 230, 218, 0.06)'] } },
      splitLine: { lineStyle: { color: '#d8cfbd' } },
      axisLine: { lineStyle: { color: '#d8cfbd' } }
    },
    series: [
      {
        type: 'radar',
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#2b6349' },
        itemStyle: { color: '#2b6349' },
        areaStyle: { color: 'rgba(43, 99, 73, 0.26)' },
        data: [{ value: radarScores.value.map(a => a.value), name: '参与度' }]
      }
    ]
  }
})

/* ---------- 近期安排（真实预约行） ---------- */
const upcomingRows = computed(() => {
  const out = []
  for (const d of DAYS) {
    const sd = serviceDateOf(d.day)
    const booked = cells.value
      .filter(c => c.serviceDate === sd && c.booking)
      .sort((a, b) => a.slot - b.slot)
    booked.forEach(c => {
      out.push({
        dayLabel: d.label,
        booking: c.booking,
        slotTitle: SLOT_TITLE[c.slot],
        slotTime: SLOT_TIME[c.slot]
      })
    })
  }
  return out.slice(0, 6)
})

/* ---------- 副标题（数据驱动） ---------- */
const heroSub = computed(() => {
  if (upcomingRows.value.length) {
    const r = upcomingRows.value[0]
    return `${r.dayLabel} ${r.slotTitle}（${r.slotTime}）· ${r.booking.projectName}，请按时前往`
  }
  const done14 = trend.value.reduce((s, p) => s + p.done, 0)
  if (done14 > 0) return `近 14 天已完成 ${done14} 次服务，愿您身心舒畅`
  const active = counts.value.projectsActive ?? 0
  if (active > 0) return `园区为您开放 ${active} 个康养项目，去预约一次放松体验吧`
  return '随时欢迎来森林氧吧享受健康生活'
})

onMounted(async () => {
  try {
    const [d, hist, bks] = await Promise.all([api.dashboard(), api.myHistory(), api.myBookings()])
    counts.value = d.counts || {}
    history.value = hist.items || []
    cells.value = bks.rows || []
    buildTrend(history.value)
  } catch (e) {
    ElMessage.error(e.message || '数据看板加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.cust-dash {
  min-height: 100%;
  padding-bottom: 6px;
}

/* ===== A. 问候引导条 ===== */
.hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 26px;
  margin-bottom: 18px;
  border-radius: 16px;
  color: #fff;
  background:
    radial-gradient(620px 180px at 88% -60px, rgba(201, 162, 75, 0.42), transparent 62%),
    linear-gradient(96deg, #1f4636 0%, #24513d 55%, #2f5f48 100%);
  border: 1px solid rgba(233, 205, 140, 0.4);
  box-shadow: 0 8px 24px rgba(24, 48, 36, 0.22);
}
.hero-glow {
  position: absolute;
  right: -40px;
  top: -80px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(233, 205, 140, 0.22) 0%, transparent 68%);
  pointer-events: none;
}
.hero-emoji {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  font-size: 34px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(233, 205, 140, 0.45);
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}
.hero-text {
  flex: 1;
  min-width: 0;
}
.hero-date {
  font-size: 14px;
  color: rgba(239, 224, 184, 0.92);
  letter-spacing: 0.3px;
}
.hero-greet {
  margin-top: 2px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.hero-sub {
  margin-top: 6px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
}
.hero-btn {
  flex: none;
  --el-button-bg-color: #f0dfae;
  --el-button-text-color: #243b2c;
  --el-button-border-color: #f0dfae;
  --el-button-hover-bg-color: #f6e9c6;
  --el-button-hover-text-color: #1f4636;
  --el-button-hover-border-color: #f6e9c6;
  font-weight: 700;
  min-width: 118px;
}

/* ===== 区块间距 / 卡片 ===== */
.dash-row {
  margin-top: 18px;
}
/* 四张统计卡：整组收窄并与上方实时监测排（EnvBoard 上限 1500px）同宽居中 */
.stat-band {
  max-width: 1500px;
  margin-inline: auto;
}
.block-card {
  border-radius: 16px;
}
.chart-card :deep(.el-card__body) {
  padding-top: 8px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.head-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 17px;
  font-weight: 700;
  color: #1f4636;
}
.legend {
  display: inline-flex;
  align-items: center;
  gap: 14px;
}
.lg {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #5f7368;
}
.lg .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.lg b {
  color: #2e3b33;
}

/* 环形图居中叠加文本 */
.donut-wrap {
  position: relative;
}
.donut-center {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}
.dc-num {
  font-size: 34px;
  font-weight: 800;
  color: #26463a;
  line-height: 1;
}
.dc-label {
  margin-top: 4px;
  font-size: 13px;
  color: #5f7368;
}
.legend-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 18px;
  padding: 2px 0 6px;
}

/* ===== 近期安排列表 ===== */
.up-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid #e6dfd1;
  background: #fdfbf6;
  margin-bottom: 10px;
}
.up-row:last-child {
  margin-bottom: 0;
}
.day-pill {
  flex: none;
  min-width: 54px;
  text-align: center;
  padding: 6px 8px;
  font-size: 14px;
  font-weight: 700;
  color: #24523d;
  background: #e8f0e2;
  border-radius: 999px;
}
.up-main {
  flex: 1;
  min-width: 0;
}
.up-name {
  font-size: 17px;
  font-weight: 700;
  color: #26463a;
}
.up-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-top: 3px;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #5f7368;
}
.up-fee {
  flex: none;
  font-size: 18px;
  font-weight: 800;
  color: #7c361f;
}
.fee-note {
  font-size: 12px;
  font-weight: 400;
  color: #8a7f6a;
}
.card-more {
  text-align: right;
  margin-top: 4px;
}
</style>
