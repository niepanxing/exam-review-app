import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

axios.defaults.timeout = 120000

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
  const practiceResults = ref([]) // 本轮做题结果

  const currentQuestion = computed(() => questions.value[currentQuestionIndex.value] || null)
  const progress = computed(() => {
    if (questions.value.length === 0) return 0
    return Math.round(((currentQuestionIndex.value + 1) / questions.value.length) * 100)
  })

  async function fetchQuestions(params = {}) {
    loading.value = true
    try {
      const res = await axios.get('/api/questions', { params })
      questions.value = res.data
      currentQuestionIndex.value = 0
      practiceResults.value = []
      return res.data
    } catch (e) {
      console.error('获取题目失败:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    try {
      const res = await axios.get('/api/questions/stats')
      stats.value = res.data
      return res.data
    } catch (e) {
      console.error('获取统计失败:', e)
    }
  }

  async function deleteQuestion(id) {
    await axios.delete(`/api/questions/${id}`)
    questions.value = questions.value.filter(q => q.id !== id)
  }

  async function recordAnswer(questionId, isCorrect, userAnswer, mode) {
    await axios.post('/api/questions/record', { questionId, isCorrect, userAnswer, mode })
    practiceResults.value.push({ questionId, isCorrect, userAnswer })
    stats.value.practiceStats.total++
    if (isCorrect) stats.value.practiceStats.correct++
  }

  function nextQuestion() {
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++
    }
  }

  function prevQuestion() {
    if (currentQuestionIndex.value > 0) {
      currentQuestionIndex.value--
    }
  }

  function goToQuestion(index) {
    if (index >= 0 && index < questions.value.length) {
      currentQuestionIndex.value = index
    }
  }

  function resetPractice() {
    currentQuestionIndex.value = 0
    practiceResults.value = []
  }

  return {
    questions, stats, loading, currentQuestionIndex, practiceResults,
    currentQuestion, progress,
    fetchQuestions, fetchStats, deleteQuestion, recordAnswer,
    nextQuestion, prevQuestion, goToQuestion, resetPractice
  }
})
