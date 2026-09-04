<template>
  <div>
    <h2 class="page-title">客户管理</h2>

    <el-card shadow="never" class="panel">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索姓名 / 编号 / 手机号" clearable style="width: 280px" size="large">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <span class="text-secondary">共 {{ filtered.length }} 位客户</span>
      </div>

      <el-table v-loading="loading" :data="filtered" stripe>
        <el-table-column prop="id" label="编号" width="110" />
        <el-table-column prop="name" label="姓名" width="130" />
        <el-table-column prop="age" label="年龄" width="90" align="center" />
        <el-table-column prop="phone" label="手机号" min-width="150" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="primary" plain size="large" @click="openDetail(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 客户详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`客户详情 · ${current?.name || ''}`" width="760px" top="6vh">
      <template v-if="current">
        <div class="info-grid">
          <div class="info-item"><span class="k">编号</span><span class="v">{{ current.id }}</span></div>
          <div class="info-item"><span class="k">姓名</span><span class="v">{{ current.name }}</span></div>
          <div class="info-item"><span class="k">年龄</span><span class="v">{{ current.age }} 岁</span></div>
          <div class="info-item"><span class="k">手机号</span><span class="v">{{ current.phone }}</span></div>
          <div class="info-item wide"><span class="k">忌口</span><span class="v">{{ current.allergy || '无' }}</span></div>
          <div class="info-item wide"><span class="k">疾病史</span><span class="v">{{ current.disease || '无' }}</span></div>
          <div class="info-item wide"><span class="k">偏好</span><span class="v">{{ current.preference || '无' }}</span></div>
        </div>

        <el-divider content-position="left">预约的服务项目（今/明/后天 × 4 时段）</el-divider>
        <el-table v-loading="bookingLoading" :data="currentBookings" size="large" empty-text="该客户当前没有待服务预约">
          <el-table-column label="日期" width="110">
            <template #default="{ row }">
              <el-tag type="primary" effect="plain" size="large">{{ dateTag(row.serviceDate) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时段" min-width="190">
            <template #default="{ row }">{{ SLOT_TITLE[row.slot] }} · {{ SLOT_TIME[row.slot] }}</template>
          </el-table-column>
          <el-table-column label="项目名称" min-width="170" prop="projectName" show-overflow-tooltip />
          <el-table-column label="负责护工" min-width="180">
            <template #default="{ row }">{{ row.workerName }}（{{ row.workerId }}）</template>
          </el-table-column>
        </el-table>
        <div class="footer-count">当前待服务预约：{{ currentBookings.length }} 项</div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '@/api'
import { DAYS, SLOT_TITLE, SLOT_TIME } from '@/utils/config'
import { dayIndexOf } from '@/utils/dates'

const keyword = ref('')
const loading = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const currentBookings = ref([])
const bookingLoading = ref(false)

const customers = ref([])

const filtered = computed(() => {
  const k = keyword.value.trim()
  if (!k) return customers.value
  return customers.value.filter(u => u.name.includes(k) || u.id.includes(k) || u.phone.includes(k))
})

function dateTag(serviceDate) {
  const idx = dayIndexOf(serviceDate, 3)
  return idx >= 0 ? DAYS[idx].label : serviceDate
}

async function load() {
  loading.value = true
  try {
    const data = await api.listUsers('customer')
    customers.value = data.items || []
  } catch (e) {
    ElMessage.error(e.message || '客户列表加载失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(row) {
  current.value = row
  detailVisible.value = true
  bookingLoading.value = true
  try {
    const data = await api.customerBookings(row.id, 'window')
    currentBookings.value = (data.items || []).slice().sort((a, b) =>
      a.serviceDate === b.serviceDate ? a.slot - b.slot : a.serviceDate < b.serviceDate ? -1 : 1
    )
  } catch (e) {
    currentBookings.value = []
    ElMessage.error(e.message || '预约信息加载失败')
  } finally {
    bookingLoading.value = false
  }
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
.ml-auto {
  margin-left: auto;
}
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.info-item.wide {
  grid-column: span 2;
}
.footer-count {
  margin-top: 14px;
  text-align: right;
  font-size: 16px;
  font-weight: 700;
  color: #2d6a4f;
}
</style>
