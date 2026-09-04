<template>
  <div class="ai-page">
    <h2 class="page-title">AI 健康咨询</h2>

    <div class="chat-card">
      <!-- 聊天头部 -->
      <div class="chat-head">
        <div class="bot-avatar">🌲</div>
        <div>
          <div class="bot-name">小氧 · 康养AI助手</div>
          <div class="bot-status"><span class="status-dot"></span>在线，随时为您答疑</div>
        </div>
        <el-tag type="success" effect="light" class="api-tag">豆包 API · 模拟模式</el-tag>
      </div>

      <!-- 消息区 -->
      <div ref="msgBox" class="chat-body">
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.from">
          <div v-if="m.from === 'bot'" class="avatar bot">🌲</div>
          <div class="bubble">{{ m.text }}</div>
          <div v-if="m.from === 'me'" class="avatar me">🙂</div>
        </div>
        <div v-if="typing" class="msg bot">
          <div class="avatar bot">🌲</div>
          <div class="bubble typing"><span></span><span></span><span></span></div>
        </div>
      </div>

      <!-- 常见问题快捷入口 -->
      <div class="quick-area">
        <div class="quick-title">💬 常见问题（点一下即可提问）</div>
        <div class="quick-list">
          <button v-for="q in quickQuestions" :key="q" class="quick-chip" @click="send(q)">{{ q }}</button>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="chat-input">
        <el-input
          v-model="input"
          placeholder="请输入您想问的健康、预约相关问题……"
          size="large"
          clearable
          @keyup.enter="send(input)"
        />
        <el-button type="primary" size="large" :loading="typing" @click="send(input)">
          <el-icon style="margin-right: 4px"><Promotion /></el-icon>发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { askAI } from '@/services/ai'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const input = ref('')
const typing = ref(false)
const msgBox = ref(null)

const WELCOME = name =>
  `您好呀${name ? ' ' + name : ''}！我是森林氧吧的 AI 康养助手小氧 🌲，可以为您解答预约、项目推荐、饮食健康等各类问题，也可以点下方的常见问题哦～`

const messages = ref([{ from: 'bot', text: WELCOME(auth.profile?.name) }])

// 个人资料异步返回后，把欢迎语补上称呼
watch(() => auth.profile?.name, name => {
  if (name && messages.value[0] && messages.value[0].from === 'bot') {
    messages.value[0].text = WELCOME(name)
  }
})

const quickQuestions = [
  '今天有哪些项目推荐？',
  '怎么预约康养项目？',
  '每个项目大概多少钱？',
  '我适合做艾灸理疗吗？',
  '药膳餐会根据我的忌口安排吗？',
  '怎么查看园区地图？'
]

async function send(text) {
  const value = (text || '').trim()
  if (!value || typing.value) return
  messages.value.push({ from: 'me', text: value })
  input.value = ''
  typing.value = true
  scrollBottom()
  const reply = await askAI(value)
  typing.value = false
  messages.value.push({ from: 'bot', text: reply })
  scrollBottom()
}

function scrollBottom() {
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
  })
}

onMounted(scrollBottom)
</script>

<style scoped>
.ai-page {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}
.chat-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #e2ece6;
  box-shadow: 0 4px 18px rgba(45, 106, 79, 0.08);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  min-height: 480px;
}
.chat-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(120deg, #2d6a4f, #3f8a68);
  color: #fff;
  border-radius: 16px 16px 0 0;
}
.bot-avatar {
  font-size: 32px;
}
.bot-name {
  font-size: 18px;
  font-weight: 700;
}
.bot-status {
  font-size: 13px;
  opacity: 0.9;
}
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b8f2c5;
  margin-right: 5px;
}
.api-tag {
  margin-left: auto;
}
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  background: #f7fbf8;
}
.msg {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  align-items: flex-start;
}
.msg.me {
  flex-direction: row-reverse;
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.avatar.bot {
  background: #e2efe7;
}
.avatar.me {
  background: #fff3d9;
}
.bubble {
  max-width: 74%;
  padding: 12px 15px;
  border-radius: 14px;
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-line;
  color: #2b3a33;
  background: #fff;
  border: 1px solid #e2ece6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.msg.me .bubble {
  background: #2d6a4f;
  color: #fff;
  border-color: #2d6a4f;
}
.typing span {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
  background: #9cc2af;
  animation: blink 1.2s infinite;
}
.typing span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes blink {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}
.quick-area {
  padding: 12px 20px;
  border-top: 1px solid #eef3f0;
}
.quick-title {
  color: #5f776c;
  font-size: 14px;
  margin-bottom: 8px;
}
.quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.quick-chip {
  border: 1px solid #a8cfba;
  background: #eff8f3;
  color: #2d6a4f;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.15s;
}
.quick-chip:hover {
  background: #2d6a4f;
  color: #fff;
}
.chat-input {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #eef3f0;
}
</style>
