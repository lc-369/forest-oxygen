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

    <!-- E. 四张长条统计卡（与园区环境交换后下沉到原环境卡所在区域） -->
    <div class="dash-row">
      <StatCards layout="vertical" :stats="statTiles" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar, CircleCheck, Clock, DataAnalysis, LocationInformation,
  PieChart, Tickets, TrendCharts, UserFilled
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
