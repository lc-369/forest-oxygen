<template>
  <div class="center-col">
    <h2 class="page-title">个人中心</h2>

    <div v-loading="!me" element-loading-text="正在加载个人资料…" style="min-height: 160px">
    <el-card v-if="me" shadow="never" class="panel">
      <template #header>
        <div class="card-head">
          <span class="head-title">我的健康档案</span>
          <el-tag type="warning" effect="light">隐私提示</el-tag>
        </div>
      </template>
      <el-alert type="info" :closable="false" show-icon title="忌口、疾病史、偏好等敏感健康信息仅本人与负责您的护工可见。修改后即时同步，用于预约服务时更贴心的照护。" style="margin-bottom: 16px" />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="left" label-width="110px" size="large">
        <el-row :gutter="24">
          <el-col :md="8" :sm="24">
            <el-form-item label="客户编号">
              <el-input :model-value="me.id" disabled />
            </el-form-item>
          </el-col>
          <el-col :md="8" :sm="24">
            <el-form-item label="手机号">
              <el-input :model-value="me.phone" disabled />
            </el-form-item>
          </el-col>
          <el-col :md="8" :sm="24">
            <el-form-item label="性别">
              <el-select v-model="form.gender" style="width: 100%">
                <el-option value="男" label="男" />
                <el-option value="女" label="女" />
                <el-option value="保密" label="保密" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :md="12" :sm="24">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :md="12" :sm="24">
            <el-form-item label="年龄" prop="age">
              <el-input-number v-model="form.age" :min="0" :max="150" :controls="false" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="忌口" prop="allergy">
              <el-input v-model="form.allergy" placeholder="如：海鲜、芒果、花生……（无则留空）" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="疾病史" prop="disease">
              <el-input v-model="form.disease" type="textarea" :rows="2" placeholder="如：高血压、糖尿病……（无则留空）" maxlength="120" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="个人偏好" prop="preference">
              <el-input v-model="form.preference" type="textarea" :rows="2" placeholder="如：喜欢安静的早晨散步，偏好室内项目……" maxlength="120" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" size="large" :loading="saving" @click="onSave">
            <el-icon style="margin-right: 6px"><Check /></el-icon>保存修改
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const formRef = ref(null)
const saving = ref(false)
const me = computed(() => auth.profile)

const form = reactive({ name: '', gender: '保密', age: 0, allergy: '', disease: '', preference: '' })
watch(() => auth.profile, (u) => {
  if (u) Object.assign(form, {
    name: u.name, gender: u.gender || '保密', age: u.age,
    allergy: u.allergy || '', disease: u.disease || '', preference: u.preference || ''
  })
}, { immediate: true })

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  age: [{ type: 'number', min: 0, max: 150, message: '年龄需在 0~150 之间', trigger: 'blur' }]
}

async function onSave() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  saving.value = true
  try {
    await auth.updateProfile({
      name: form.name, gender: form.gender, age: form.age,
      allergy: form.allergy, disease: form.disease, preference: form.preference
    })
    ElMessage.success('健康档案已更新')
  } catch (e) {
    ElMessage.error(e.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.panel {
  border-radius: 14px;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.head-title {
  font-size: 17px;
  font-weight: 700;
  color: #2d6a4f;
}
</style>
