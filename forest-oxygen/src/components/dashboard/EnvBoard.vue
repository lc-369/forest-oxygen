<template>
  <el-row :gutter="20" class="env-row">
    <el-col v-for="m in metrics" :key="m.key" :xs="12" :sm="12" :md="6">
      <div class="env-card" :class="`is-${m.level}`">
        <div class="env-icon"><el-icon :size="24"><component :is="m.icon" /></el-icon></div>
        <div class="env-main">
          <div class="env-value display-num">
            {{ m.value }}<span class="unit">{{ m.unit }}</span>
          </div>
          <div class="env-label">{{ m.label }}<span v-if="m.extra" class="extra"> · {{ m.extra }}</span></div>
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Sunny, Cloudy, WindPower, Odometer } from '@element-plus/icons-vue'
import { ENV_LIMITS, airLevel } from '@/utils/config'

// 按需求 3.1：环境数据每 5~10 秒模拟刷新一次
const REFRESH_MS = 6000
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
    { key: 'temp', icon: Sunny, label: '园区温度', value: temp.toFixed(1), unit: '℃', level: air.level, extra: '体感舒适' },
    { key: 'humi', icon: Cloudy, label: '空气湿度', value: Math.round(humi), unit: '%RH', level: 'success', extra: '适宜康养' },
    { key: 'pm', icon: WindPower, label: '空气质量', value: air.text, unit: ` PM2.5 ${Math.round(pm25)}`, level: air.level },
    { key: 'anion', icon: Odometer, label: '负氧离子', value: Math.round(anion).toLocaleString(), unit: ' 个/cm³', level: anion > 4500 ? 'success' : 'primary', extra: '浓度高' }
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
.env-row {
  row-gap: 16px;
}
.env-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #e6dfd1;
  border-top: 5px solid #3e9a66; /* 上色条，语义色随等级 */
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 2px 10px rgba(58, 46, 24, 0.05);
  height: 100%;
}
.env-card.is-warning {
  border-top-color: #d89b2b;
}
.env-card.is-danger {
  border-top-color: #c8563a;
}
.env-card.is-primary {
  border-top-color: #2b6349;
}
.env-icon {
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: #f0f2e6;
  color: #2b6349;
  display: flex;
  align-items: center;
  justify-content: center;
}
.env-value {
  font-size: 24px;
  font-weight: 800;
  color: #26463a;
  line-height: 1.2;
}
.env-value .unit {
  font-size: 13px;
  color: #5f7368;
  font-weight: 400;
}
.env-label {
  margin-top: 2px;
  color: #5f7368;
  font-size: 14px;
}
.extra {
  color: #3e9a66;
}
</style>
