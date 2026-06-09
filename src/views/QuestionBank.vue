<template>
  <div class="bank-page">
    <h2>📚 题库管理</h2>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="filterType" placeholder="题型" clearable style="width: 120px" @change="loadQuestions">
        <el-option label="单选题" value="single" />
        <el-option label="多选题" value="multiple" />
        <el-option label="判断题" value="judge" />
      </el-select>
      <el-input v-model="filterKeyword" placeholder="搜索题目关键词" clearable style="width: 220px"
        @clear="loadQuestions" @keyup.enter="loadQuestions">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" @click="loadQuestions">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button @click="refreshQuestions">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
      <el-button type="danger" plain :disabled="!selectedIds.length" @click="batchDelete">
        删除选中 ({{ selectedIds.length }})
      </el-button>
    </div>

    <!-- 题目列表 -->
    <div class="question-list" v-loading="loading">
      <div
        v-for="q in questions" :key="q.id"
        class="q-item"
        :class="{ expanded: expandedId === q.id }"
        @click="toggleExpand(q.id)"
      >
        <div class="q-item-header">
          <el-checkbox
            :model-value="selectedIds.includes(q.id)"
            @change="(val) => toggleSelect(q.id, val)"
            @click.stop
          />
          <el-tag :type="typeTagMap[q.type]" size="small">{{ typeLabelMap[q.type] }}</el-tag>
          <span class="q-text">{{ q.question }}</span>
          <span class="q-meta" v-if="q.sourceDoc">
            📍 {{ q.sourceDoc }} {{ q.sourcePage ? `第${q.sourcePage}页` : '' }}
          </span>
          <el-tag v-if="q.difficulty" :type="diffTagMap[q.difficulty]" size="small">
            {{ '⭐'.repeat(q.difficulty) }}
          </el-tag>
          <el-button type="danger" size="small" plain @click.stop="deleteSingle(q.id)" class="q-delete">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>

        <!-- 展开详情 -->
        <div class="q-detail" v-if="expandedId === q.id" @click.stop>
          <div class="q-options" v-if="q.type !== 'judge' && q.options">
            <div v-for="(opt, i) in q.options" :key="i" class="q-option"
              :class="{ correct: isCorrectOpt(q, opt) }">
              {{ opt }}
              <span v-if="isCorrectOpt(q, opt)" class="correct-mark">✓</span>
            </div>
          </div>
          <div v-if="q.type === 'judge'" class="q-judge-answer">
            答案: {{ q.answer ? '✅ 正确' : '❌ 错误' }}
          </div>
          <div v-else class="q-answer">
            正确答案: <strong>{{ formatAnswer(q) }}</strong>
          </div>

          <div class="q-exp" v-if="q.explanation">
            <div v-if="q.explanation.mainExp" class="exp-part">
              <span class="exp-label">💡 解析:</span>
              {{ q.explanation.mainExp }}
            </div>
            <div v-if="q.explanation.terms?.length" class="exp-part">
              <span class="exp-label">📖 术语:</span>
              <span v-for="(t, i) in q.explanation.terms" :key="i" class="term-inline">
                <strong>{{ t.term }}</strong> → {{ t.definition }}
              </span>
            </div>
            <div v-if="q.explanation.relatedPoints?.length" class="exp-part">
              <span class="exp-label">🔗 关联:</span>
              <el-tag v-for="(p, i) in q.explanation.relatedPoints" :key="i" size="small" type="info">{{ p }}</el-tag>
            </div>
            <div v-if="q.explanation.funTip" class="exp-part fun-tip-inline">
              <span class="exp-label">🎯 技巧:</span>
              {{ q.explanation.funTip }}
            </div>
          </div>
        </div>
      </div>

      <div class="empty-list" v-if="!loading && questions.length === 0">
        <p>题库是空的，快去上传文档出题吧~</p>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        @current-change="loadQuestions"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

const questions = ref([])
const loading = ref(false)
const filterType = ref('')
const filterKeyword = ref('')
const expandedId = ref(null)
const selectedIds = ref([])
const currentPage = ref(1)
const pageSize = 20
const total = ref(0)

const typeTagMap = { single: '', multiple: 'warning', judge: 'success' }
const typeLabelMap = { single: '单选', multiple: '多选', judge: '判断' }
const diffTagMap = { 1: 'success', 2: 'warning', 3: 'danger' }

function formatAnswer(q) {
  if (q.type === 'single') return q.answer
  if (q.type === 'multiple') return q.answer.join(', ')
  return ''
}

function isCorrectOpt(q, opt) {
  const letter = opt.charAt(0)
  if (q.type === 'single') return letter === q.answer
  if (q.type === 'multiple') return q.answer.includes(letter)
  return false
}

async function loadQuestions() {
  loading.value = true
  try {
    const params = {}
    if (filterType.value) params.type = filterType.value
    if (filterKeyword.value) params.keyword = filterKeyword.value
    const res = await axios.get('/api/questions', { params })
    questions.value = res.data
    total.value = res.data.length
  } catch (e) {
    ElMessage.error('获取题目失败')
  } finally {
    loading.value = false
  }
}

function refreshQuestions() {
  filterType.value = ''
  filterKeyword.value = ''
  loadQuestions()
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function toggleSelect(id, val) {
  if (val) selectedIds.value.push(id)
  else selectedIds.value = selectedIds.value.filter(i => i !== id)
}

async function deleteSingle(id) {
  try {
    await ElMessageBox.confirm('确认删除此题？', '提示', { type: 'warning' })
    await axios.delete(`/api/questions/${id}`)
    ElMessage.success('已删除')
    loadQuestions()
  } catch (e) { /* cancel */ }
}

async function batchDelete() {
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 道题？`, '提示', { type: 'warning' })
    await axios.delete('/api/questions', { data: { ids: selectedIds.value } })
    ElMessage.success(`已删除 ${selectedIds.value.length} 道题`)
    selectedIds.value = []
    loadQuestions()
  } catch (e) { /* cancel */ }
}

onMounted(() => loadQuestions())
</script>

<style scoped>
.bank-page { max-width: 960px; }
.bank-page h2 { font-size: 22px; margin-bottom: 16px; }

.filter-bar {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 20px; flex-wrap: wrap;
}

.question-list { display: flex; flex-direction: column; gap: 8px; }

.q-item {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 14px 18px; cursor: pointer; transition: all 0.2s;
}
.q-item:hover { border-color: var(--primary); }
.q-item.expanded { border-color: var(--primary); }

.q-item-header {
  display: flex; align-items: center; gap: 10px;
}
.q-text {
  flex: 1; font-size: 14px; line-height: 1.5;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.q-meta { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.q-delete { margin-left: auto; }

.q-detail {
  margin-top: 14px; padding-top: 14px;
  border-top: 1px solid var(--border-color);
}

.q-options { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.q-option {
  padding: 8px 12px; background: var(--bg-dark); border-radius: 6px; font-size: 13px;
}
.q-option.correct { background: rgba(34,197,94,0.1); color: var(--success); }
.correct-mark { float: right; font-weight: 700; }

.q-answer, .q-judge-answer { font-size: 14px; margin-bottom: 12px; color: var(--success); }

.q-exp { font-size: 13px; color: var(--text-secondary); }
.exp-part { margin-bottom: 8px; line-height: 1.6; }
.exp-label { color: var(--primary-light); font-weight: 600; margin-right: 6px; }
.term-inline { margin-right: 12px; }
.fun-tip-inline { padding: 8px 12px; background: rgba(245,158,11,0.08); border-radius: 6px; }

.empty-list { text-align: center; padding: 40px; color: var(--text-muted); }

.pagination { margin-top: 20px; display: flex; justify-content: center; }
</style>
