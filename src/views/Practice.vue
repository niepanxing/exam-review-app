<template>
  <div class="practice-page">
    <!-- 配置栏 -->
    <div class="config-bar" v-if="!started && !showSummary">
      <h2>✏️ 做题模式</h2>
      <p class="page-desc">选完提交，即时反馈对错和详细解析</p>
      <div class="config-form">
        <el-form :model="config" label-position="top">
          <el-form-item label="题目范围">
            <el-radio-group v-model="config.scope">
              <el-radio-button value="all">全部题目</el-radio-button>
              <el-radio-button value="wrong">错题重做</el-radio-button>
              <el-radio-button value="type">按题型</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="题型筛选" v-if="config.scope === 'type'">
            <el-checkbox-group v-model="config.types">
              <el-checkbox value="single">单选题</el-checkbox>
              <el-checkbox value="multiple">多选题</el-checkbox>
              <el-checkbox value="judge">判断题</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="题目顺序">
            <el-radio-group v-model="config.order">
              <el-radio-button value="random">随机</el-radio-button>
              <el-radio-button value="seq">顺序</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="题目数量">
            <el-slider v-model="config.limit" :min="5" :max="100" :step="5" show-input />
          </el-form-item>
        </el-form>
        <el-button type="primary" size="large" class="start-btn" :loading="loading" @click="startPractice">开始做题</el-button>
      </div>
      <div class="empty-hint" v-if="totalQuestions === 0">
        <p>题库还是空的，先去上传文档出题吧～</p>
        <el-button type="primary" @click="$router.push('/upload')">去上传</el-button>
      </div>
    </div>

    <!-- 做题主界面 -->
    <div class="practice-main" v-if="started && !showSummary">
      <div class="sticky-bar">
        <div class="sticky-top">
          <el-progress :percentage="progress" :stroke-width="10" :color="progressColor" style="flex:1" />
          <span class="progress-text">{{ currentIndex + 1 }} / {{ questions.length }}</span>
          <div class="sticky-nav-btns">
            <el-button size="small" :disabled="currentIndex === 0" @click="prevQ"><el-icon><ArrowLeft /></el-icon></el-button>
            <el-button size="small" :disabled="currentIndex >= questions.length - 1" @click="nextQ"><el-icon><ArrowRight /></el-icon></el-button>
            <el-button size="small" type="success" @click="finishPractice">交卷 🏁</el-button>
          </div>
        </div>
        <div class="sticky-dots">
          <div class="nav-dot" v-for="(q, i) in questions" :key="q.id"
            :class="getDotClass(i)"
            @click="goToQ(i)">{{ i + 1 }}</div>
        </div>
      </div>

      <!-- 题目卡片 -->
      <div class="question-card" v-if="currentQ">
        <div class="question-header">
          <el-tag :type="typeTagMap[currentQ.type]" size="small">{{ typeLabelMap[currentQ.type] }}</el-tag>
          <el-tag :type="diffTagMap[currentQ.difficulty]" size="small" v-if="currentQ.difficulty">{{ '⭐'.repeat(currentQ.difficulty) }}</el-tag>
          <span class="source-page" v-if="currentQ.sourcePage">📍 {{ currentQ.sourceDoc }} 第{{ currentQ.sourcePage }}页</span>
        </div>

        <div class="question-text">{{ currentQ.question }}</div>

        <!-- 选项 -->
        <div class="options-area">
          <!-- 单选 -->
          <template v-if="currentQ.type === 'single'">
            <div v-for="(opt, i) in currentQ.options" :key="i"
              class="option-item big-option"
              :class="getSelectClass(opt)"
              @click="userAnswers.single = getOptionLetter(opt)">
              <span class="option-letter">{{ getOptionLetter(opt) }}</span>
              <span class="option-content">{{ opt.substring(3) }}</span>
            </div>
          </template>

          <!-- 多选 -->
          <template v-if="currentQ.type === 'multiple'">
            <div class="multi-hint" v-if="!submitted">
              <el-tag type="warning" size="small">多选题 - 可选多个</el-tag>
              <span>已选 {{ userAnswers.multiple.length }} 个</span>
            </div>
            <div v-for="(opt, i) in currentQ.options" :key="i"
              class="option-item big-option"
              :class="getSelectClass(opt)"
              @click="toggleMulti(getOptionLetter(opt))">
              <span class="option-check">{{ userAnswers.multiple.includes(getOptionLetter(opt)) ? '☑' : '☐' }}</span>
              <span class="option-letter">{{ getOptionLetter(opt) }}</span>
              <span class="option-content">{{ opt.substring(3) }}</span>
            </div>
          </template>

          <!-- 判断 -->
          <div v-if="currentQ.type === 'judge'" class="judge-area">
            <div class="judge-btn" :class="{ selected: userAnswers.judge === true }" @click="userAnswers.judge = true">
              <span class="judge-icon">✅</span><span>正确</span>
            </div>
            <div class="judge-btn" :class="{ selected: userAnswers.judge === false }" @click="userAnswers.judge = false">
              <span class="judge-icon">❌</span><span>错误</span>
            </div>
          </div>
        </div>

        <!-- 提交 / 结果 -->
        <div class="action-area">
          <el-button v-if="!submitted" type="primary" size="large" class="submit-btn" @click="submitAnswer" :disabled="!hasAnswer">提交答案</el-button>

          <template v-if="submitted">
            <div :class="['result-banner', isCorrect ? 'correct' : 'wrong']">
              <span>{{ isCorrect ? '🎉 回答正确！' : '😢 回答错误' }}</span>
              <span class="correct-answer" v-if="!isCorrect">正确答案: {{ formatAnswer(currentQ) }}</span>
            </div>

            <div class="explanation-panel">
              <h4>💡 详细解析</h4>
              <div class="exp-main" v-if="currentQ.explanation?.mainExp">{{ currentQ.explanation.mainExp }}</div>
              <div class="exp-terms" v-if="currentQ.explanation?.terms?.length">
                <h5>📖 术语解释</h5>
                <div class="term-item" v-for="(t, i) in currentQ.explanation.terms" :key="i">
                  <span class="term-name">{{ t.term }}</span><span class="term-def">{{ t.definition }}</span>
                </div>
              </div>
              <div class="exp-related" v-if="currentQ.explanation?.relatedPoints?.length">
                <h5>🔗 关联知识点</h5>
                <div class="related-tags">
                  <el-tag v-for="(p, i) in currentQ.explanation.relatedPoints" :key="i" size="small" type="info">{{ p }}</el-tag>
                </div>
              </div>
              <div class="exp-tip" v-if="currentQ.explanation?.funTip">
                <h5>🎯 记忆技巧</h5><p>{{ currentQ.explanation.funTip }}</p>
              </div>
            </div>

            <div class="bottom-nav">
              <el-button size="large" @click="prevQ" :disabled="currentIndex === 0"><el-icon><ArrowLeft /></el-icon> 上一题</el-button>
              <el-button size="large" v-if="currentIndex < questions.length - 1" type="primary" @click="nextQ">下一题 <el-icon><ArrowRight /></el-icon></el-button>
              <el-button size="large" v-else type="success" @click="finishPractice">完成练习 🏁</el-button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 结果汇总 -->
    <div class="result-summary" v-if="showSummary">
      <h2>🏆 练习完成！</h2>
      <div class="summary-stats">
        <div class="summary-item"><div class="summary-value">{{ practiceResults.length }}</div><div class="summary-label">总题数</div></div>
        <div class="summary-item correct"><div class="summary-value">{{ correctCount }}</div><div class="summary-label">正确</div></div>
        <div class="summary-item wrong"><div class="summary-value">{{ practiceResults.length - correctCount }}</div><div class="summary-label">错误</div></div>
        <div class="summary-item"><div class="summary-value">{{ accuracy }}%</div><div class="summary-label">正确率</div></div>
      </div>
      <div class="summary-actions">
        <el-button type="primary" @click="restartPractice">再来一轮</el-button>
        <el-button @click="$router.push('/memorize')">去背题</el-button>
        <el-button @click="$router.push('/')">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { useQuestionStore } from '../stores/questions.js'
import { ElMessage } from 'element-plus'

const store = useQuestionStore()
const totalQuestions = computed(() => store.stats.total)
const started = ref(false)
const loading = ref(false)
const showSummary = ref(false)
const questions = ref([])
const currentIndex = ref(0)
const submitted = ref(false)
const practiceResults = ref([])
const resultMap = ref({})

const config = reactive({ scope: 'all', types: ['single', 'multiple', 'judge'], order: 'random', limit: 20 })
const userAnswers = reactive({ single: '', multiple: [], judge: null })

// 每道题的答案快照，切换题目时保存/恢复
const answerSnapshots = ref({}) // { [index]: { single, multiple, judge, submitted, resultMap } }

const typeTagMap = { single: '', multiple: 'warning', judge: 'success' }
const typeLabelMap = { single: '单选', multiple: '多选', judge: '判断' }
const diffTagMap = { 1: 'success', 2: 'warning', 3: 'danger' }

const currentQ = computed(() => questions.value[currentIndex.value])
const progress = computed(() => questions.value.length ? Math.round(((currentIndex.value + 1) / questions.value.length) * 100) : 0)
const progressColor = computed(() => progress.value < 30 ? '#ef4444' : progress.value < 70 ? '#f59e0b' : '#22c55e')
const isCorrect = computed(() => currentQ.value && submitted.value ? checkAnswer(currentQ.value) : false)
const hasAnswer = computed(() => {
  if (!currentQ.value) return false
  if (currentQ.value.type === 'single') return !!userAnswers.single
  if (currentQ.value.type === 'multiple') return userAnswers.multiple.length > 0
  return userAnswers.judge !== null
})
const correctCount = computed(() => practiceResults.value.filter(r => r.isCorrect === 'full' || r.isCorrect === true).length)
const partialCount = computed(() => practiceResults.value.filter(r => r.isCorrect === 'partial').length)
const accuracy = computed(() => practiceResults.value.length ? Math.round(correctCount.value / practiceResults.value.length * 100) : 0)

// ===== 工具函数 =====

function getOptionLetter(opt) {
  return (opt || '').charAt(0)
}

function normalizeAnswer(ans) {
  if (ans === undefined || ans === null) return undefined
  if (typeof ans === 'boolean') return ans
  if (typeof ans === 'string') {
    const s = ans.trim().toLowerCase()
    // 判断题字符串转boolean
    if (s === 'true' || s === '正确' || s === '对' || s === '√') return true
    if (s === 'false' || s === '错误' || s === '错' || s === '×') return false
    if (s === 'a') return true  // A通常=正确
    if (s === 'b') return false // B通常=错误
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
  if (q.type === 'single') return String(q.answer).charAt(0)
  if (q.type === 'multiple') return (q.answer || []).join(', ')
  return q.answer ? '正确' : '错误'
}

// 选中样式（答题中，点击即高亮）
function getSelectClass(opt) {
  const letter = getOptionLetter(opt)
  if (!submitted.value) {
    if (currentQ.value.type === 'single') return { selected: userAnswers.single === letter } || ''
    if (currentQ.value.type === 'multiple') return { selected: userAnswers.multiple.includes(letter) } || ''
    return ''
  }
  // 提交后的对/错高亮
  const q = currentQ.value
  const correctAns = q.type === 'single' ? normalizeAnswer(q.answer) : (Array.isArray(q.answer) ? q.answer.map(normalizeAnswer) : [])
  if (q.type === 'single') {
    if (letter === correctAns) return 'is-correct'
    if (letter === normalizeAnswer(userAnswers.single) && letter !== correctAns) return 'is-wrong'
  }
  if (q.type === 'multiple') {
    if (correctAns.includes(letter)) return 'is-correct'
    if (userAnswers.multiple.includes(letter) && !correctAns.includes(letter)) return 'is-wrong'
  }
  return ''
}

// 导航栏小圆点
function getDotClass(i) {
  if (i === currentIndex.value) return 'active'
  const snap = answerSnapshots.value[i]
  if (!snap) return ''
  if (snap.submitted) {
    const r = snap.resultMap
    if (r === 'full' || r === true) return 'correct'
    if (r === 'partial') return 'partial'
    return 'wrong'
  }
  if (snap.submitted === false && hasAnyAnswer(snap)) return 'answered'
  return ''
}

function hasAnyAnswer(snap) {
  return snap && (
    (snap.type === 'single' && snap.single) ||
    (snap.type === 'multiple' && snap.multiple?.length > 0) ||
    (snap.type === 'judge' && snap.judge !== null && snap.judge !== undefined)
  )
}

function toggleMulti(letter) {
  if (submitted.value) return
  const idx = userAnswers.multiple.indexOf(letter)
  if (idx === -1) userAnswers.multiple.push(letter)
  else userAnswers.multiple.splice(idx, 1)
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 保存当前题的答案快照
function saveSnapshot() {
  answerSnapshots.value[currentIndex.value] = {
    single: userAnswers.single,
    multiple: [...userAnswers.multiple],
    judge: userAnswers.judge,
    submitted: submitted.value,
    resultMap: { ...resultMap.value },
    type: currentQ.value?.type
  }
}

// 从快照恢复
function restoreSnapshot(i) {
  const snap = answerSnapshots.value[i]
  if (!snap) {
    userAnswers.single = ''; userAnswers.multiple = []; userAnswers.judge = null
    submitted.value = false
    resultMap.value = {}
    return
  }
  userAnswers.single = snap.single || ''
  userAnswers.multiple = snap.multiple ? [...snap.multiple] : []
  userAnswers.judge = snap.judge ?? null
  submitted.value = snap.submitted
  resultMap.value = snap.resultMap || {}
}

function navigateTo(index) {
  if (index < 0 || index >= questions.value.length) return
  // 保存当前题快照
  saveSnapshot()
  // 恢复目标题快照
  currentIndex.value = index
  restoreSnapshot(index)
  nextTick(scrollToTop)
}

function nextQ() { if (currentIndex.value < questions.value.length - 1) navigateTo(currentIndex.value + 1) }
function prevQ() { if (currentIndex.value > 0) navigateTo(currentIndex.value - 1) }
function goToQ(i) { navigateTo(i) }

async function startPractice() {
  loading.value = true
  try {
    const params = { random: config.order === 'random' ? 'true' : 'false', limit: config.limit }
    if (config.scope === 'type') {
      let all = []
      for (const type of config.types) { const res = await store.fetchQuestions({ type, random: params.random }); all = all.concat(res) }
      questions.value = all.sort(() => Math.random() - 0.5).slice(0, config.limit)
    } else if (config.scope === 'wrong') {
      const detail = store.getProgressDetail()
      const wrongIds = detail.wrongQuestions?.map(w => w.questionId) || []
      if (!wrongIds.length) { ElMessage.info('没有错题！全部都对了 👍'); loading.value = false; return }
      const res = await store.fetchQuestions({ random: params.random })
      questions.value = res.filter(q => wrongIds.includes(q.id))
    } else {
      questions.value = await store.fetchQuestions(params)
    }
    if (!questions.value.length) { ElMessage.warning('没有符合条件的题目'); loading.value = false; return }
    currentIndex.value = 0
    userAnswers.single = ''; userAnswers.multiple = []; userAnswers.judge = null
    submitted.value = false; practiceResults.value = []; resultMap.value = {}
    answerSnapshots.value = {}
    started.value = true; showSummary.value = false
    nextTick(scrollToTop)
  } catch { ElMessage.error('获取题目失败') } finally { loading.value = false }
}

function submitAnswer() {
  submitted.value = true
  const correct = checkAnswer(currentQ.value)
  resultMap.value[currentIndex.value] = correct
  // 更新快照
  answerSnapshots.value[currentIndex.value] = { ...answerSnapshots.value[currentIndex.value], submitted: true, resultMap: { ...resultMap.value } }

  let userAnswer
  if (currentQ.value.type === 'single') userAnswer = userAnswers.single
  else if (currentQ.value.type === 'multiple') userAnswer = userAnswers.multiple
  else userAnswer = userAnswers.judge
  practiceResults.value.push({ questionId: currentQ.value.id, isCorrect: correct, userAnswer })
  store.recordAnswer(currentQ.value.id, correct === 'full' || correct === true, JSON.stringify(userAnswer), 'practice')
}

function isAnswered(i) { return practiceResults.value.some(r => r.questionId === questions.value[i]?.id) }
function isWrong(i) { const r = resultMap.value[i]; return r === 'wrong' || r === false }
function isPartial(i) { return resultMap.value[i] === 'partial' }

function finishPractice() {
  // 未答题的不算入结果
  const totalCount = practiceResults.value.length
  if (totalCount === 0) { ElMessage.warning('你还没答过任何题哦'); return }
  started.value = false
  showSummary.value = true
  nextTick(scrollToTop)
}

function restartPractice() { started.value = false; showSummary.value = false }
</script>

<style scoped>
.practice-page { max-width: 800px; }
.practice-page h2 { font-size: 22px; margin-bottom: 6px; }
.page-desc { color: var(--text-muted); margin-bottom: 24px; }
.config-form { max-width: 500px; }
.start-btn { margin-top: 16px; width: 200px; height: 44px; font-size: 16px; }
.empty-hint { text-align: center; padding: 40px; color: var(--text-muted); margin-top: 24px; }

.sticky-bar { position: sticky; top: 0; z-index: 50; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 14px 18px; margin-bottom: 20px; }
.sticky-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.progress-text { font-size: 14px; color: var(--text-secondary); white-space: nowrap; }
.sticky-nav-btns { display: flex; gap: 6px; flex-shrink: 0; }
.sticky-dots { display: flex; flex-wrap: wrap; gap: 4px; max-height: 80px; overflow-y: auto; }
.nav-dot { min-width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 11px; background: var(--bg-dark); color: var(--text-muted); cursor: pointer; transition: all 0.15s; padding: 0 4px; }
.nav-dot.active { background: var(--primary); color: #fff; }
.nav-dot.answered { background: rgba(99,102,241,0.2); color: var(--primary-light); }
.nav-dot.correct { background: rgba(34,197,94,0.3); color: var(--success); }
.nav-dot.wrong { background: rgba(239,68,68,0.3); color: var(--danger); }

.question-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 24px; }
.question-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.source-page { font-size: 12px; color: var(--text-muted); }
.question-text { font-size: 17px; line-height: 1.7; margin-bottom: 24px; font-weight: 500; }
.options-area { margin-bottom: 20px; }
.multi-hint { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; color: var(--warning); }

.big-option { display: flex; align-items: center; gap: 14px; padding: 16px 20px; margin-bottom: 10px; background: var(--bg-dark); border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; transition: all 0.15s; user-select: none; -webkit-user-select: none; }
.big-option:hover { border-color: var(--primary); transform: translateX(4px); }
.big-option:active { transform: scale(0.99); }
.big-option.selected { border-color: var(--primary); background: rgba(99,102,241,0.12); }
.big-option.selected .option-letter { background: var(--primary); color: #fff; }
.big-option.is-correct { border-color: var(--success); background: rgba(34,197,94,0.08); }
.big-option.is-wrong { border-color: var(--danger); background: rgba(239,68,68,0.08); }
.option-letter { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(99,102,241,0.15); color: var(--primary-light); font-weight: 700; font-size: 15px; flex-shrink: 0; transition: all 0.15s; }
.option-content { font-size: 15px; line-height: 1.5; flex: 1; }
.option-check { font-size: 22px; flex-shrink: 0; }

.judge-area { display: flex; gap: 16px; }
.judge-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 24px; background: var(--bg-dark); border: 2px solid var(--border-color); border-radius: 12px; cursor: pointer; transition: all 0.2s; font-size: 18px; font-weight: 600; }
.judge-btn:hover { border-color: var(--primary); }
.judge-btn.selected { border-color: var(--primary); background: rgba(99,102,241,0.12); }
.judge-btn.correct { border-color: var(--success); background: rgba(34,197,94,0.1); color: var(--success); }
.judge-btn.wrong { border-color: var(--danger); background: rgba(239,68,68,0.1); color: var(--danger); }
.judge-icon { font-size: 28px; }

.action-area { margin-top: 24px; }
.submit-btn { width: 100%; height: 48px; font-size: 17px; }
.result-banner { padding: 16px 20px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; margin-bottom: 20px; }
.result-banner.correct { background: rgba(34,197,94,0.15); color: var(--success); }
.result-banner.wrong { background: rgba(239,68,68,0.15); color: var(--danger); }
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

.result-summary { text-align: center; padding: 40px 20px; }
.result-summary h2 { font-size: 28px; margin-bottom: 32px; }
.summary-stats { display: flex; justify-content: center; gap: 24px; margin-bottom: 32px; }
.summary-item { text-align: center; padding: 20px 28px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; }
.summary-item.correct { border-color: var(--success); }
.summary-item.wrong { border-color: var(--danger); }
.summary-value { font-size: 32px; font-weight: 800; color: var(--primary-light); }
.summary-item.correct .summary-value { color: var(--success); }
.summary-item.wrong .summary-value { color: var(--danger); }
.summary-label { font-size: 13px; color: var(--text-muted); margin-top: 6px; }
.summary-actions { display: flex; justify-content: center; gap: 12px; }
</style>
