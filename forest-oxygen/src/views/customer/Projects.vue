<template>
  <div>
    <h2 class="page-title">项目总览</h2>
    <p class="text-secondary" style="margin-bottom: 16px">
      园区全部康养服务项目。停用项目不可预约；预约后系统自动为您匹配空闲护工。
    </p>

    <el-table v-loading="loading" :data="projects" stripe>
      <el-table-column prop="id" label="编号" width="90" />
      <el-table-column prop="name" label="项目名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="location" label="地点" min-width="120" />
      <el-table-column label="费用" width="110" align="right">
        <template #default="{ row }">¥ {{ row.fee }} / 次</template>
      </el-table-column>
      <el-table-column prop="capacity" label="时段容量" width="90" align="center" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '进行中' : '已停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="190">
        <template #default="{ row }">
          <el-button size="large" plain type="primary" @click="router.push(`/customer/projects/${row.id}`)">查看</el-button>
          <el-button
            size="large"
            type="success"
            :disabled="row.status !== 'active'"
            @click="openBook(row)"
          >预约</el-button>
        </template>
      </el-table-column>
    </el-table>

    <BookingDialog v-model="bookVisible" :project="bookProject" @booked="onBooked" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import BookingDialog from '@/components/BookingDialog.vue'

const router = useRouter()

const projects = ref([])
const loading = ref(false)
const bookVisible = ref(false)
const bookProject = ref(null)

async function load() {
  loading.value = true
  try {
    const data = await api.projects() // 客户仅返回进行中项目
    projects.value = data.items || []
  } catch (e) {
    ElMessage.error(e.message || '项目列表加载失败')
  } finally {
    loading.value = false
  }
}

function openBook(row) {
  bookProject.value = row
  bookVisible.value = true
}
function onBooked() {
  // 预约已写入服务端；下次打开对话框会自动刷新余量，无需在此处理
}

onMounted(load)
</script>
