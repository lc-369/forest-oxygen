<template>
  <div>
    <h2 class="page-title">护工管理</h2>

    <el-card shadow="never" class="panel">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索姓名 / 工号 / 手机号" clearable style="width: 280px" size="large">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <span class="text-secondary">共 {{ filtered.length }} 位护工</span>
      </div>

      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="id" label="工号" width="110" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="age" label="年龄" width="80" align="center" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="salary" label="薪资(元/月)" width="140" align="right">
          <template #default="{ row }">{{ row.salary?.toLocaleString?.() ?? row.salary }}</template>
        </el-table-column>
        <el-table-column label="可服务项目" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="row.skills && row.skills.length">
              <el-tag v-for="pid in row.skills" :key="pid" size="small" effect="plain" class="skill-tag">
                {{ projectShortName(pid) }}
              </el-tag>
            </template>
            <span v-else class="text-secondary">—</span>
          </template>
        </el-table-column>
        <el-table-column label="在职状态" width="130">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :disabled="switchingId === row.id"
              inline-prompt
              active-text="在职"
              inactive-text="离职"
              active-color="#52b788"
              inactive-color="#c0c4cc"
              @change="val => toggleStatus(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170">
          <template #default="{ row }">
            <el-button type="primary" plain size="large" @click="goSchedule(row)">编辑排班</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/api'

const router = useRouter()
const keyword = ref('')
const loading = ref(false)
const switchingId = ref('')

const workers = ref([])
const projMap = ref({})

const filtered = computed(() => {
  const k = keyword.value.trim()
  if (!k) return workers.value
  return workers.value.filter(u => u.name.includes(k) || u.id.includes(k) || u.phone.includes(k))
})

async function load() {
  loading.value = true
  try {
    const [wu, pu] = await Promise.all([
      api.listUsers('worker'),
      api.projects()
    ])
    workers.value = wu.items || []
    const map = {}
    ;(pu.items || []).forEach(p => { map[p.id] = p.name })
    projMap.value = map
  } catch (e) {
    ElMessage.error(e.message || '护工列表加载失败')
  } finally {
    loading.value = false
  }
}

function projectShortName(pid) {
  const name = projMap.value[pid]
  return name ? name.replace(/·.*$/, '') : pid
}

function goSchedule(row) {
  router.push(`/admin/workers/${row.id}/schedule`)
}

function toggleStatus(row, val) {
  const target = val ? 'active' : 'resigned'
  ElMessageBox.confirm(
    val
      ? `将「${row.name}」恢复为在职状态？`
      : `将「${row.name}」设为离职后，将不再自动分配新服务（已有预约保留）。确定离职？`,
    val ? '恢复在职' : '设为离职',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: val ? 'info' : 'warning' }
  ).then(async () => {
    switchingId.value = row.id
    try {
      await api.updateUser(row.id, { status: target })
      row.status = target
      ElMessage.success(val ? '已恢复在职' : '已设为离职')
    } catch (e) {
      ElMessage.error(e.message || '操作失败，请稍后重试')
    } finally {
      switchingId.value = ''
    }
  }).catch(() => {})
}

onMounted(load)
</script>

<style scoped>
.panel {
  border-radius: 14px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.skill-tag {
  margin: 2px 4px 2px 0;
}
</style>
