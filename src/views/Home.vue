<template>
  <div class="home-page">
    <div class="welcome-section">
      <h1>🎯 突击复习</h1>
      <p class="welcome-desc">上传复习文档 → AI自动出题 → 刷题/背题双模式，考前突击神器</p>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <div class="action-card" @click="$router.push('/upload')">
        <div class="action-icon">📄</div>
        <div class="action-text">
          <div class="action-title">上传文档</div>
          <div class="action-desc">PDF / Word / PPT / MD</div>
        </div>
        <el-icon class="action-arrow"><ArrowRight /></el-icon>
      </div>
      <div class="action-card" @click="$router.push('/practice')">
        <div class="action-icon">✏️</div>
        <div class="action-text">
          <div class="action-title">做题模式</div>
          <div class="action-desc">答题对错即时反馈</div>
        </div>
        <el-icon class="action-arrow"><ArrowRight /></el-icon>
      </div>
      <div class="action-card" @click="$router.push('/memorize')">
        <div class="action-icon">📖</div>
        <div class="action-text">
          <div class="action-title">背题模式</div>
          <div class="action-desc">直接看答案和解析</div>
        </div>
        <el-icon class="action-arrow"><ArrowRight /></el-icon>
      </div>
      <div class="action-card" @click="$router.push('/exam')">
        <div class="action-icon">📝</div>
        <div class="action-text">
          <div class="action-title">试卷模式</div>
          <div class="action-desc">100分制模拟考试</div>
        </div>
        <el-icon class="action-arrow"><ArrowRight /></el-icon>
      </div>
      <div class="action-card" @click="$router.push('/knowledge')">
        <div class="action-icon">📚</div>
        <div class="action-text">
          <div class="action-title">知识点复习</div>
          <div class="action-desc">考前速览核心要点</div>
        </div>
        <el-icon class="action-arrow"><ArrowRight /></el-icon>
      </div>
      <div class="action-card" @click="$router.push('/settings')">
        <div class="action-icon">⚙️</div>
        <div class="action-text">
          <div class="action-title">AI设置</div>
          <div class="action-desc">配置出题AI接口</div>
        </div>
        <el-icon class="action-arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- 统计面板 -->
    <div class="stats-section">
      <h2>📊 学习概览</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total || 0 }}</div>
          <div class="stat-label">题目总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.byType?.single || 0 }}</div>
          <div class="stat-label">单选题</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.byType?.multiple || 0 }}</div>
          <div class="stat-label">多选题</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.byType?.judge || 0 }}</div>
          <div class="stat-label">判断题</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ practiceStats.total || 0 }}</div>
          <div class="stat-label">已做题数</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ accuracy }}%</div>
          <div class="stat-label">正确率</div>
        </div>
      </div>
    </div>

    <!-- 文档列表 -->
    <div class="docs-section" v-if="documents.length > 0">
      <h2>📚 已上传文档</h2>
      <div class="doc-list">
        <div class="doc-item" v-for="doc in documents" :key="doc.id">
          <div class="doc-info">
            <el-icon><Document /></el-icon>
            <span class="doc-name">{{ doc.name }}</span>
            <el-tag size="small" type="info">{{ doc.pageCount }} 页</el-tag>
          </div>
          <div class="doc-actions">
            <el-button size="small" type="primary" @click="generateFromDoc(doc)">
              <el-icon><MagicStick /></el-icon> 出题
            </el-button>
            <el-button size="small" type="danger" plain @click="deleteDoc(doc.id)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="empty-hint" v-if="stats.total === 0">
      <div class="empty-icon">📝</div>
      <p>还没有题目哦～</p>
      <p>上传复习文档，AI帮你自动出题！</p>
      <el-button type="primary" size="large" @click="$router.push('/upload')">
        开始上传
      </el-button>
    </div>

    <!-- 出题对话框 -->
    <el-dialog v-model="showGenDialog" title="AI 出题" width="480px">
      <div class="gen-form">
        <p class="gen-doc-name">文档: {{ currentDoc?.name }}</p>
        <el-form label-position="top">
          <el-form-item label="出题数量">
            <el-input-number v-model="genForm.questionCount" :min="1" :max="30" />
          </el-form-item>
          <el-form-item label="难度">
            <el-radio-group v-model="genForm.difficulty">
              <el-radio value="easy">简单</el-radio>
              <el-radio value="medium">中等</el-radio>
              <el-radio value="hard">困难</el-radio>
              <el-radio value="mixed">混合</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="showGenDialog = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="doGenerate">
          开始出题
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuestionStore } from '../stores/questions.js'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useQuestionStore()
const stats = computed(() => store.stats)
const practiceStats = computed(() => store.stats.practiceStats || { total: 0, correct: 0 })
const accuracy = computed(() => {
  if (!practiceStats.value.total) return 0
  return Math.round((practiceStats.value.correct / practiceStats.value.total) * 100)
})

const documents = ref([])
const showGenDialog = ref(false)
const currentDoc = ref(null)
const generating = ref(false)
const genForm = ref({ questionCount: 5, difficulty: 'mixed' })

async function loadDocuments() {
  try {
    const res = await axios.get('/api/upload/documents', { timeout: 5000 })
    documents.value = res.data
  } catch (e) {
    documents.value = [] // 后端不可用时静默失败
  }
}

function generateFromDoc(doc) {
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
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '出题失败，请检查AI设置')
  } finally {
    generating.value = false
  }
}

async function deleteDoc(id) {
  try {
    await ElMessageBox.confirm('确定删除该文档？', '提示', { type: 'warning' })
    await axios.delete(`/api/upload/documents/${id}`)
    ElMessage.success('删除成功')
    await loadDocuments()
  } catch (e) { /* cancel */ }
}

onMounted(async () => {
  await Promise.all([store.fetchStats(), loadDocuments()])
})
</script>

<style scoped>
.home-page { max-width: 960px; }

.welcome-section { margin-bottom: 32px; }
.welcome-section h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
.welcome-desc { color: var(--text-secondary); font-size: 15px; }

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 40px;
}
.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}
.action-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: var(--shadow); }
.action-icon { font-size: 28px; }
.action-title { font-weight: 600; font-size: 15px; margin-bottom: 2px; }
.action-desc { font-size: 12px; color: var(--text-muted); }
.action-arrow { margin-left: auto; color: var(--text-muted); }

.stats-section { margin-bottom: 40px; }
.stats-section h2 { font-size: 18px; margin-bottom: 16px; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
}
.stat-card.accent { border-color: var(--primary); }
.stat-value { font-size: 28px; font-weight: 800; color: var(--primary-light); }
.stat-card.accent .stat-value { color: var(--success); }
.stat-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.docs-section { margin-bottom: 32px; }
.docs-section h2 { font-size: 18px; margin-bottom: 16px; }
.doc-list { display: flex; flex-direction: column; gap: 8px; }
.doc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.doc-info { display: flex; align-items: center; gap: 10px; }
.doc-name { font-size: 14px; }

.empty-hint {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-hint p { margin-bottom: 8px; }

.gen-form { padding: 0 10px; }
.gen-doc-name { color: var(--text-secondary); margin-bottom: 16px; font-size: 14px; }
</style>
