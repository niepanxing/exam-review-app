<template>
  <div class="settings-page">
    <h2>⚙️ 设置</h2>
    <p class="page-desc">配置 AI 接口，用于自动出题</p>

    <el-form :model="form" label-position="top" class="settings-form">
      <el-card class="settings-card">
        <template #header>
          <span class="card-title">🤖 AI 接口配置</span>
        </template>

        <el-form-item label="API 地址">
          <el-input v-model="form.aiEndpoint" placeholder="https://api.openai.com/v1/chat/completions" />
          <div class="form-tip">支持 OpenAI 兼容格式的 API 地址（如 Deepseek、通义千问、本地 Ollama 等）</div>
        </el-form-item>

        <el-form-item label="API Key">
          <el-input v-model="form.aiApiKey" type="password" show-password placeholder="sk-..." />
          <div class="form-tip">
            {{ form.aiApiKeyMasked ? `当前: ${form.aiApiKeyMasked}` : '未配置' }}
          </div>
        </el-form-item>

        <el-form-item label="模型名称">
          <el-input v-model="form.aiModel" placeholder="gpt-4o-mini" />
          <div class="form-tip">
            常用: gpt-4o-mini / gpt-4o / deepseek-chat / qwen-plus / glm-4-flash
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="saving">保存设置</el-button>
          <el-button @click="testConnection" :loading="testing">测试连接</el-button>
        </el-form-item>
      </el-card>

      <el-card class="settings-card">
        <template #header>
          <span class="card-title">📝 出题参数</span>
        </template>

        <el-form-item label="每批出题数量">
          <el-input-number v-model="form.questionsPerBatch" :min="1" :max="30" />
        </el-form-item>

        <el-form-item label="默认难度">
          <el-radio-group v-model="form.difficulty">
            <el-radio value="easy">简单</el-radio>
            <el-radio value="medium">中等</el-radio>
            <el-radio value="hard">困难</el-radio>
            <el-radio value="mixed">混合</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="saving">保存</el-button>
        </el-form-item>
      </el-card>

      <el-card class="settings-card">
        <template #header>
          <span class="card-title">🗑️ 数据管理</span>
        </template>

        <el-form-item>
          <el-button type="warning" plain @click="clearProgress">清除做题记录</el-button>
          <el-button type="danger" plain @click="clearAllQuestions">清空题库</el-button>
        </el-form-item>
      </el-card>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const form = ref({
  aiEndpoint: 'https://api.openai.com/v1/chat/completions',
  aiApiKey: '',
  aiApiKeyMasked: '',
  aiModel: 'gpt-4o-mini',
  questionsPerBatch: 5,
  difficulty: 'mixed'
})
const saving = ref(false)
const testing = ref(false)

async function loadSettings() {
  try {
    const res = await axios.get('/api/settings')
    form.value = { ...form.value, ...res.data }
  } catch (e) { /* ignore */ }
}

async function saveSettings() {
  saving.value = true
  try {
    await axios.put('/api/settings', form.value)
    ElMessage.success('设置已保存')
    await loadSettings()
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  if (!form.value.aiApiKey && !form.value.aiApiKeyMasked) {
    ElMessage.warning('请先填写 API Key')
    return
  }
  testing.value = true
  try {
    // 先保存设置
    await axios.put('/api/settings', form.value)
    const res = await axios.post('/api/settings/test-ai')
    ElMessage.success(`连接成功！AI回复: ${res.data.message}`)
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '连接失败')
  } finally {
    testing.value = false
  }
}

async function clearProgress() {
  try {
    await ElMessageBox.confirm('确定清除所有做题记录？', '提示', { type: 'warning' })
    await axios.delete('/api/questions/clear-progress')
    ElMessage.success('做题记录已清除')
  } catch (e) { /* cancel */ }
}

async function clearAllQuestions() {
  try {
    await ElMessageBox.confirm('确定清空整个题库？此操作不可恢复！', '危险操作', { type: 'error' })
    // 获取所有题目ID然后批量删除
    const res = await axios.get('/api/questions', { params: { limit: 9999 } })
    const ids = res.data.map(q => q.id)
    if (ids.length > 0) {
      await axios.delete('/api/questions', { data: { ids } })
    }
    ElMessage.success('题库已清空')
  } catch (e) { /* cancel */ }
}

onMounted(() => loadSettings())
</script>

<style scoped>
.settings-page { max-width: 680px; }
.settings-page h2 { font-size: 22px; margin-bottom: 6px; }
.page-desc { color: var(--text-muted); margin-bottom: 24px; }

.settings-card { margin-bottom: 20px; }
.card-title { font-size: 16px; font-weight: 600; }

.form-tip { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
</style>
