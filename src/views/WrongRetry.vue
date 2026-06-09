<template>
  <div class="retry-page">
    <!-- 错题列表 -->
    <div class="config-bar" v-if="!started && !showResult">
      <h2>🔄 错题重做</h2>
      <p class="page-desc">收集所有做错的题，反复练习直到全部掌握</p>

      <!-- 错题统计 -->
      <div class="wrong-stats" v-if="wrongQuestions.length > 0">
        <div class="stat-card total">
          <div class="stat-val">{{ wrongQuestions.length }}</div>
          <div class="stat-label">错题总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ wrongQuestions.filter(q => q.type === 'single').length }}</div>
          <div class="stat-label">单选</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ wrongQuestions.filter(q => q.type === 'multiple').length }}</div>
          <div class="stat-label">多选</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">{{ wrongQuestions.filter(q => q.type === 'judge').length }}</div>
          <div class="stat-label">判断</div>
        </div>
      </div>

      <!-- 模式选择 -->
      <div class="retry-options" v-if="wrongQuestions.length > 0">
        <el-button type="primary" size="large" @click="startRetry('all')">
          全部重做 ({{ wrongQuestions.length }} 题)
        </el-button>
        <el-button type="warning" size="large" @click="startRetry('random')">
          随机抽取 20 题
        </el-button>
        <el-button type="success" size="large" @click="startRetry('multi')">
          只做多选题 ({{ wrongQuestions.filter(q => q.type === 'multiple').length }} 题)
        </el-button>
      </div>

      <!-- 错题预览 -->
      <div class="wrong-list" v-if="wrongQuestions.length > 0">
        <h3>错题列表</h3>
        <div class="wrong-item" v-for="(q, i) in wrongQuestions" :key="q.id">
          <span class="wrong-num">{{ i + 1 }}</span>
          <el-tag :type="typeTagMap[q.type]" size="small">{{ typeLabelMap[q.type] }}</el-tag>
          <span class="wrong-text">{{ q.question }}</span>
          <span class="wrong-source" v-if="q.sourceDoc">{{ q.sourceDoc }}</span>
        </div>
      </div>

      <div class="no-wrong" v-if="wrongQuestions.length === 0 && !loading">
        <div class="no-wrong-icon">🎉</div>
        <h3>暂无错题</h3>
        <p>去做一套题或者考个试，错题会自动收录到这里</p>
        <div class="no-wrong-actions">
          <el-button type="primary" @click="$router.push('/practice')">去做题</el-button>
          <el-button @click="$router.push('/exam')">去考试</el-button>
        </div>
      </div>
    </div>

    <!-- 做题界面 -->
    <div class="retry-main" v-if="started">
      <div class="sticky-bar">
        <div class="sticky-top">
          <div class="retry-progress-text">
            错题 {{ wrongIndex + 1 }}/{{ questions.length }}
            <span class="remaining-tag">剩余 {{ questions.length - wrongIndex - 1 }} 题</span>
          </div>
          <div class="sticky-nav-btns">
            <el-button size="small" @click="goTo(wrongIndex - 1)" :disabled="wrongIndex === 0"><el-icon><ArrowLeft /></el-icon></el-button>
            <el-button size="small" @click="goTo(wrongIndex + 1)" :disabled="wrongIndex >= questions.length - 1"><el-icon><ArrowRight /></el-icon></el-button>
          </div>
        </div>
        <div class="sticky-dots">
          <div class="nav-dot" v-for="(q, i) in questions" :key="q.id"
            :class="{ active: i === wrongIndex, correct: resultMap[i] === true, wrong: resultMap[i] === false }"
            @click="goTo(i)">{{ i + 1 }}</div>
        </div>
      </div>

      <div class="question-card" v-if="currentQ">
        <div class="question-header">
          <el-tag :type="typeTagMap[currentQ.type]" size="small">{{ typeLabelMap[currentQ.type] }}</el-tag>
          <el-tag :type="diffTagMap[currentQ.difficulty]" size="small" v-if="currentQ.difficulty">{{ '⭐'.repeat(currentQ.difficulty) }}</el-tag>
          <span class="source-page" v-if="currentQ.sourcePage">📍 {{ currentQ.sourceDoc }} 第{{ currentQ.sourcePage }}页</span>
        </div>

        <div class="question-text">{{ currentQ.question }}</div>

        <div class="options-area">
          <template v-if="currentQ.type === 'single'">
            <div v-for="(opt, i) in currentQ.options" :key="i"
              class="option-item big-option" :class="getOptionClass(opt)"
              @click="!submitted && (userAnswers.single = opt.charAt(0))">
              <span class="option-letter">{{ opt.charAt(0) }}</span>
              <span class="option-content">{{ opt.substring(3) }}</span>
            </div>
          </template>

          <template v-if="currentQ.type === 'multiple'">
            <div class="multi-hint"><el-tag type="warning" size="small">多选题</el-tag><span>已选 {{ userAnswers.multiple.length }} 个</span></div>
            <div v-for="(opt, i) in currentQ.options" :key="i"
              class="option-item big-option" :class="getOptionClass(opt)"
              @click="toggleMulti(opt.charAt(0))">
              <span class="option-check">{{ userAnswers.multiple.includes(opt.charAt(0)) ? '☑' : '☐' }}</span>
              <span class="option-letter">{{ opt.charAt(0) }}</span>
              <span class="option-content">{{ opt.substring(3) }}</span>
            </div>
          </template>

          <template v-if="currentQ.type === 'judge'">
            <div class="judge-area">
              <div class="judge-btn" :class="{ selected: userAnswers.judge === true, correct: submitted && currentQ.answer === true, wrong: submitted && userAnswers.judge === true && currentQ.answer !== true }"
                @click="!submitted && (userAnswers.judge = true)">
                <span class="judge-icon">✅</span><span>正确</span>
              </div>
              <div class="judge-btn" :class="{ selected: userAnswers.judge === false, correct: submitted && currentQ.answer === false, wrong: submitted && userAnswers.judge === false && currentQ.answer !== false }"
                @click="!submitted && (userAnswers.judge = false)">
                <span class="judge-icon">❌</span><span>错误</span>
              </div>
            </div>
          </template>
        </div>

        <div class="action-area">
          <el-button v-if="!submitted" type="primary" size="large" class="submit-btn" @click="submitAnswer" :disabled="!hasAnswer">提交答案</el-button>

          <template v-if="submitted">
            <div :class="['result-banner', isCorrect ? 'correct' : 'still-wrong']">
              <span>{{ isCorrect ? '🎉 这次对了！' : '😓 还是错了' }}</span>
              <span class="correct-answer" v-if="!isCorrect">正确答案: {{ formatAnswer(currentQ) }}</span>
            </div>

            <div class="explanation-panel">
              <h4>💡 解析</h4>
              <div class="exp-main" v-if="currentQ.explanation?.mainExp">{{ currentQ.explanation.mainExp }}</div>
              <div class="exp-terms" v-if="currentQ.explanation?.terms?.length">
                <h5>📖 术语解释</h5>
                <div class="term-item" v-for="(t, i) in currentQ.explanation.terms" :key="i">
                  <span class="term-name">{{ t.term }}</span><span class="term-def">{{ t.definition }}</span>
                </div>
              </div>
              <div class="exp-related" v-if="currentQ.explanation?.relatedPoints?.length">
                <h5>🔗 关联知识点</h5>
                <div class="related-tags"><el-tag v-for="(p, i) in currentQ.explanation.relatedPoints" :key="i" size="small" type="info">{{ p }}</el-tag></div>
              </div>
              <div class="exp-tip" v-if="currentQ.explanation?.funTip">
                <h5>🎯 记忆技巧</h5><p>{{ currentQ.explanation.funTip }}</p>
              </div>
            </div>

            <div class="bottom-nav">
              <el-button size="large" @click="goTo(wrongIndex - 1)" :disabled="wrongIndex === 0"><el-icon><ArrowLeft /></el-icon> 上一题</el-button>
              <el-button size="large" v-if="wrongIndex < questions.length - 1" type="primary" @click="goTo(wrongIndex + 1)">下一题 <el-icon><ArrowRight /></el-icon></el-button>
              <el-button size="large" v-else type="success" @click="finishRetry">完成 🏁</el-button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 结果 -->
    <div class="retry-result" v-if="showResult">
      <h2>{{ allCorrect ? '🎉 全部正确！错题清零！' : '📊 错题重做结果' }}</h2>
      <div class="result-stats">
        <div class="summary-item correct">
          <div class="summary-value">{{ thisRoundCorrect }}</div>
          <div class="summary-label">这次做对</div>
        </div>
        <div class="summary-item wrong">
          <div class="summary-value">{{ questions.length - thisRoundCorrect }}</div>
          <div class="summary-label">仍然做错</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">{{ questions.length > 0 ? Math.round(thisRoundCorrect / questions.length * 100) : 0 }}%</div>
          <div class="summary-label">正确率</div>
        </div>
      </div>
      <div class="result-actions">
        <el-button type="primary" @click="startRetry('all')" v-if="!allCorrect">再刷一轮</el-button>
        <el-button @click="$router.push('/practice')">去做题</el-button>
        <el-button @click="showResult = false; started = false">返回</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { useQuestionStore } from '../stores/questions.js'
import { ElMessage } from 'element-plus'

const store = useQuestionStore()
const loading = ref(false)
const started = ref(false)
const showResult = ref(false)
const wrongQuestions = ref([])
const questions = ref([])
const wrongIndex = ref(0)
const submitted = ref(false)
const resultMap = ref({})
const thisRoundCorrect = ref(0)
const userAnswers = reactive({ single: '', multiple: [], judge: null })

// 每道题的答案快照，切换题目时保存/恢复
const answerSnapshots = ref({}) // { [index]: { single, multiple, judge, submitted, resultMap, type } }

const typeTagMap = { single: '', multiple: 'warning', judge: 'success' }
const typeLabelMap = { single: '单选', multiple: '多选', judge: '判断' }
const diffTagMap = { 1: 'success', 2: 'warning', 3: 'danger' }

const currentQ = computed(() => questions.value[wrongIndex.value])
const isCorrect = computed(() => currentQ.value && submitted.value ? checkAnswer(currentQ.value) : false)
const allCorrect = computed(() => questions.value.length > 0 && thisRoundCorrect.value === questions.value.length)
const hasAnswer = computed(() => {
  if (!currentQ.value) return false
  if (currentQ.value.type === 'single') return !!userAnswers.single
  if (currentQ.value.type === 'multiple') return userAnswers.multiple.length > 0
  return userAnswers.judge !== null
})

async function loadWrongQuestions() {
  loading.value = true
  try {
    const allQuestions = await store.fetchQuestions()
    const detail = store.getProgressDetail()
    const wrongIds = new Set(detail.wrongQuestions?.map(w => w.questionId) || [])
    wrongQuestions.value = allQuestions.filter(q => wrongIds.has(q.id))
  } catch { wrongQuestions.value = [] } finally { loading.value = false }
}

function startRetry(mode) {
  let pool = [...wrongQuestions.value]
  if (mode === 'multi') pool = pool.filter(q => q.type === 'multiple')
  if (mode === 'random') pool = pool.sort(() => Math.random() - 0.5).slice(0, 20)
  else pool.sort(() => Math.random() - 0.5)

  if (pool.length === 0) { ElMessage.info('没有符合条件的错题'); return }
  questions.value = pool
  wrongIndex.value = 0
  submitted.value = false
  resultMap.value = {}
  answerSnapshots.value = {}
  thisRoundCorrect.value = 0
  resetUserAnswer()
  started.value = true
  showResult.value = false
  nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

function normalizeAnswer(ans) {
  if (ans === undefined || ans === null) return undefined
  if (typeof ans === 'boolean') return ans
  if (typeof ans === 'string') {
    const s = ans.trim().toLowerCase()
    if (s === 'true' || s === '正确' || s === '对' || s === '√') return true
    if (s === 'false' || s === '错误' || s === '错' || s === '×') return false
    if (s === 'a') return true
    if (s === 'b') return false
    return s.trim().charAt(0).toUpperCase()
  }
  return ans
}

function checkAnswer(q) {
  if (q.type === 'single') return normalizeAnswer(userAnswers.single) === normalizeAnswer(q.answer)
  if (q.type === 'multiple') {
    const selected = [...userAnswers.multiple].map(normalizeAnswer)
    const correct = [...q.answer].map(normalizeAnswer)
    const hasWrong = selected.some(s => !correct.includes(s))
    const hasAll = correct.every(c => selected.includes(c))
    if (hasAll && !hasWrong) return 'full'
    if (hasWrong) return 'wrong'
    if (selected.length > 0) return 'partial'
    return 'wrong'
  }
  return normalizeAnswer(userAnswers.judge) === normalizeAnswer(q.answer)
}

function formatAnswer(q) {
  if (q.type === 'single') return q.answer
  if (q.type === 'multiple') return q.answer.join(', ')
  return q.answer ? '正确' : '错误'
}

function getOptionClass(opt) {
  const l = opt.charAt(0); const q = currentQ.value
  // 答题中：点击即高亮
  if (!submitted.value) {
    if (q.type === 'single') return l === userAnswers.single ? 'selected' : ''
    if (q.type === 'multiple') return userAnswers.multiple.includes(l) ? 'selected' : ''
    return ''
  }
  // 提交后的对/错高亮
  if (q.type === 'single') { if (l === q.answer) return 'is-correct'; if (l === userAnswers.single && l !== q.answer) return 'is-wrong' }
  if (q.type === 'multiple') { if (q.answer.includes(l)) return 'is-correct'; if (userAnswers.multiple.includes(l) && !q.answer.includes(l)) return 'is-wrong' }
  return ''
}

function toggleMulti(letter) {
  if (submitted.value) return
  const idx = userAnswers.multiple.indexOf(letter)
  if (idx === -1) userAnswers.multiple.push(letter)
  else userAnswers.multiple.splice(idx, 1)
}

function resetUserAnswer() { userAnswers.single = ''; userAnswers.multiple = []; userAnswers.judge = null; submitted.value = false }

function saveSnapshot() {
  answerSnapshots.value[wrongIndex.value] = {
    single: userAnswers.single,
    multiple: [...userAnswers.multiple],
    judge: userAnswers.judge,
    submitted: submitted.value,
    resultMap: { ...resultMap.value },
    type: currentQ.value?.type
  }
}

function restoreSnapshot(i) {
  const snap = answerSnapshots.value[i]
  if (!snap) {
    userAnswers.single = ''; userAnswers.multiple = []; userAnswers.judge = null
    submitted.value = false; resultMap.value = {}
    return
  }
  userAnswers.single = snap.single || ''
  userAnswers.multiple = snap.multiple ? [...snap.multiple] : []
  userAnswers.judge = snap.judge ?? null
  submitted.value = snap.submitted
  resultMap.value = snap.resultMap || {}
}

function submitAnswer() {
  submitted.value = true
  const correct = checkAnswer(currentQ.value)
  resultMap.value[wrongIndex.value] = correct
  if (correct === 'full' || correct === true) thisRoundCorrect.value++
  const ans = currentQ.value.type === 'single' ? userAnswers.single : currentQ.value.type === 'multiple' ? userAnswers.multiple : userAnswers.judge
  store.recordAnswer(currentQ.value.id, correct === 'full' || correct === true, JSON.stringify(ans), 'retry')
}

function goTo(i) {
  if (i < 0 || i >= questions.value.length) return
  saveSnapshot()
  wrongIndex.value = i
  restoreSnapshot(i)
  nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}

function finishRetry() { started.value = false; showResult.value = true; window.scrollTo({ top: 0 }) }

loadWrongQuestions()
</script>

<style scoped>
.retry-page { max-width: 800px; }
.retry-page h2 { font-size: 22px; margin-bottom: 6px; }
.page-desc { color: var(--text-muted); margin-bottom: 24px; }

.wrong-stats { display: flex; gap: 12px; margin-bottom: 24px; }
.stat-card { flex: 1; text-align: center; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; }
.stat-card.total { border-color: var(--danger); }
.stat-val { font-size: 28px; font-weight: 800; color: var(--primary-light); }
.stat-card.total .stat-val { color: var(--danger); }
.stat-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.retry-options { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }

.wrong-list h3 { font-size: 16px; margin-bottom: 12px; }
.wrong-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 6px; border-left: 3px solid var(--danger); }
.wrong-num { font-size: 12px; color: var(--text-muted); min-width: 24px; }
.wrong-text { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wrong-source { font-size: 11px; color: var(--text-muted); }

.no-wrong { text-align: center; padding: 60px 20px; }
.no-wrong-icon { font-size: 64px; margin-bottom: 16px; }
.no-wrong h3 { font-size: 22px; margin-bottom: 8px; }
.no-wrong p { color: var(--text-secondary); margin-bottom: 8px; }
.no-wrong-actions { margin-top: 20px; display: flex; justify-content: center; gap: 12px; }

/* 做题界面复用样式 */
.sticky-bar { position: sticky; top: 0; z-index: 50; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 14px 18px; margin-bottom: 20px; }
.sticky-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.retry-progress-text { font-size: 15px; font-weight: 600; color: var(--primary-light); white-space: nowrap; }
.remaining-tag { font-size: 12px; color: var(--text-muted); font-weight: 400; margin-left: 8px; }
.sticky-nav-btns { display: flex; gap: 6px; flex-shrink: 0; }
.sticky-dots { display: flex; flex-wrap: wrap; gap: 4px; max-height: 80px; overflow-y: auto; }
.nav-dot { min-width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 11px; background: var(--bg-dark); color: var(--text-muted); cursor: pointer; transition: all 0.15s; padding: 0 4px; }
.nav-dot.active { background: var(--primary); color: #fff; }
.nav-dot.correct { background: rgba(34,197,94,0.2); color: var(--success); }
.nav-dot.wrong { background: rgba(239,68,68,0.2); color: var(--danger); }

.question-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 24px; }
.question-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.source-page { font-size: 12px; color: var(--text-muted); }
.question-text { font-size: 17px; line-height: 1.7; margin-bottom: 24px; font-weight: 500; }
.options-area { margin-bottom: 20px; }
.multi-hint { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; color: var(--warning); }

.big-option { display: flex; align-items: center; gap: 14px; padding: 16px 20px; margin-bottom: 10px; background: var(--bg-dark); border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; transition: all 0.15s; user-select: none; }
.big-option:hover { border-color: var(--primary); }
.big-option.selected { border-color: var(--primary); background: rgba(99,102,241,0.12); }
.big-option.selected .option-letter { background: var(--primary); color: #fff; }
.big-option.is-correct { border-color: var(--success); background: rgba(34,197,94,0.08); }
.big-option.is-wrong { border-color: var(--danger); background: rgba(239,68,68,0.08); }
.option-letter { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(99,102,241,0.15); color: var(--primary-light); font-weight: 700; font-size: 15px; flex-shrink: 0; transition: all 0.15s; }
.option-content { font-size: 15px; line-height: 1.5; flex: 1; }
.option-check { font-size: 20px; flex-shrink: 0; }

.judge-area { display: flex; gap: 16px; }
.judge-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 24px; background: var(--bg-dark); border: 2px solid var(--border-color); border-radius: 12px; cursor: pointer; transition: all 0.2s; font-size: 18px; font-weight: 600; }
.judge-btn:hover { border-color: var(--primary); }
.judge-btn.selected { border-color: var(--primary); background: rgba(99,102,241,0.1); }
.judge-btn.correct { border-color: var(--success); background: rgba(34,197,94,0.1); color: var(--success); }
.judge-btn.wrong { border-color: var(--danger); background: rgba(239,68,68,0.1); color: var(--danger); }
.judge-icon { font-size: 28px; }

.action-area { margin-top: 24px; }
.submit-btn { width: 100%; height: 48px; font-size: 17px; }

.result-banner { padding: 16px 20px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; margin-bottom: 20px; }
.result-banner.correct { background: rgba(34,197,94,0.15); color: var(--success); }
.result-banner.still-wrong { background: rgba(239,68,68,0.15); color: var(--danger); }
.correct-answer { font-weight: 400; font-size: 14px; margin-left: auto; }

.explanation-panel { background: var(--bg-dark); border-radius: 10px; padding: 20px; margin-bottom: 20px; }
.explanation-panel h4 { font-size: 16px; margin-bottom: 12px; color: var(--primary-light); }
.explanation-panel h5 { font-size: 14px; margin: 14px 0 8px; color: var(--text-secondary); }
.exp-main { font-size: 15px; line-height: 1.8; }
.term-item { margin-bottom: 8px; padding: 8px 12px; background: rgba(99,102,241,0.08); border-radius: 6px; }
.term-name { font-weight: 600; color: var(--primary-light); margin-right: 8px; }
.term-def { font-size: 14px; }
.related-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.exp-tip { padding: 12px 16px; background: rgba(245,158,11,0.1); border-radius: 8px; border-left: 3px solid var(--warning); }
.exp-tip p { font-size: 14px; line-height: 1.7; margin-top: 4px; }
.bottom-nav { display: flex; gap: 12px; justify-content: center; }

.retry-result { text-align: center; padding: 40px 20px; }
.retry-result h2 { font-size: 26px; margin-bottom: 32px; }
.result-stats { display: flex; justify-content: center; gap: 24px; margin-bottom: 32px; }
.summary-item { text-align: center; padding: 20px 28px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; }
.summary-item.correct { border-color: var(--success); }
.summary-item.wrong { border-color: var(--danger); }
.summary-value { font-size: 32px; font-weight: 800; color: var(--primary-light); }
.summary-item.correct .summary-value { color: var(--success); }
.summary-item.wrong .summary-value { color: var(--danger); }
.summary-label { font-size: 13px; color: var(--text-muted); margin-top: 6px; }
.result-actions { display: flex; justify-content: center; gap: 12px; }
</style>
