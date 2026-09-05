<template>
  <!-- 竖向整卡（客户数据看板样板：整块上色长条卡） -->
  <el-row v-if="layout === 'vertical'" :gutter="28" class="stat-row">
    <el-col v-for="s in stats" :key="s.label" :xs="12" :sm="12" :md="6">
      <div class="stat-tile" :style="tileVars(s)">
        <span class="tile-deco"></span>
        <div class="tile-top">
          <div class="tile-label">{{ s.label }}</div>
          <div class="tile-icon"><el-icon :size="21"><component :is="s.icon" /></el-icon></div>
        </div>
        <div class="tile-num-row">
          <span class="stat-tile-num display-num">{{ s.value }}</span>
          <span v-if="s.unit" class="unit">{{ s.unit }}</span>
        </div>
        <div v-if="s.sub" class="tile-sub">{{ s.sub }}</div>
      </div>
    </el-col>
  </el-row>

  <!-- 默认横向信息卡（管理员等原有看板保持不变，仅随主题换肤） -->
  <el-row v-else :gutter="20" class="stat-row">
    <el-col v-for="s in stats" :key="s.label" :xs="12" :sm="12" :md="6">
      <div class="stat-card">
        <div class="stat-left">
          <div class="stat-icon" :style="{ background: s.bg || '#eaefed', color: s.color || '#2b6349' }">
            <el-icon :size="30"><component :is="s.icon" /></el-icon>
          </div>
        </div>
        <div class="stat-right">
          <div class="stat-num display-num">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup>
defineProps({
  stats: { type: Array, required: true },
  layout: { type: String, default: 'default' }
})

// 竖向整卡四色套装（墨绿 / 米金 / 米白 / 陶土）——文字颜色由变量决定，绝不只靠颜色传达
const TONES = {
  green: {
    bg: 'linear-gradient(158deg, #245540 0%, #1f4636 55%, #2b6349 100%)',
    border: 'rgba(255,255,255,0.16)',
    num: '#ffffff',
    sub: 'rgba(255,255,255,0.85)',
    label: '#ffffff',
    icon: '#eedda6',
    iconBg: 'rgba(255,255,255,0.14)',
    shadow: 'rgba(20, 52, 39, 0.28)'
  },
  gold: {
    bg: 'linear-gradient(158deg, #ecdfba 0%, #e6d3a0 100%)',
    border: 'rgba(148, 118, 40, 0.25)',
    num: '#5f4a12',
    sub: '#6e5a28',
    label: '#58471c',
    icon: '#8a6a16',
    iconBg: 'rgba(122, 95, 19, 0.12)',
    shadow: 'rgba(158, 128, 60, 0.22)'
  },
  cream: {
    bg: '#fcf9f1',
    border: '#e6dfd1',
    num: '#1f4636',
    sub: '#5f7368',
    label: '#2e5a45',
    icon: '#2b6349',
    iconBg: 'rgba(43, 99, 73, 0.10)',
    shadow: 'rgba(58, 46, 24, 0.10)'
  },
  rust: {
    bg: 'linear-gradient(158deg, #f4e2da 0%, #ecc9b9 100%)',
    border: 'rgba(188, 108, 78, 0.28)',
    num: '#7c361f',
    sub: '#75462f',
    label: '#6b4028',
    icon: '#9a4a2d',
    iconBg: 'rgba(154, 74, 45, 0.12)',
    shadow: 'rgba(190, 110, 80, 0.20)'
  }
}

// 把色调映射为内联 CSS 变量（scoped 样式引用），无 tone 时回退米白
function tileVars(s) {
  const t = TONES[s.tone] || TONES.cream
  return {
    '--tile-bg': t.bg,
    '--tile-border': t.border,
    '--tile-num': t.num,
    '--tile-sub': t.sub,
    '--tile-label': t.label,
    '--tile-icon': t.icon,
    '--tile-icon-bg': t.iconBg,
    '--tile-shadow': t.shadow
  }
}
</script>

<style scoped>
.stat-row {
  row-gap: 50px;
}

/* ===== 竖向整卡（vertical）===== */
.stat-tile {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 140px;
  padding: 18px 20px;
  border-radius: 16px;
  background: var(--tile-bg);
  border: 1px solid var(--tile-border);
  box-shadow: 0 6px 18px var(--tile-shadow);
}
.tile-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.tile-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--tile-label);
  letter-spacing: 0.5px;
}
.tile-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--tile-icon-bg);
  color: var(--tile-icon);
}
.tile-num-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.stat-tile-num {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  color: var(--tile-num);
}
.tile-num-row .unit {
  font-size: 15px;
  font-weight: 600;
  color: var(--tile-sub);
}
.tile-sub {
  position: relative;
  z-index: 1;
  font-size: 13px;
  color: var(--tile-sub);
}
/* 整卡角落的圆形柔光装饰（纯装饰，不传达信息） */
.tile-deco {
  position: absolute;
  right: -30px;
  bottom: -44px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, transparent 68%);
  pointer-events: none;
}

/* ===== 默认横向卡（default / 管理员等） ===== */
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e6dfd1;
  box-shadow: 0 2px 10px rgba(58, 46, 24, 0.05);
  height: 100%;
  transition: transform 0.15s;
}
.stat-card:hover {
  transform: translateY(-2px);
}
.stat-icon {
  width: 62px;
  height: 62px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-num {
  font-size: 30px;
  font-weight: 800;
  color: #26463a;
  line-height: 1.1;
}
.stat-label {
  margin-top: 4px;
  color: #5f7368;
  font-size: 15px;
}
</style>
