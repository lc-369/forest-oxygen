<template>
  <div v-loading="!me" element-loading-text="正在加载个人信息…">
    <h2 class="page-title">个人中心</h2>

    <el-card v-if="me" shadow="never" class="panel">
      <template #header><span class="head-title">我的资料 <span class="text-secondary">（信息由管理员统一维护，仅可查看）</span></span></template>
      <div class="info-grid">
        <div class="info-item"><span class="k">工号</span><span class="v">{{ me.id }}</span></div>
        <div class="info-item"><span class="k">姓名</span><span class="v">{{ me.name }}</span></div>
        <div class="info-item"><span class="k">性别</span><span class="v">{{ me.gender }}</span></div>
        <div class="info-item"><span class="k">年龄</span><span class="v">{{ me.age }} 岁</span></div>
        <div class="info-item"><span class="k">手机</span><span class="v">{{ me.phone }}</span></div>
        <div class="info-item"><span class="k">薪资</span><span class="v">¥ {{ me.salary }} / 月</span></div>
        <div class="info-item"><span class="k">在职状态</span>
          <span class="v"><el-tag :type="me.status === 'active' ? 'success' : 'info'">{{ me.status === 'active' ? '在职' : '离职' }}</el-tag></span>
        </div>
      </div>
      <div class="skill-block">
        <span class="skill-label">可服务项目：</span>
        <template v-if="skillNames.length">
          <el-tag v-for="pid in me.skills" :key="pid" size="large" effect="plain" class="skill-tag">{{ skillNames[pid] || pid }}</el-tag>
        </template>
        <span v-else class="text-secondary">暂无（由管理员配置）</span>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'

const auth = useAuthStore()
const me = computed(() => auth.profile)

// 项目编号 → 名称映射（用于展示“可服务项目”）
const projMap = ref({})

async function loadProjects() {
  try {
    const data = await api.projects()
    const map = {}
    ;(data.items || []).forEach(p => { map[p.id] = p.name })
    projMap.value = map
  } catch (e) {
    // 项目列表加载失败不阻塞个人中心展示
  }
}

const skillNames = computed(() => projMap.value)

onMounted(loadProjects)
</script>

<style scoped>
.panel {
  border-radius: 14px;
}
.head-title {
  font-size: 17px;
  font-weight: 700;
  color: #2d6a4f;
}
.skill-block {
  margin-top: 16px;
  padding: 14px 16px;
  background: #f7faf8;
  border-radius: 10px;
  font-size: 16px;
}
.skill-label {
  color: #7a8a83;
}
.skill-tag {
  margin: 2px 6px 2px 0;
}
</style>
