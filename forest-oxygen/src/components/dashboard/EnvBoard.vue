<template>
  <div class="env-board">
    <div v-for="m in metrics" :key="m.key" class="env-card" :style="vars(m.key)">
      <div class="env-icon"><el-icon :size="22"><component :is="m.icon" /></el-icon></div>
      <div class="env-value display-num">
        {{ m.value }}<span class="unit">{{ m.unit }}</span>
      </div>
      <div class="env-label">{{ m.label }}</div>
      <div v-if="m.extra" class="env-extra">{{ m.extra }}</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Sunny, Cloudy, WindPower, Odometer } from '@element-plus/icons-vue'
import { ENV_LIMITS, airLevel } from '@/utils/config'

// 按需求 3.1：环境数据每 6 秒模拟刷新一次
const REFRESH_MS = 6000

const icons = { temp: Sunny, humi: Cloudy, pm: WindPower, anion: Odometer }

// 每张卡：浅色底 + 一条身份色顶条 + 同色图标。浅底深字，对比度已核算：
// 主值(#223b30)>=9、标签/说明(#4a5e53)>=4.5。
const TONES = {
  // 温度 · 浅陶土
  temp: { bg: '#f7d9c4', acc: '#b75f34' },
  // 湿度 · 浅青蓝
  humi: { bg: '#cde6ee', acc: '#2f7e94' },
  // 空气 · 浅薄荷绿
  pm: { bg: '#d0e6d8', acc: '#1c7a4e' },
  // 负氧离子 · 浅麦金
  anion: { bg: '#f1e4bb', acc: '#96751f' }
}

function vars(key) {
  const t = TONES[key] || TONES.pm
  return { '--bg': t.bg, '--acc': t.acc }
}

const PM_HINT = {
  优: '清新怡人',
  良: '适宜户外活动',
  轻度污染: '敏感人群慎外出',
  中度污染: '建议减少户外'
}

const metrics = ref([])
function rnd(min, max) {
  return min + Math.random() * (max - min)
}
function refresh() {
  const temp = rnd(ENV_LIMITS.temperature.min, ENV_LIMITS.temperature.max)
  const humi = rnd(ENV_LIMITS.humidity.min, ENV_LIMITS.humidity.max)
  const pm25 = rnd(ENV_LIMITS.pm25.min, ENV_LIMITS.pm25.max)
  const anion = rnd(ENV_LIMITS.anion.min, ENV_LIMITS.anion.max)
  const air = airLevel(pm25)
  metrics.value = [
    { key: 'temp', icon: Sunny, label: '园区温度', value: temp.toFixed(1), unit: '℃', extra: '体感舒适' },
    { key: 'humi', icon: Cloudy, label: '空气湿度', value: String(Math.round(humi)), unit: '%RH', extra: '湿度宜人' },
    { key: 'pm', icon: WindPower, label: '空气质量', value: air.text, unit: ` PM2.5 ${Math.round(pm25)}`, extra: PM_HINT[air.text] || '' },
    { key: 'anion', icon: Odometer, label: '负氧离子', value: Math.round(anion).toLocaleString(), unit: ' 个/cm³', extra: anion > 4500 ? '浓度高' : '充沛宜人' }
  ]
}

let timer = null
onMounted(() => {
  refresh()
  timer = setInterval(refresh, REFRESH_MS)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
/* 卡片更窄更高、居中；卡间间距大而均匀，4 张等宽 1fr 自动占满整行，窄屏自动换行 */
.env-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(216px, 1fr));
  gap: 100px; /* 间距扩大 */
  justify-content: center;
  max-width: 1500px; /* 加大可容纳更大间距，仍整体居中 */
  margin: 0 auto;
  padding: 8px 0;
}
.env-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 236px; /* 竖向拉长 */
  padding: 22px 18px 18px;
  border-radius: 18px;
  background: var(--bg);
  border: 1px solid rgba(120, 105, 75, 0.14);
  border-top: 5px solid var(--acc); /* 身份色顶条（与图标同色，非唯一信号） */
  box-shadow: 0 6px 16px rgba(58, 46, 24, 0.06);
}
.env-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.66);
  color: var(--acc);
  margin-bottom: 10px;
}
.env-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  color: #223b30;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.env-value .unit {
  font-size: 12px;
  font-weight: 400;
  color: #4c6053;
  margin-left: 2px;
}
.env-label {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #3e5349;
}
.env-extra {
  margin-top: auto;
  padding-top: 8px;
  font-size: 13px;
  color: #4a5e53;
}
</style>
