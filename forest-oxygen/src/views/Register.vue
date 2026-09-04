<template>
  <div class="auth-page">
    <div class="auth-left">
      <img :src="forestImg" alt="森林康养基地实景" class="scene-img" />
    </div>

    <div class="auth-right">
      <div class="form-box">
        <div class="form-title">
          <span class="logo">🌲</span>
          <h2>注册账号</h2>
          <p class="sub">选择角色并填写资料，注册后即可登录</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
          <el-form-item label="角色" prop="role">
            <el-radio-group v-model="form.role">
              <el-radio-button value="customer">我是客户</el-radio-button>
              <el-radio-button value="worker">我是护工</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="姓名 / 昵称" prop="name">
            <el-input v-model="form.name" placeholder="请输入真实姓名或昵称" maxlength="20" />
          </el-form-item>

          <el-form-item label="年龄" prop="age">
            <el-input-number v-model="form.age" :min="0" :max="150" :controls="false" style="width: 100%" placeholder="0 - 150 岁" />
          </el-form-item>

          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="form.gender">
              <el-radio value="男">男</el-radio>
              <el-radio value="女">女</el-radio>
              <el-radio value="保密">保密</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="11 位手机号（将作为登录账号）" maxlength="11" clearable />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="8 位数字密码" maxlength="8" show-password />
          </el-form-item>

          <el-form-item label="确认密码" prop="confirm">
            <el-input v-model="form.confirm" type="password" placeholder="请再次输入密码" maxlength="8" show-password />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" class="submit-btn" size="large" :loading="loading" @click="onSubmit">注 册</el-button>
          </el-form-item>
        </el-form>

        <div class="switch-line">
          已有账号？
          <el-link type="primary" @click="router.push('/login')">去登录</el-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import forestImg from '@/assets/forest.svg'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  role: 'customer', name: '', age: 60, gender: '保密',
  phone: '', password: '', confirm: ''
})

const checkConfirm = (rule, value, callback) => {
  if (value !== form.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}

const rules = {
  role: [{ required: true, message: '请选择注册角色', trigger: 'change' }],
  name: [{ required: true, message: '请输入姓名/昵称', trigger: 'blur' }],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' },
    { type: 'number', min: 0, max: 150, message: '年龄需在 0~150 之间', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^\d{11}$/, message: '手机号必须为 11 位数字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^\d{8}$/, message: '密码必须为 8 位数字', trigger: 'blur' }
  ],
  confirm: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: checkConfirm, trigger: 'blur' }
  ]
}

async function onSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  loading.value = true
  try {
    const user = await auth.register({
      role: form.role,
      name: form.name,
      phone: form.phone,
      password: form.password,
      age: form.age,
      gender: form.gender
    })
    ElMessage.success(`注册成功！您的编号为 ${user.id}（${form.role === 'customer' ? '客户' : '护工'}）`)
    router.push('/login')
  } catch (e) {
    ElMessage.error(e.message || '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  height: 100vh;
  width: 100vw;
}
.auth-left {
  flex: 1.15;
  position: relative;
  background: #1f4636;
  overflow: hidden;
}
.scene-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.auth-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 24px 40px;
  overflow-y: auto;
}
.form-box {
  width: 100%;
  max-width: 430px;
}
.form-title {
  text-align: center;
  margin-bottom: 18px;
}
.form-title .logo {
  font-size: 40px;
}
.form-title h2 {
  font-size: 26px;
  color: #2d6a4f;
  margin: 4px 0;
}
.form-title .sub {
  color: #7a8a83;
  font-size: 15px;
}
.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 18px;
  letter-spacing: 4px;
  font-weight: 700;
}
.switch-line {
  text-align: center;
  margin-top: 6px;
  color: #7a8a83;
  font-size: 15px;
}
@media (max-width: 900px) {
  .auth-left {
    display: none;
  }
}
</style>
