<template>
  <div class="auth-page">
    <!-- 左侧：康养院实景图位 -->
    <div class="auth-left">
      <img :src="forestImg" alt="森林康养基地实景" class="scene-img" />
      <div class="left-slogan">
        <h1>森林氧吧 · AI智慧康养</h1>
        <p>让每一口呼吸，都回归森林的治愈力</p>
      </div>
    </div>

    <!-- 右侧：登录表单 -->
    <div class="auth-right">
      <div class="form-box">
        <div class="form-title">
          <span class="logo">🌲</span>
          <h2>欢迎回来</h2>
          <p class="sub">请输入您的手机号与密码登录</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
          <el-form-item prop="phone">
            <el-input v-model="form.phone" placeholder="请输入 11 位手机号" maxlength="11" clearable>
              <template #prefix><el-icon><Iphone /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" placeholder="请输入 8 位数字密码" type="password" maxlength="8" show-password>
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="submit-btn" size="large" :loading="loading" @click="onSubmit">登 录</el-button>
          </el-form-item>
        </el-form>

        <div class="switch-line">
          还没有账号？
          <el-link type="primary" @click="router.push('/register')">去注册</el-link>
        </div>

        <!-- 账号说明 -->
        <div class="demo-box">
          <p class="demo-title">💡 账号说明</p>
          <ul class="demo-tip">
            <li>护工、客户账号请先点击下方「去注册」自助注册。</li>
            <li>系统管理员初始账号由 <code>server/.env</code> 配置（默认见部署说明）。</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { HOME_PATH } from '@/router/menus'
import forestImg from '@/assets/forest.svg'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({ phone: '', password: '' })

const rules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^\d{11}$/, message: '手机号必须为 11 位数字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { pattern: /^\d{8}$/, message: '密码必须为 8 位数字', trigger: 'blur' }
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
    const user = await auth.login(form.phone, form.password)
    ElMessage.success(`欢迎回来，${user.name}！`)
    const target = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : HOME_PATH[user.role]
    router.push(target)
  } catch (e) {
    ElMessage.error(e.message || '登录失败，请稍后重试')
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
  display: flex;
  align-items: center;
  justify-content: center;
}
.scene-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.left-slogan {
  position: relative;
  z-index: 2;
  text-align: center;
  color: #fff;
  padding: 0 30px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
}
.left-slogan h1 {
  font-size: 40px;
  letter-spacing: 3px;
  margin-bottom: 14px;
}
.left-slogan p {
  font-size: 19px;
  opacity: 0.92;
}
.auth-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 30px 40px;
  overflow-y: auto;
}
.form-box {
  width: 100%;
  max-width: 400px;
}
.form-title {
  text-align: center;
  margin-bottom: 26px;
}
.form-title .logo {
  font-size: 44px;
}
.form-title h2 {
  font-size: 28px;
  color: #2d6a4f;
  margin: 6px 0 4px;
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
  margin-top: 4px;
  color: #7a8a83;
  font-size: 15px;
}
.demo-box {
  margin-top: 22px;
  padding: 14px 16px;
  background: #f4faf7;
  border: 1px dashed #7fb89e;
  border-radius: 12px;
}
.demo-title {
  color: #2d6a4f;
  font-size: 14px;
  margin-bottom: 10px;
  font-weight: 600;
}
.demo-tip {
  margin: 0;
  padding-left: 18px;
  color: #4a5f57;
  font-size: 14px;
  line-height: 1.9;
}
.demo-tip code {
  background: #e6f2ec;
  color: #2d6a4f;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 13px;
}
@media (max-width: 900px) {
  .auth-left {
    display: none;
  }
}
</style>
