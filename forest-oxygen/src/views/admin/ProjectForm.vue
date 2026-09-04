<template>
  <div>
    <div class="head-row">
      <el-button size="large" @click="goBack">
        <el-icon style="margin-right: 6px"><Back /></el-icon>返回
      </el-button>
      <h2 class="page-title" style="margin-bottom: 0">{{ isEdit ? `编辑项目 · ${form.name || ''}` : '添加新项目' }}</h2>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="left" label-width="120px" size="large" class="project-form">
      <!-- 基本信息 -->
      <el-card shadow="never" class="panel">
        <template #header><span class="head-title">基本信息</span></template>
        <el-row :gutter="24">
          <el-col :md="12" :sm="24">
            <el-form-item label="项目名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入项目名称，如：森林浴·负氧离子漫步" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :md="12" :sm="24">
            <el-form-item label="项目地点" prop="location">
              <el-input v-model="form.location" placeholder="如：湖畔步道 / 养生馆二楼" maxlength="30" />
            </el-form-item>
          </el-col>
          <el-col :md="8" :sm="24">
            <el-form-item label="费用(元)" prop="fee">
              <el-input-number v-model="form.fee" :min="0" :max="99999" :controls="false" style="width: 100%" placeholder="如 88" />
            </el-form-item>
          </el-col>
          <el-col :md="8" :sm="24">
            <el-form-item label="时段最大容量" prop="capacity">
              <el-input-number v-model="form.capacity" :min="1" :max="100" :controls="false" style="width: 100%" placeholder="同一时段可服务人数" />
            </el-form-item>
          </el-col>
          <el-col :md="8" :sm="24">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio-button value="active">进行</el-radio-button>
                <el-radio-button value="disabled">停用</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="单次时长" prop="duration">
              <el-input v-model="form.duration" placeholder="如：约 90 分钟" maxlength="20" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 服务详细描述（附录一内容） -->
      <el-card shadow="never" class="panel">
        <template #header>
          <span class="head-title">服务详细描述 <span class="text-secondary">（依据《服务项目清单》编辑，为客户展示与护工服务参考）</span></span>
        </template>
        <el-form-item label="服务流程" prop="flow">
          <el-input v-model="form.flow" type="textarea" :rows="3" maxlength="300" show-word-limit placeholder="分步骤描述服务过程……" />
        </el-form-item>
        <el-form-item label="适合人群" prop="suitable">
          <el-input v-model="form.suitable" type="textarea" :rows="2" maxlength="150" show-word-limit />
        </el-form-item>
        <el-form-item label="禁忌事项" prop="taboo">
          <el-input v-model="form.taboo" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="不适宜人群与注意事项……" />
        </el-form-item>
      </el-card>

      <div class="action-bar">
        <el-button size="large" type="primary" :loading="saving" @click="onSave">
          <el-icon style="margin-right: 6px"><Check /></el-icon>{{ isEdit ? '保存修改' : '创建项目' }}
        </el-button>
        <el-button size="large" @click="goBack">取消</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { api } from '@/api'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const saving = ref(false)

const isEdit = computed(() => route.name === 'admin-project-edit')
const editingId = computed(() => route.params.id)

const form = reactive({
  name: '', location: '', fee: 0, capacity: 1, status: 'active',
  duration: '', flow: '', suitable: '', taboo: ''
})

const rules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  location: [{ required: true, message: '请输入项目地点', trigger: 'blur' }],
  fee: [{ required: true, message: '请输入费用', trigger: 'blur' }],
  capacity: [{ required: true, message: '请输入时段容量', trigger: 'blur' }]
}

async function loadForEdit() {
  if (!isEdit.value) return
  try {
    const p = await api.project(editingId.value)
    Object.assign(form, {
      name: p.name, location: p.location, fee: p.fee, capacity: p.capacity,
      status: p.status, duration: p.duration, flow: p.flow, suitable: p.suitable, taboo: p.taboo
    })
  } catch (e) {
    ElMessage.error(e.message || '项目信息加载失败')
    goBack()
  }
}

function goBack() {
  router.push('/admin/projects')
}

async function onSave() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  saving.value = true
  const payload = {
    name: form.name, location: form.location, fee: form.fee, capacity: form.capacity,
    status: form.status, duration: form.duration, flow: form.flow,
    suitable: form.suitable, taboo: form.taboo
  }
  try {
    if (isEdit.value) {
      await api.updateProject(editingId.value, payload)
      ElMessage.success('修改已保存')
    } else {
      const data = await api.createProject(payload)
      ElMessage.success(`创建成功！项目编号 ${data.id}`)
    }
    router.push('/admin/projects')
  } catch (e) {
    ElMessage.error(e.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

onMounted(loadForEdit)
</script>

<style scoped>
.head-row {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 1120px;
  margin: 0 auto 18px;
}
.project-form {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}
.panel {
  border-radius: 14px;
  margin-bottom: 16px;
}
.head-title {
  font-size: 17px;
  font-weight: 700;
  color: #2d6a4f;
}
.action-bar {
  margin-top: 8px;
  padding-bottom: 12px;
}
</style>
