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
          <span class="card-title">📦 数据备份与迁移</span>
        </template>

        <p class="form-tip" style="margin-bottom: 16px;">
          导出学习记录到文件，可跨设备/跨域名迁移数据。换域名后在新站点导入即可恢复所有进度。
        </p>

        <el-form-item>
          <el-button type="primary" plain @click="exportData" :loading="exporting">
            📤 导出学习记录
          </el-button>
          <el-button type="success" plain @click="triggerImport" :loading="importing">
            📥 导入学习记录
          </el-button>
          <input ref="fileInput" type="file" accept=".json" style="display:none" @change="handleImport" />
        </el-form-item>

        <div v-if="importPreview" class="import-preview">
          <el-alert type="info" :closable="false" style="margin-bottom: 12px;">
            <template #title>即将导入以下数据（将与现有数据合并）</template>
          </el-alert>
          <div class="import-detail">
            <span v-if="importPreview.progress">📊 做题记录 {{ importPreview.progress.records }} 条</span>
            <span v-if="importPreview.history">📝 考试历史 {{ importPreview.history }} 次</span>
            <span v-if="importPreview.examState">⏳ 进行中的考试 1 场</span>
            <span v-if="importPreview.theme">🎨 主题设置</span>
          </div>
          <el-button type="primary" @click="confirmImport" style="margin-top: 12px;">确认导入</el-button>
          <el-button @click="importPreview = null">取消</el-button>
        </div>
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
const exporting = ref(false)
const importing = ref(false)
const fileInput = ref(null)
const importPreview = ref(null)
let pendingImportData = null

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

// ===== 数据备份与迁移 =====
const STORAGE_KEYS = ['exam-progress', 'exam-settings', 'exam-state', 'exam-history', 'exam-theme']

function exportData() {
  exporting.value = true
  try {
    const data = {}
    for (const key of STORAGE_KEYS) {
      const val = localStorage.getItem(key)
      if (val !== null) {
        try { data[key] = JSON.parse(val) } catch { data[key] = val }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().slice(0, 10)
    a.download = `exam-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('学习记录已导出')
  } catch (e) {
    ElMessage.error('导出失败: ' + e.message)
  } finally {
    exporting.value = false
  }
}

function triggerImport() {
  fileInput.value?.click()
}

function handleImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      // 校验格式
      const validKeys = Object.keys(data).filter(k => STORAGE_KEYS.includes(k))
      if (validKeys.length === 0) {
        ElMessage.error('无效的备份文件，未找到有效的学习记录')
        return
      }
      // 生成预览
      const preview = {}
      if (data['exam-progress']?.records?.length) {
        preview.progress = { records: data['exam-progress'].records.length }
      }
      if (data['exam-history']?.length) {
        preview.history = data['exam-history'].length
      }
      if (data['exam-state']) {
        preview.examState = true
      }
      if (data['exam-theme']) {
        preview.theme = true
      }
      pendingImportData = data
      importPreview.value = preview
    } catch {
      ElMessage.error('文件解析失败，请确认是有效的 JSON 备份文件')
    }
  }
  reader.readAsText(file)
  // 重置 input，允许重复选择同一文件
  event.target.value = ''
}

function confirmImport() {
  if (!pendingImportData) return
  importing.value = true
  try {
    for (const key of STORAGE_KEYS) {
      if (pendingImportData[key] !== undefined) {
        const val = typeof pendingImportData[key] === 'string' 
          ? pendingImportData[key] 
          : JSON.stringify(pendingImportData[key])
        localStorage.setItem(key, val)
      }
    }
    importPreview.value = null
    pendingImportData = null
    ElMessage.success('学习记录已导入，页面将刷新...')
    setTimeout(() => location.reload(), 1000)
  } catch (e) {
    ElMessage.error('导入失败: ' + e.message)
  } finally {
    importing.value = false
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

.import-preview {
  background: var(--bg-card-hover, rgba(0,0,0,0.04));
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 8px;
}
.import-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .import-detail {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
