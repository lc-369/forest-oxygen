<template>
  <div>
    <div class="head-row">
      <h2 class="page-title">项目管理</h2>
      <el-button type="primary" size="large" @click="router.push('/admin/projects/new')">
        <el-icon style="margin-right: 6px"><Plus /></el-icon>添加新项目
      </el-button>
    </div>

    <el-card shadow="never" class="panel">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索项目编号 / 名称 / 地点" clearable style="width: 300px" size="large">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <span class="text-secondary">共 {{ filtered.length }} 个项目（{{ activeCount }} 个进行中）</span>
      </div>

      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="id" label="编号" width="90" />
        <el-table-column prop="name" label="项目名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="location" label="地点" min-width="130" />
        <el-table-column label="费用" width="110" align="right">
          <template #default="{ row }">¥ {{ row.fee }}</template>
        </el-table-column>
        <el-table-column label="时段最大容量" width="130" align="center">
          <template #default="{ row }">{{ row.capacity }} 人</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :disabled="switchingId === row.id"
              inline-prompt
              active-text="进行"
              inactive-text="停用"
              active-color="#52b788"
              inactive-color="#c0c4cc"
              @change="val => toggleStatus(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="large" plain type="primary" @click="router.push(`/admin/projects/${row.id}`)">查看</el-button>
            <el-button size="large" type="warning" plain @click="router.push(`/admin/projects/${row.id}/edit`)">编辑</el-button>
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
const projects = ref([])

const filtered = computed(() => {
  const k = keyword.value.trim()
  if (!k) return projects.value
  return projects.value.filter(p => p.id.includes(k) || p.name.includes(k) || p.location.includes(k))
})
const activeCount = computed(() => projects.value.filter(p => p.status === 'active').length)

async function load() {
  loading.value = true
  try {
    const data = await api.projects() // 管理员可见全部项目（含停用）
    projects.value = data.items || []
  } catch (e) {
    ElMessage.error(e.message || '项目列表加载失败')
  } finally {
    loading.value = false
  }
}

function toggleStatus(row, val) {
  const target = val ? 'active' : 'disabled'
  ElMessageBox.confirm(
    val ? `确定将「${row.name}」恢复为进行状态？` : `停用「${row.name}」后，客户将无法预约该项目。确定停用？`,
    '项目状态',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: val ? 'info' : 'warning' }
  ).then(async () => {
    switchingId.value = row.id
    try {
      await api.updateProject(row.id, { status: target })
      row.status = target
      ElMessage.success(val ? '项目已恢复进行' : '项目已停用')
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
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.panel {
  border-radius: 14px;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
</style>
