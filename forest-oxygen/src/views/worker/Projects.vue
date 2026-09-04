<template>
  <div>
    <h2 class="page-title">项目总览</h2>
    <p class="text-secondary" style="margin-bottom: 16px">园区全部康养服务项目（只读），点击「查看」了解项目详情与时段容量。</p>

    <el-table v-loading="loading" :data="projects" stripe>
      <el-table-column prop="id" label="编号" width="90" />
      <el-table-column prop="name" label="项目名称" min-width="200" show-overflow-tooltip />
      <el-table-column prop="location" label="地点" min-width="130" />
      <el-table-column label="费用" width="110" align="right">
        <template #default="{ row }">¥ {{ row.fee }} / 次</template>
      </el-table-column>
      <el-table-column prop="duration" label="单次时长" width="130" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '进行中' : '已停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button type="primary" plain size="large" @click="router.push(`/worker/projects/${row.id}`)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'

const router = useRouter()
const projects = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await api.projects() // 护工同管理员：含停用项目（只读）
    projects.value = data.items || []
  } catch (e) {
    ElMessage.error(e.message || '项目列表加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
