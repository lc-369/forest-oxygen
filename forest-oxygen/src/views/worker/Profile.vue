<template>
  <div v-loading="!me" element-loading-text="正在加载个人信息…">
    <h2 class="page-title">个人中心</h2>

    <div class="center-col-sm">
      <el-card v-if="me" shadow="never" class="panel">
        <template #header>
          <span class="head-title">我的资料 <span class="text-secondary">（信息由管理员统一维护，仅可查看）</span></span>
        </template>

        <!-- 竖向单列资料：行距宽松，从上到下逐行阅读 -->
        <div class="vlist">
          <div class="vrow">
            <span class="k">工号</span>
            <span class="v display-num">{{ me.id }}</span>
          </div>
          <div class="vrow">
            <span class="k">姓名</span>
            <span class="v">{{ me.name }}</span>
          </div>
          <div class="vrow">
            <span class="k">性别</span>
            <span class="v">{{ me.gender }}</span>
          </div>
          <div class="vrow">
            <span class="k">年龄</span>
            <span class="v">{{ me.age }} 岁</span>
          </div>
          <div class="vrow">
            <span class="k">手机号</span>
            <span class="v display-num">{{ me.phone }}</span>
          </div>
          <div class="vrow">
            <span class="k">月薪</span>
            <span class="v display-num">¥ {{ me.salary }} / 月</span>
          </div>
          <div class="vrow vrow-last">
            <span class="k">在职状态</span>
            <span class="v">
              <el-tag :type="me.status === 'active' ? 'success' : 'info'" size="large">
                {{ me.status === 'active' ? '在职' : '离职' }}
              </el-tag>
            </span>
          </div>
        </div>

        <div class="skill-block">
          <span class="skill-label">可服务项目：</span>
          <template v-if="skillNames.length">
            <el-tag v-for="pid in me.skills" :key="pid" size="large" effect="plain" round class="skill-tag">
              {{ skillNames[pid] || pid }}
            </el-tag>
          </template>
          <span v-else class="text-secondary">暂无（由管理员配置）</span>
        </div>
      </el-card>
    </div>
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
  border-radius: 16px;
}
.head-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f4636;
}

/* 竖向单列资料 */
.vlist {
  display: flex;
  flex-direction: column;
}
.vrow {
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 60px; /* 适老化：竖向行距放宽 */
  padding: 6px 8px;
  border-bottom: 1px solid #efe8db;
}
.vrow-last {
  border-bottom: none;
}
.vrow .k {
  flex: none;
  width: 180px;
  font-size: 16px;
  color: #5f7368;
}
.vrow .v {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  color: #26463a;
}

.skill-block {
  margin-top: 20px;
  padding: 18px 20px;
  background: #f7faf8;
  border-radius: 14px;
  font-size: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.skill-label {
  color: #5f7368;
}
.skill-tag {
  margin: 2px 0;
}

@media (max-width: 640px) {
  .vrow {
    flex-wrap: wrap;
    gap: 6px 16px;
    padding: 12px 4px;
  }
  .vrow .k {
    width: 100%;
  }
  .vrow .v {
    flex: none;
    width: 100%;
  }
}
</style>
