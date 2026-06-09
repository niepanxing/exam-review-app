<template>
  <div class="upload-page">
    <h2>📄 上传复习文档</h2>
      <p class="page-desc">上传 PDF / Word / PPT / Markdown / TXT 文件，解析后可一键 AI 出题</p>

    <!-- 上传区域 -->
    <div class="upload-zone">
      <el-upload
        ref="uploadRef"
        :action="'/api/upload/document'"
        :on-success="onUploadSuccess"
        :on-error="onUploadError"
        :before-upload="beforeUpload"
        :accept="'.pdf,.docx,.doc,.txt,.pptx,.md,.markdown'"
        :show-file-list="false"
        :drag="true"
        name="file"
      >
        <div class="upload-content">
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="upload-text">拖拽文件到此处，或 <em>点击选择</em></div>
          <div class="upload-tip">支持 PDF / Word(.docx) / PPT(.pptx) / Markdown / TXT，单文件最大 50MB</div>
        </div>
      </el-upload>
    </div>

    <!-- 上传进度 -->
    <div class="upload-status" v-if="uploading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在解析文档，请稍候...</span>
    </div>

    <!-- 已上传文档列表 -->
    <div class="doc-list-section" v-if="documents.length > 0">
      <h3>📚 已上传文档</h3>
      <div class="doc-list">
        <div class="doc-card" v-for="doc in documents" :key="doc.id">
          <div class="doc-card-left">
            <div class="doc-icon">{{ getDocIcon(doc.name) }}</div>
            <div class="doc-meta">
              <div class="doc-name">{{ doc.name }}</div>
              <div class="doc-page">共 {{ doc.pageCount }} 页</div>
            </div>
          </div>
          <div class="doc-card-right">
            <el-button type="primary" @click="openGenDialog(doc)">
              <el-icon><MagicStick /></el-icon> AI出题
            </el-button>
            <el-button type="danger" plain size="small" @click="deleteDoc(doc.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 手动粘贴内容出题 -->
    <div class="paste-section">
      <h3>✍️ 手动粘贴内容出题</h3>
      <p class="section-desc">没有文件？直接把复习内容粘贴进来也行</p>
      <el-input
        v-model="pasteContent"
        type="textarea"
        :rows="8"
        placeholder="把复习资料内容粘贴到这里..."
        resize="vertical"
      />
      <div class="paste-options">
        <el-input v-model="pasteDocName" placeholder="文档名称（选填）" style="width: 200px" />
        <el-input-number v-model="pasteQuestionCount" :min="1" :max="30" />
        <el-radio-group v-model="pasteDifficulty" size="small">
          <el-radio-button value="easy">简单</el-radio-button>
          <el-radio-button value="medium">中等</el-radio-button>
          <el-radio-button value="hard">困难</el-radio-button>
          <el-radio-button value="mixed">混合</el-radio-button>
        </el-radio-group>
        <el-button type="primary" :loading="pasteGenerating" :disabled="!pasteContent.trim()" @click="generateFromPaste">
          <el-icon><MagicStick /></el-icon> AI出题
        </el-button>
      </div>
    </div>

    <!-- 出题对话框 -->
    <el-dialog v-model="showGenDialog" title="🪄 AI 出题" width="500px">
      <div class="gen-form" v-if="currentDoc">
        <div class="gen-doc-info">
          <span class="gen-doc-icon">{{ getDocIcon(currentDoc.name) }}</span>
          <span>{{ currentDoc.name }}</span>
          <el-tag size="small">{{ currentDoc.pageCount }} 页</el-tag>
        </div>
        <el-form label-position="top" style="margin-top: 20px;">
          <el-form-item label="出题数量">
            <el-slider v-model="genForm.questionCount" :min="1" :max="30" show-input />
          </el-form-item>
          <el-form-item label="难度">
            <el-radio-group v-model="genForm.difficulty">
              <el-radio value="easy">🟢 简单（基础概念）</el-radio>
              <el-radio value="medium">🟡 中等（理解应用）</el-radio>
              <el-radio value="hard">🔴 困难（综合分析）</el-radio>
              <el-radio value="mixed">🎲 混合</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <div class="gen-tip">
          <el-icon><InfoFilled /></el-icon>
          AI 将从文档内容中提取知识点，生成带有详细解析的考试题
        </div>
      </div>
      <template #footer>
        <el-button @click="showGenDialog = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="doGenerate" size="large">
          <el-icon><MagicStick /></el-icon> 开始出题
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useQuestionStore } from '../stores/questions.js'
import { useRouter } from 'vue-router'

const router = useRouter()
const store = useQuestionStore()

const documents = ref([])
const uploading = ref(false)
const showGenDialog = ref(false)
const currentDoc = ref(null)
const generating = ref(false)
const genForm = ref({ questionCount: 5, difficulty: 'mixed' })

const pasteContent = ref('')
const pasteDocName = ref('')
const pasteQuestionCount = ref(5)
const pasteDifficulty = ref('mixed')
const pasteGenerating = ref(false)

function getDocIcon(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  const icons = { pdf: '📕', docx: '📘', doc: '📘', pptx: '📙', ppt: '📙', md: '📝', markdown: '📝', txt: '📄' }
  return icons[ext] || '📄'
}

function beforeUpload(file) {
  const allowed = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.md', '.markdown']
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  if (!allowed.includes(ext)) {
    ElMessage.error(`不支持的格式: ${ext}`)
    return false
  }
  uploading.value = true
  return true
}

function onUploadSuccess(response) {
  uploading.value = false
  if (response.success) {
    ElMessage.success(`文档解析成功! 共 ${response.document.pageCount} 页`)
    loadDocuments()
  } else {
    ElMessage.error(response.error || '解析失败')
  }
}

function onUploadError(error) {
  uploading.value = false
  ElMessage.error('上传失败，请检查文件格式')
}

function openGenDialog(doc) {
  currentDoc.value = doc
  genForm.value = { questionCount: 5, difficulty: 'mixed' }
  showGenDialog.value = true
}

async function doGenerate() {
  if (!currentDoc.value) return
  generating.value = true
  try {
    const res = await axios.post('/api/upload/generate', {
      documentId: currentDoc.value.id,
      ...genForm.value
    })
    ElMessage.success(`成功生成 ${res.data.count} 道题目!`)
    showGenDialog.value = false
    await store.fetchStats()
    router.push('/bank')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '出题失败，请检查AI设置')
  } finally {
    generating.value = false
  }
}

async function generateFromPaste() {
  if (!pasteContent.value.trim()) return
  pasteGenerating.value = true
  try {
    const res = await axios.post('/api/questions/generate-direct', {
      content: pasteContent.value,
      docName: pasteDocName.value || '手动输入',
      questionCount: pasteQuestionCount.value,
      difficulty: pasteDifficulty.value
    })
    ElMessage.success(`成功生成 ${res.data.count} 道题目!`)
    pasteContent.value = ''
    pasteDocName.value = ''
    await store.fetchStats()
    router.push('/bank')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '出题失败，请检查AI设置')
  } finally {
    pasteGenerating.value = false
  }
}

async function loadDocuments() {
  try {
    const res = await axios.get('/api/upload/documents')
    documents.value = res.data
  } catch (e) { /* ignore */ }
}

async function deleteDoc(id) {
  try {
    await ElMessageBox.confirm('确定删除该文档？', '提示', { type: 'warning' })
    await axios.delete(`/api/upload/documents/${id}`)
    ElMessage.success('已删除')
    await loadDocuments()
  } catch (e) { /* cancel */ }
}

onMounted(() => loadDocuments())
</script>

<style scoped>
.upload-page { max-width: 800px; }
.upload-page h2 { font-size: 22px; margin-bottom: 6px; }
.page-desc { color: var(--text-muted); margin-bottom: 24px; }

.upload-zone {
  margin-bottom: 32px;
}
.upload-zone :deep(.el-upload-dragger) {
  background: var(--bg-card);
  border: 2px dashed var(--border-color);
  border-radius: var(--radius);
  padding: 40px;
  transition: all 0.2s;
}
.upload-zone :deep(.el-upload-dragger:hover) {
  border-color: var(--primary);
}
.upload-content { text-align: center; }
.upload-icon { font-size: 48px; color: var(--primary-light); margin-bottom: 12px; }
.upload-text { font-size: 16px; color: var(--text-primary); margin-bottom: 8px; }
.upload-text em { color: var(--primary-light); font-style: normal; }
.upload-tip { font-size: 12px; color: var(--text-muted); }

.upload-status {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; background: var(--bg-card); border-radius: 8px;
  color: var(--primary-light); margin-bottom: 24px;
}

.doc-list-section { margin: 32px 0; }
.doc-list-section h3 { font-size: 18px; margin-bottom: 16px; }
.doc-list { display: flex; flex-direction: column; gap: 10px; }
.doc-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 10px; transition: all 0.2s;
}
.doc-card:hover { border-color: var(--primary); }
.doc-card-left { display: flex; align-items: center; gap: 12px; }
.doc-icon { font-size: 28px; }
.doc-name { font-size: 14px; font-weight: 500; }
.doc-page { font-size: 12px; color: var(--text-muted); }
.doc-card-right { display: flex; gap: 8px; align-items: center; }

.paste-section { margin-top: 32px; }
.paste-section h3 { font-size: 18px; margin-bottom: 6px; }
.section-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
.paste-options {
  display: flex; align-items: center; gap: 12px;
  margin-top: 12px; flex-wrap: wrap;
}

.gen-doc-info {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; color: var(--text-secondary);
}
.gen-doc-icon { font-size: 20px; }
.gen-tip {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px; background: rgba(99, 102, 241, 0.1);
  border-radius: 8px; font-size: 13px; color: var(--text-secondary);
  margin-top: 12px;
}
</style>
