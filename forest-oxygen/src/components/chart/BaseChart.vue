<template>
  <div ref="el" class="base-chart" :style="{ height: px(height) }"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import echarts from '@/utils/echarts'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: [Number, String], default: 280 },
  autoresize: { type: Boolean, default: true }
})

const el = ref(null)
let chart = null
let ro = null

const px = v => (typeof v === 'number' ? v + 'px' : v)

function render() {
  if (!chart) return
  chart.setOption(props.option, { notMerge: false, lazyUpdate: true })
}
function safeResize() {
  // 卡片可能初始为 0 宽（懒加载/隐藏），跳过直到可见，ResizeObserver 会在有尺寸后再触发
  if (!chart || !el.value || el.value.clientWidth === 0) return
  chart.resize()
}

onMounted(() => {
  chart = echarts.init(el.value)
  render()
  if (props.autoresize && typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => safeResize())
    ro.observe(el.value)
  }
})
watch(() => props.option, () => render())

onBeforeUnmount(() => {
  ro && ro.disconnect()
  chart && chart.dispose()
  chart = null
})
</script>

<style scoped>
.base-chart {
  width: 100%;
}
</style>
