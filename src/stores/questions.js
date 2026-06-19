import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

axios.defaults.timeout = 120000

// 导入本地题目数据（构建时打包进去）
import localQuestions from '../data/questions.json'
import localStats from '../data/stats.json'
import bankIndex from '../data/banks/index.json'

// 检测后端是否可用
let backendAvailable = true
async function checkBackend() {
  try {
    await axios.get('/api/questions/stats', { timeout: 3000 })
    backendAvailable = true
  } catch {
    backendAvailable = false
  }
  return backendAvailable
}

// ===== localStorage 进度管理 =====
const PROGRESS_KEY = 'exam-progress'
const SETTINGS_KEY = 'exam-settings'

function loadProgress() {
  try {
    const data = localStorage.getItem(PROGRESS_KEY)
    if (data) return JSON.parse(data)
  } catch {}
  return { records: [], stats: { total: 0, correct: 0 } }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {}
}

function loadSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY)
    if (data) return JSON.parse(data)
  } catch {}
  return {}
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

export const useQuestionStore = defineStore('questions', () => {
  const questions = ref([])
  const stats = ref({
    total: 0,
    byType: { single: 0, multiple: 0, judge: 0 },
    byDifficulty: { 1: 0, 2: 0, 3: 0 },
    byDoc: {},
    practiceStats: { total: 0, correct: 0 }
  })
  const loading = ref(false)
  const currentQuestionIndex = ref(0)
  const practiceResults = ref([])

  // 本地进度
  const localProgress = ref(loadProgress())

  const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] || null)
  const progress = computed(() => {
    if (questions.value.length === 0) return 0
    return Math.round(((currentQuestionIndex.value + 1) / questions.value.length) * 100)
  })

  async function fetchQuestions(params = {}) {
    loading.value = true
    try {
      if (backendAvailable) {
        try {
          const res = await axios.get('/api/questions', { params, timeout: 10000 })
          questions.value = res.data
          currentQuestionIndex.value = 0
          practiceResults.value = []
          return res.data
        } catch {
          backendAvailable = false
        }
      }
      // 后端不可用，用本地数据
      let filtered = [...localQuestions]
      if (params.bank) filtered = filtered.filter(q => q.bank === params.bank)
      if (params.type) filtered = filtered.filter(q => q.type === params.type)
      if (params.random === 'true') filtered = filtered.sort(() => Math.random() - 0.5)
      if (params.limit) filtered = filtered.slice(0, parseInt(params.limit))
      questions.value = filtered
      currentQuestionIndex.value = 0
      practiceResults.value = []
      return filtered
    } catch (e) {
      console.error('获取题目失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    try {
      if (backendAvailable) {
        try {
          const res = await axios.get('/api/questions/stats', { timeout: 5000 })
          stats.value = res.data
          // 合并本地进度
          stats.value.practiceStats = localProgress.value.stats
          return res.data
        } catch {
          backendAvailable = false
        }
      }
      // 后端不可用，用本地数据
      stats.value = {
        total: localStats.total,
        byType: localStats.byType,
        byDifficulty: { 1: 0, 2: 0, 3: 0 },
        byDoc: {},
        practiceStats: localProgress.value.stats
      }
    } catch (e) {
      console.error('获取统计失败:', e)
    }
  }

  async function deleteQuestion(id) {
    if (backendAvailable) {
      try {
        await axios.delete(`/api/questions/${id}`)
      } catch { backendAvailable = false }
    }
    questions.value = questions.value.filter(q => q.id !== id)
  }

  async function recordAnswer(questionId, isCorrect, userAnswer, mode) {
    // 记录到本地进度
    const record = { questionId, isCorrect, userAnswer, mode, timestamp: new Date().toISOString() }
    localProgress.value.records.push(record)
    localProgress.value.stats.total++
    if (isCorrect) localProgress.value.stats.correct++
    saveProgress(localProgress.value)

    // 尝试同步到后端
    if (backendAvailable) {
      try {
        await axios.post('/api/questions/record', { questionId, isCorrect, userAnswer, mode })
      } catch { backendAvailable = false }
    }

    practiceResults.value.push({ questionId, isCorrect, userAnswer })
    stats.value.practiceStats = localProgress.value.stats
  }

  // 获取详细的做题进度（用于错题重做等）
  function getProgressDetail() {
    const questionStats = {}
    localProgress.value.records.forEach(r => {
      if (!questionStats[r.questionId]) {
        questionStats[r.questionId] = { attempts: 0, correct: 0, lastMode: null }
      }
      questionStats[r.questionId].attempts++
      if (r.isCorrect) questionStats[r.questionId].correct++
      questionStats[r.questionId].lastMode = r.mode
    })

    const wrongQuestions = Object.entries(questionStats)
      .filter(([_, s]) => s.attempts > 0 && s.correct === 0)
      .map(([id, s]) => ({ ...s, questionId: id }))

    return {
      totalQuestions: localStats.total,
      practicedQuestions: Object.keys(questionStats).length,
      wrongCount: wrongQuestions.length,
      stats: localProgress.value.stats,
      wrongQuestions
    }
  }

  function nextQuestion() {
    if (currentQuestionIndex.value < questions.value.length - 1) currentQuestionIndex.value++
  }

  function prevQuestion() {
    if (currentQuestionIndex.value > 0) currentQuestionIndex.value--
  }

  function goToQuestion(index) {
    if (index >= 0 && index < questions.value.length) currentQuestionIndex.value = index
  }

  function resetPractice() {
    currentQuestionIndex.value = 0
    practiceResults.value = []
  }

  // 初始化时检测后端
  checkBackend()

  return {
    questions, stats, loading, currentQuestionIndex, practiceResults,
    currentQuestion, progress, backendAvailable: () => backendAvailable,
    bankIndex,
    fetchQuestions, fetchStats, deleteQuestion, recordAnswer,
    getProgressDetail, nextQuestion, prevQuestion, goToQuestion, resetPractice,
    loadSettings, saveSettings
  }
})
