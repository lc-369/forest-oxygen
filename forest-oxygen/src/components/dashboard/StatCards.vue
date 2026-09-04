<template>
  <el-row :gutter="20" class="stat-row">
    <el-col v-for="s in stats" :key="s.label" :xs="12" :sm="12" :md="6">
      <div class="stat-card">
        <div class="stat-left">
          <div class="stat-icon" :style="{ background: s.bg || '#e8f5ee', color: s.color || '#2d6a4f' }">
            <el-icon :size="30"><component :is="s.icon" /></el-icon>
          </div>
        </div>
        <div class="stat-right">
          <div class="stat-num">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup>
defineProps({
  stats: { type: Array, required: true }
})
</script>

<style scoped>
.stat-row {
  row-gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #e2ece6;
  box-shadow: 0 2px 10px rgba(45, 106, 79, 0.06);
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
  color: #22352b;
  line-height: 1.1;
}
.stat-label {
  margin-top: 4px;
  color: #7a8a83;
  font-size: 15px;
}
</style>
