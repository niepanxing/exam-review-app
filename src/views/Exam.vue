<template>
  <div class="exam-page">
    <!-- 配置页 -->
    <div class="config-bar" v-if="!started && !showResult">
      <h2>📝 试卷模式</h2>
      <p class="page-desc">80道题满分100分，限时60分钟，60分及格</p>

      <div class="score-rule">
        <h3>题目分配</h3>
        <div class="rule-grid">
          <div class="rule-item">
            <span class="rule-type">研发云</span>
            <span class="rule-score">25 题 x 1 分</span>
            <span class="rule-detail">共 25 分</span>
          </div>
          <div class="rule-item">
            <span class="rule-type">智能体</span>
            <span class="rule-score">25 题 x 1 分</span>
            <span class="rule-detail">共 25 分</span>
          </div>
          <div class="rule-item">
            <span class="rule-type">产品思维</span>
            <span class="rule-score">10 题 x 1 分</span>
            <span class="rule-detail">共 10 分</span>
          </div>
          <div class="rule-item">
            <span class="rule-type">项目管理</span>
            <span class="rule-score">10 题 x 1 分</span>
            <span class="rule-detail">共 10 分</span>
          </div>
          <div class="rule-item">
            <span class="rule-type">Claude Code</span>
            <span class="rule-score">5 题 x 1 分</span>
            <span class="rule-detail">共 5 分</span>
          </div>
          <div class="rule-item">
            <span class="rule-type">AI Coding</span>
            <span class="rule-score">5 题 x 1 分</span>
            <span class="rule-detail">共 5 分</span>
          </div>
        </div>
        <div class="score-summary">
          总计 80 题，满分 100 分（含多选题加权：多选全对+2/漏选+1/错选-2）
        </div>
      </div>

      <div class="pool-info">
        <span>当前题库：</span>
        <el-tag>共 {{ poolInfo.total }} 题</el-tag>
        <el-tag type="primary">{{ poolInfo.yanfayun }} 研发云</el-tag>
        <el-tag type="success">{{ poolInfo.zhinengeti }} 智能体</el-tag>
        <el-tag type="warning">{{ poolInfo.chanpin }} 产品</el-tag>
        <el-tag type="info">{{ poolInfo.xiangmu }} 项目管理</el-tag>
        <el-tag>{{ poolInfo.claude }} Claude Code</el-tag>
        <el-tag type="danger">{{ poolInfo.aicoding }} AI Coding</el-tag>
      </div>

      <div class="config-form">
        <el-form :model="config" label-position="top">
          <el-form-item label="主题不足时">
            <el-radio-group v-model="config.fillMode">
              <el-radio-button value="repeat">允许重复出题</el-radio-button>
              <el-radio-button value="less">有多少出多少</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <el-button type="primary" size="large" class="start-btn" :loading="loading" @click="startExam">开始考试</el-button>
      </div>
    </div>

    <!-- 考试主界面 -->
    <div class="exam-main" v-if="started && !showResult">
      <div class="sticky-bar">
        <div class="sticky-top">
          <div class="exam-timer" :class="{ urgent: remainingTime < 300 }">
            <el-icon><Clock /></el-icon>
            <span>{{ formatTime(remainingTime) }}</span>
          </div>
          <el-progress :percentage="progress" :stroke-width="10" style="flex:1" />
          <span class="progress-text">{{ currentIndex + 1 }} / {{ examQuestions.length }}</span>
          <div class="sticky-nav-btns">
            <el-button size="small" @click="goToQ(currentIndex - 1)" :disabled="currentIndex === 0"><el-icon><ArrowLeft /></el-icon></el-button>
            <el-button size="small" @click="goToQ(currentIndex + 1)" :disabled="currentIndex >= examQuestions.length - 1"><el-icon><ArrowRight /></el-icon></el-button>
            <el-button size="small" type="danger" @click="confirmSubmit">交卷</el-button>
          </div>
        </div>
        <div class="sticky-dots">
          <div class="nav-dot" v-for="(q, i) in examQuestions" :key="i"
            :class="getDotClass(i)"
            @click="goToQ(i)">{{ i + 1 }}</div>
        </div>
      </div>

      <!-- 当前题目 -->
      <div class="question-card" v-if="currentQ">
        <div class="question-header">
          <el-tag :type="typeTagMap[currentQ.type]" size="small">{{ typeLabelMap[currentQ.type] }}</el-tag>
          <el-tag type="info" size="small">第 {{ currentIndex + 1 }} 题</el-tag>
          <el-tag size="small">{{ getScoreLabel(currentQ) }}</el-tag>
          <span class="source-page" v-if="currentQ.sourcePage">📍 {{ currentQ.sourceDoc }} 第{{ currentQ.sourcePage }}页</span>
        </div>

        <div class="question-text">{{ currentQ.question }}</div>

        <!-- 选项（答题中） -->
        <div class="options-area" v-if="!submitted">
          <!-- 单选 -->
          <template v-if="currentQ.type === 'single'">
            <div v-for="(opt, i) in currentQ.options" :key="i"
              class="option-item big-option"
              :class="{ selected: answers[currentIndex] === getOptionLetter(opt) }"
              @click="answers[currentIndex] = getOptionLetter(opt)">
              <span class="option-letter">{{ getOptionLetter(opt) }}</span>
              <span class="option-content">{{ opt.substring(3) }}</span>
            </div>
          </template>

          <!-- 多选 -->
          <template v-if="currentQ.type === 'multiple'">
            <div class="multi-hint"><el-tag type="warning" size="small">多选题</el-tag><span>已选 {{ (answers[currentIndex] || []).length }} 个</span></div>
            <div v-for="(opt, i) in currentQ.options" :key="i"
              class="option-item big-option"
              :class="{ selected: (answers[currentIndex] || []).includes(getOptionLetter(opt)) }"
              @click="toggleMulti(getOptionLetter(opt))">
              <span class="option-check">{{ (answers[currentIndex] || []).includes(getOptionLetter(opt)) ? '☑' : '☐' }}</span>
              <span class="option-letter">{{ getOptionLetter(opt) }}</span>
              <span class="option-content">{{ opt.substring(3) }}</span>
            </div>
          </template>

          <!-- 判断 -->
          <template v-if="currentQ.type === 'judge'">
            <div class="judge-area">
              <div class="judge-btn" :class="{ selected: answers[currentIndex] === true }" @click="answers[currentIndex] = true">
                <span class="judge-icon">✅</span><span>正确</span>
              </div>
              <div class="judge-btn" :class="{ selected: answers[currentIndex] === false }" @click="answers[currentIndex] = false">
                <span class="judge-icon">❌</span><span>错误</span>
              </div>
            </div>
          </template>

          <el-button type="primary" size="large" class="submit-btn" @click="submitCurrentAnswer" :disabled="!hasAnswer">提交本题</el-button>
        </div>

        <!-- 提交后：结果 + 解析 -->
        <div class="answer-result" v-if="submitted">
          <div :class="['result-banner', isCurrentCorrect ? 'correct' : 'wrong']">
            <span>{{ isCurrentCorrect ? '🎉 回答正确！' : '😢 回答错误' }}</span>
            <span class="result-score">{{ getPointScore(currentIndex) }} 分</span>
            <span class="correct-answer" v-if="!isCurrentCorrect">正确答案: {{ formatAnswer(currentQ) }}</span>
          </div>

          <!-- 选项回显，高亮正确/错误 -->
          <template v-if="currentQ.type === 'single'">
            <div v-for="(opt, i) in currentQ.options" :key="i"
              class="option-item big-option" :class="getSubmittedOptionClass(opt)">
              <span class="option-letter">{{ getOptionLetter(opt) }}</span>
              <span class="option-content">{{ opt.substring(3) }}</span>
            </div>
          </template>
          <template v-if="currentQ.type === 'multiple'">
            <div v-for="(opt, i) in currentQ.options" :key="i"
              class="option-item big-option" :class="getSubmittedOptionClass(opt)">
              <span class="option-check">{{ (answers[currentIndex] || []).includes(getOptionLetter(opt)) ? '☑' : '☐' }}</span>
              <span class="option-letter">{{ getOptionLetter(opt) }}</span>
              <span class="option-content">{{ opt.substring(3) }}</span>
            </div>
          </template>
          <template v-if="currentQ.type === 'judge'">
            <div class="judge-area">
              <div class="judge-btn" :class="{ correct: currentQ.answer === true }"><span class="judge-icon">✅</span><span>正确</span></div>
              <div class="judge-btn" :class="{ correct: currentQ.answer === false }"><span class="judge-icon">❌</span><span>错误</span></div>
            </div>
          </template>

          <!-- 解析 -->
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
            <el-button size="large" @click="prevQ" :disabled="currentIndex === 0"><el-icon><ArrowLeft /></el-icon> 上一题</el-button>
            <el-button size="large" v-if="currentIndex < examQuestions.length - 1" type="primary" @click="nextAndAutoScroll">下一题 <el-icon><ArrowRight /></el-icon></el-button>
            <el-button size="large" v-else type="success" @click="confirmSubmit">交卷 🏁</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 考试结果 -->
    <div class="exam-result" v-if="showResult">
      <h2>📋 考试成绩单</h2>
      <div class="score-display">
        <div class="total-score" :class="{ pass: totalScore >= 60, fail: totalScore < 60 }">
          <div class="score-number">{{ totalScore }}</div>
          <div class="score-total">/ {{ examQuestions.length }} 分</div>
        </div>
        <div class="score-breakdown">
          <div class="breakdown-item"><span>单选题</span><span>{{ scoreDetail.singleEarned }} / 50 分</span></div>
          <div class="breakdown-item"><span>多选题</span><span>{{ scoreDetail.multiEarned }} / 40 分</span></div>
          <div class="breakdown-item"><span>判断题</span><span>{{ scoreDetail.judgeEarned }} / 10 分</span></div>
        </div>
      </div>
      <div class="detail-section">
        <h3>答题详情</h3>
        <div class="detail-list">
          <div v-for="(q, i) in examQuestions" :key="i" class="detail-item" :class="getResultClass(i)">
            <div class="detail-header"><span class="detail-num">第{{ i + 1 }}题</span><el-tag :type="typeTagMap[q.type]" size="small">{{ typeLabelMap[q.type] }}</el-tag><span class="detail-score">{{ getItemScore(i) }} 分</span></div>
            <div class="detail-question">{{ q.question }}</div>
            <div class="detail-answers"><span>你的答案: {{ formatUserAnswer(i) }}</span><span>正确答案: {{ formatAnswer(q) }}</span></div>
            <div class="detail-exp" v-if="q.explanation?.mainExp"><strong>解析:</strong> {{ q.explanation.mainExp }}</div>
          </div>
        </div>
      </div>
      <div class="result-actions">
        <el-button type="primary" @click="startExam">再考一次</el-button>
        <el-button @click="showResult = false; started = false">返回</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useQuestionStore } from '../stores/questions.js'
import { ElMessage, ElMessageBox } from 'element-plus'

const store = useQuestionStore()
const poolInfo = ref({ total: 0, yanfayun: 0, zhinengeti: 0, chanpin: 0, xiangmu: 0, claude: 0, aicoding: 0 })
const started = ref(false)
const showResult = ref(false)
const loading = ref(false)
const examQuestions = ref([])
const currentIndex = ref(0)
const answers = reactive({})
const resultMap = reactive({})   // index -> boolean
const submitted = ref(false)
const remainingTime = ref(3600)
const timerInterval = ref(null)
const config = reactive({ fillMode: 'repeat' })

const typeTagMap = { single: '', multiple: 'warning', judge: 'success' }
const typeLabelMap = { single: '单选', multiple: '多选', judge: '判断' }
const diffTagMap = { 1: 'success', 2: 'warning', 3: 'danger' }

const currentQ = computed(() => examQuestions.value[currentIndex.value])
const progress = computed(() => examQuestions.value.length ? Math.round(((currentIndex.value + 1) / examQuestions.value.length) * 100) : 0)
const isCurrentCorrect = computed(() => currentQ.value ? resultMap[currentIndex.value] : false)
const hasAnswer = computed(() => {
  const a = answers[currentIndex.value]
  if (a === undefined || a === null) return false
  if (Array.isArray(a)) return a.length > 0
  return true
})

// ===== 主题分类 =====
// 将题目按来源文档归类到6个主题
function getCategory(q) {
  const doc = (q.sourceDoc || '').toLowerCase()
  // 优先匹配文档名
  if (doc.includes('codefree') || doc.includes('研发云')) return 'yanfayun'
  if (doc.includes('claude code') || doc.includes('基于 vibe coding')) return 'claude'
  if (doc.includes('ai coding') || doc.includes('毛剑')) return 'aicoding'
  if (doc.includes('ipd') || doc.includes('项目管理')) return 'xiangmu'
  if (doc.includes('产品') || doc.includes('端到端')) return 'chanpin'
  // 智能体大类：智能体、teleclaw、星辰、开源支撑、行业洞察、笔记
  if (doc.includes('智能体') || doc.includes('teleclaw') || doc.includes('星辰超级') || doc.includes('开源支撑') || doc.includes('行业') || doc.includes('笔记')) return 'zhinengeti'
  // 默认按关键词再匹配题目内容
  const text = (q.question || '').toLowerCase()
  if (text.includes('研发云') || text.includes('codefree')) return 'yanfayun'
  if (text.includes('claude code') || text.includes('claude')) return 'claude'
  if (text.includes('ai coding') || text.includes('毛剑')) return 'aicoding'
  if (text.includes('ipd') || text.includes('项目管理') || text.includes('研发管理')) return 'xiangmu'
  if (text.includes('产品') || text.includes('用户体验')) return 'chanpin'
  if (text.includes('智能体') || text.includes('agent')) return 'zhinengeti'
  return 'zhinengeti' // 默认归入智能体
}

// 主题配置：每个主题抽多少题
const categoryConfig = [
  { key: 'yanfayun', label: '研发云', count: 25 },
  { key: 'zhinengeti', label: '智能体', count: 25 },
  { key: 'chanpin', label: '产品思维', count: 10 },
  { key: 'xiangmu', label: '项目管理', count: 10 },
  { key: 'claude', label: 'Claude Code', count: 5 },
  { key: 'aicoding', label: 'AI Coding', count: 5 },
]
onMounted(async () => {
  try {
    const allQ = await store.fetchQuestions()
    const stats = { total: allQ.length, yanfayun: 0, zhinengeti: 0, chanpin: 0, xiangmu: 0, claude: 0, aicoding: 0 }
    allQ.forEach(q => {
      const cat = getCategory(q)
      if (stats[cat] !== undefined) stats[cat]++
    })
    poolInfo.value = stats
  } catch (e) {
    console.error('[Exam] 加载题库统计失败:', e)
  }
})

// ===== 工具函数 =====

// 安全提取选项字母
function getOptionLetter(opt) {
  return (opt || '').charAt(0)
}

// 安全比较答案（兼容 True/true、大写/小写、字符串类型）
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

function checkSingleCorrect(q, i) {
  const userAns = normalizeAnswer(answers[i])
  const correctAns = normalizeAnswer(q.answer)
  return userAns === correctAns
}

function checkMultiCorrect(q, i) {
  const selected = (answers[i] || []).map(a => normalizeAnswer(a)).sort()
  const correct = (Array.isArray(q.answer) ? q.answer : [q.answer]).map(a => normalizeAnswer(a)).sort()
  // 三档: 'full'全对, 'partial'漏选, 'wrong'有错选或未选
  const hasWrong = selected.some(s => !correct.includes(s))
  const hasAll = correct.every(c => selected.includes(c))
  if (hasAll && !hasWrong) return 'full'
  if (hasWrong) return 'wrong'
  if (selected.length > 0) return 'partial' // 漏选
  return 'wrong'
}

function checkJudgeCorrect(q, i) {
  const userAns = normalizeAnswer(answers[i])
  const correctAns = normalizeAnswer(q.answer)
  if (typeof correctAns === 'boolean') return userAns === correctAns
  return userAns === correctAns
}

function checkCorrect(q, i) {
  if (q.type === 'single') return checkSingleCorrect(q, i)
  if (q.type === 'multiple') return checkMultiCorrect(q, i)
  if (q.type === 'judge') return checkJudgeCorrect(q, i)
  return false
}

function formatAnswer(q) {
  if (q.type === 'single') return String(q.answer).charAt(0)
  if (q.type === 'multiple') return (q.answer || []).join(', ')
  return q.answer ? '正确' : '错误'
}

function formatUserAnswer(i) {
  const ans = answers[i]
  if (ans === undefined || ans === null) return '未作答'
  if (typeof ans === 'string') return ans
  if (Array.isArray(ans)) return ans.join(', ')
  return ans ? '正确' : '错误'
}

function getScoreLabel(q) {
  if (q.type === 'multiple') return '1-2分'
  return '1分'
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function getDotClass(i) {
  if (i === currentIndex.value) return 'active'
  const r = resultMap[i]
  if (r === 'full' || r === true) return 'correct'
  if (r === 'wrong' || r === false) return 'wrong'
  if (r === 'partial') return 'partial'
  if (answers[i] !== undefined && answers[i] !== null && (!Array.isArray(answers[i]) || answers[i].length > 0)) return 'answered'
  return ''
}

function getSubmittedOptionClass(opt) {
  const letter = getOptionLetter(opt)
  const q = currentQ.value
  const isRight = q.type === 'single' ? normalizeAnswer(q.answer) === letter
    : Array.isArray(q.answer) ? q.answer.map(a => normalizeAnswer(a)).includes(letter) : false
  const userSelected = q.type === 'single' ? normalizeAnswer(answers[currentIndex.value]) === letter
    : (answers[currentIndex.value] || []).map(a => normalizeAnswer(a)).includes(letter)
  if (isRight) return 'is-correct'
  if (userSelected && !isRight) return 'is-wrong'
  return ''
}

function getPointScore(i) {
  const q = examQuestions.value[i]
  if (!q) return 0
  const r = resultMap[i]
  if (q.type === 'single') return (r === 'full' || r === true) ? 1 : 0
  if (q.type === 'judge') return (r === 'full' || r === true) ? 1 : 0
  if (q.type === 'multiple') {
    if (r === 'full') return 2
    if (r === 'partial') return 1
    if (r === 'wrong') return -2
    if (r === true) return 2  // 兼容旧数据
    if (r === false) return -2
    return 0
  }
  return 0
}

function getItemScore(i) { return getPointScore(i) }
function getResultClass(i) { const s = getItemScore(i); return s > 0 ? 'correct' : s < 0 ? 'wrong' : 'miss' }

// 多选题结果文字
function getMultiResultText(i) {
  const r = resultMap[i]
  if (r === 'full') return '全对 +2分'
  if (r === 'partial') return '漏选 +1分'
  if (r === 'wrong') return '错选 -2分'
  return ''
}

// ===== 计分 =====
function calcScores() {
  const detail = { singleEarned: 0, singleMax: 0, multiEarned: 0, multiMax: 0, judgeEarned: 0, judgeMax: 0, items: [] }
  examQuestions.value.forEach((q, i) => {
    const score = getPointScore(i)
    if (q.type === 'single') { detail.singleMax += 1; detail.singleEarned += Math.max(0, score) }
    else if (q.type === 'multiple') { detail.multiMax += 1; detail.multiEarned += score }
    else if (q.type === 'judge') { detail.judgeMax += 1; detail.judgeEarned += Math.max(0, score) }
    detail.items.push({ score })
  })
  return detail
}

const scoreDetail = computed(() => calcScores())
const totalScore = computed(() => {
  // 基础分: 每题1分, 多选全对额外+1
  let base = 0
  examQuestions.value.forEach((q, i) => {
    const s = getPointScore(i)
    base += s
  })
  return Math.max(0, base)
})

// ===== 操作 =====
function toggleMulti(letter) {
  if (!answers[currentIndex.value]) answers[currentIndex.value] = []
  const arr = answers[currentIndex.value]
  const idx = arr.indexOf(letter)
  if (idx === -1) arr.push(letter)
  else arr.splice(idx, 1)
  if (arr.length === 0) delete answers[currentIndex.value]
}

async function startExam() {
  loading.value = true; showResult.value = false
  try {
    console.log('[Exam] 开始获取题目...')
    const allQ = await store.fetchQuestions()
    console.log('[Exam] 获取到题目:', allQ.length, '道')

    // 按主题分类
    const byCategory = {}
    allQ.forEach(q => {
      const cat = getCategory(q)
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(q)
    })
    console.log('[Exam] 分类:', Object.fromEntries(Object.entries(byCategory).map(([k,v]) => [k, v.length])))

    const fill = (pool, count) => {
      if (pool.length === 0) return []
      const result = []; const shuffled = [...pool].sort(() => Math.random() - 0.5)
      for (let i = 0; i < count; i++) result.push(config.fillMode === 'repeat' ? shuffled[i % shuffled.length] : shuffled[i])
      return result
    }

    const exam = []
    for (const cfg of categoryConfig) {
      const pool = byCategory[cfg.key] || []
      let count = cfg.count
      if (config.fillMode === 'less') count = Math.min(count, pool.length)
      const picked = fill(pool, count)
      console.log(`[Exam] ${cfg.label}: 需${cfg.count}题, 池${pool.length}题, 抽${picked.length}题`)
      exam.push(...picked)
    }

    console.log('[Exam] 组卷完成:', exam.length, '题')
    examQuestions.value = exam.sort(() => Math.random() - 0.5)
    Object.keys(answers).forEach(k => delete answers[k])
    Object.keys(resultMap).forEach(k => delete resultMap[k])
    currentIndex.value = 0; submitted.value = false
    remainingTime.value = 3600; started.value = true
    console.log('[Exam] 考试开始')

    if (timerInterval.value) clearInterval(timerInterval.value)
    timerInterval.value = setInterval(() => { remainingTime.value--; if (remainingTime.value <= 0) submitExam() }, 1000)
  } catch (e) {
    console.error('[Exam] 开始考试失败:', e)
    ElMessage.error('获取题目失败: ' + (e.message || '未知错误'))
  } finally { loading.value = false }
}

function submitCurrentAnswer() {
  if (!currentQ.value) return
  const correct = checkCorrect(currentQ.value, currentIndex.value)
  resultMap[currentIndex.value] = correct
  submitted.value = true

  // 记录
  store.recordAnswer(currentQ.value.id, correct, JSON.stringify(answers[currentIndex.value]), 'exam')
}

function nextAndAutoScroll() {
  if (currentIndex.value < examQuestions.value.length - 1) {
    currentIndex.value++; submitted.value = false; window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function prevQ() {
  if (currentIndex.value > 0) {
    currentIndex.value--; submitted.value = resultMap[currentIndex.value] !== undefined
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goToQ(i) {
  if (i >= 0 && i < examQuestions.value.length) {
    currentIndex.value = i
    submitted.value = resultMap[i] !== undefined
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

async function confirmSubmit() {
  const done = Object.keys(resultMap).length
  try {
    await ElMessageBox.confirm(`已答 ${done}/${examQuestions.value.length} 题，确定交卷？`, '确认交卷', { type: 'warning', confirmButtonText: '交卷', cancelButtonText: '继续答题' })
    submitExam()
  } catch {}
}

function submitExam() {
  if (timerInterval.value) clearInterval(timerInterval.value)
  // 未答题的也记录
  examQuestions.value.forEach((q, i) => {
    if (resultMap[i] === undefined) {
      resultMap[i] = checkCorrect(q, i)
      store.recordAnswer(q.id, resultMap[i], JSON.stringify(answers[i]), 'exam')
    }
  })
  started.value = false; showResult.value = true; window.scrollTo({ top: 0 })
}

onUnmounted(() => { if (timerInterval.value) clearInterval(timerInterval.value) })
</script>

<style scoped>
.exam-page { max-width: 800px; }
.exam-page h2 { font-size: 22px; margin-bottom: 6px; }
.page-desc { color: var(--text-muted); margin-bottom: 24px; }

.score-rule { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 20px; margin-bottom: 20px; }
.score-rule h3 { font-size: 16px; margin-bottom: 12px; }
.rule-grid { display: flex; flex-direction: column; gap: 10px; }
.rule-item { display: flex; align-items: center; gap: 16px; padding: 10px 14px; background: var(--bg-dark); border-radius: 8px; }
.rule-type { font-weight: 600; min-width: 90px; color: var(--primary-light); }
.rule-score { color: var(--text-secondary); font-size: 14px; }
.rule-detail { color: var(--text-muted); font-size: 13px; margin-left: auto; }

.pool-info { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; font-size: 14px; color: var(--text-secondary); }
.config-form { max-width: 500px; }
.start-btn { margin-top: 16px; width: 200px; height: 44px; font-size: 16px; }

.sticky-bar { position: sticky; top: 0; z-index: 50; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 14px 18px; margin-bottom: 20px; }
.sticky-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.exam-timer { display: flex; align-items: center; gap: 6px; font-size: 18px; font-weight: 700; color: var(--primary-light); white-space: nowrap; min-width: 70px; }
.exam-timer.urgent { color: var(--danger); animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0.5; } }
.progress-text { font-size: 14px; color: var(--text-secondary); white-space: nowrap; }
.sticky-nav-btns { display: flex; gap: 6px; flex-shrink: 0; }
.sticky-dots { display: flex; flex-wrap: wrap; gap: 3px; max-height: 100px; overflow-y: auto; }
.nav-dot { min-width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 5px; font-size: 10px; background: var(--bg-dark); color: var(--text-muted); cursor: pointer; transition: all 0.15s; padding: 0 3px; }
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

.big-option { display: flex; align-items: center; gap: 14px; padding: 16px 20px; margin-bottom: 10px; background: var(--bg-dark); border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; transition: all 0.15s; user-select: none; }
.big-option:hover { border-color: var(--primary); }
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
.judge-btn.selected .judge-icon { transform: scale(1.2); }
.judge-btn.correct { border-color: var(--success); background: rgba(34,197,94,0.12); color: var(--success); }
.judge-icon { font-size: 28px; }

.submit-btn { width: 100%; height: 48px; font-size: 17px; margin-top: 16px; }

.result-banner { padding: 16px 20px; border-radius: 10px; display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; margin-bottom: 20px; }
.result-banner.correct { background: rgba(34,197,94,0.15); color: var(--success); }
.result-banner.wrong { background: rgba(239,68,68,0.15); color: var(--danger); }
.result-score { font-size: 18px; font-weight: 800; margin-left: auto; }
.correct-answer { font-weight: 400; font-size: 14px; margin-left: 8px; }

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

.exam-result { padding-top: 10px; }
.exam-result h2 { font-size: 26px; text-align: center; margin-bottom: 24px; }
.score-display { text-align: center; margin-bottom: 32px; }
.total-score { display: inline-flex; align-items: baseline; gap: 8px; padding: 24px 40px; background: var(--bg-card); border: 2px solid var(--border-color); border-radius: 16px; }
.total-score.pass { border-color: var(--success); }
.total-score.fail { border-color: var(--danger); }
.score-number { font-size: 64px; font-weight: 900; }
.total-score.pass .score-number { color: var(--success); }
.total-score.fail .score-number { color: var(--danger); }
.score-total { font-size: 20px; color: var(--text-muted); }
.score-breakdown { display: flex; justify-content: center; gap: 32px; margin-top: 20px; }
.breakdown-item { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 14px; color: var(--text-secondary); }

.detail-section { margin-top: 32px; }
.detail-section h3 { font-size: 18px; margin-bottom: 16px; }
.detail-list { display: flex; flex-direction: column; gap: 8px; }
.detail-item { padding: 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; }
.detail-item.correct { border-left: 3px solid var(--success); }
.detail-item.wrong { border-left: 3px solid var(--danger); }
.detail-item.miss { border-left: 3px solid var(--text-muted); }
.detail-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.detail-num { font-weight: 600; font-size: 13px; color: var(--text-muted); }
.detail-score { margin-left: auto; font-weight: 700; font-size: 15px; }
.detail-item.correct .detail-score { color: var(--success); }
.detail-item.wrong .detail-score { color: var(--danger); }
.detail-question { font-size: 14px; margin-bottom: 6px; }
.detail-answers { font-size: 13px; color: var(--text-secondary); display: flex; gap: 16px; }
.detail-exp { margin-top: 8px; font-size: 13px; color: var(--text-muted); line-height: 1.6; }
.result-actions { display: flex; justify-content: center; gap: 12px; margin-top: 32px; }
</style>
