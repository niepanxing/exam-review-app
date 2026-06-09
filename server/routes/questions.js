import express from 'express'
import { loadData, saveData } from '../services/storage.js'
import { generateQuestions } from '../services/generator.js'

const router = express.Router()

/**
 * GET /api/questions
 * 获取题目列表，支持筛选
 */
router.get('/', (req, res) => {
  const { type, sourceDoc, difficulty, keyword, mode, limit, random } = req.query
  let questions = loadData('questions.json', [])

  // 筛选
  if (type) questions = questions.filter(q => q.type === type)
  if (sourceDoc) questions = questions.filter(q => q.sourceDoc === sourceDoc)
  if (difficulty) questions = questions.filter(q => q.difficulty === parseInt(difficulty))
  if (keyword) {
    const kw = keyword.toLowerCase()
    questions = questions.filter(q =>
      q.question.toLowerCase().includes(kw) ||
      (q.explanation?.mainExp || '').toLowerCase().includes(kw) ||
      (q.tags || []).some(t => t.toLowerCase().includes(kw))
    )
  }

  // 随机排序
  if (random === 'true') {
    questions = questions.sort(() => Math.random() - 0.5)
  }

  // 限制数量
  if (limit) {
    questions = questions.slice(0, parseInt(limit))
  }

  res.json(questions)
})

/**
 * GET /api/questions/stats
 * 获取题目统计
 */
router.get('/stats', (req, res) => {
  const questions = loadData('questions.json', [])
  const progress = loadData('progress.json', { records: [], stats: { total: 0, correct: 0 } })

  const stats = {
    total: questions.length,
    byType: {
      single: questions.filter(q => q.type === 'single').length,
      multiple: questions.filter(q => q.type === 'multiple').length,
      judge: questions.filter(q => q.type === 'judge').length
    },
    byDifficulty: {
      1: questions.filter(q => q.difficulty === 1).length,
      2: questions.filter(q => q.difficulty === 2).length,
      3: questions.filter(q => q.difficulty === 3).length
    },
    byDoc: {},
    practiceStats: progress.stats
  }

  // 按文档分组统计
  questions.forEach(q => {
    const doc = q.sourceDoc || '未知文档'
    stats.byDoc[doc] = (stats.byDoc[doc] || 0) + 1
  })

  res.json(stats)
})

/**
 * GET /api/questions/:id
 * 获取单个题目
 */
router.get('/:id', (req, res) => {
  const questions = loadData('questions.json', [])
  const question = questions.find(q => q.id === req.params.id)
  if (!question) return res.status(404).json({ error: '题目不存在' })
  res.json(question)
})

/**
 * POST /api/questions
 * 手动添加题目
 */
router.post('/', (req, res) => {
  const questions = loadData('questions.json', [])
  const q = req.body
  
  q.id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  q.createdAt = new Date().toISOString()
  
  questions.push(q)
  saveData('questions.json', questions)
  res.json({ success: true, question: q })
})

/**
 * PUT /api/questions/:id
 * 更新题目
 */
router.put('/:id', (req, res) => {
  const questions = loadData('questions.json', [])
  const idx = questions.findIndex(q => q.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: '题目不存在' })
  
  questions[idx] = { ...questions[idx], ...req.body, id: req.params.id }
  saveData('questions.json', questions)
  res.json({ success: true, question: questions[idx] })
})

/**
 * DELETE /api/questions/:id
 * 删除题目
 */
router.delete('/:id', (req, res) => {
  let questions = loadData('questions.json', [])
  const len = questions.length
  questions = questions.filter(q => q.id !== req.params.id)
  saveData('questions.json', questions)
  res.json({ success: true, deleted: len - questions.length })
})

/**
 * DELETE /api/questions
 * 批量删除题目
 */
router.delete('/', (req, res) => {
  const { ids } = req.body
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: '请提供要删除的题目ID列表' })
  
  let questions = loadData('questions.json', [])
  const idSet = new Set(ids)
  questions = questions.filter(q => !idSet.has(q.id))
  saveData('questions.json', questions)
  res.json({ success: true, deleted: ids.length })
})

/**
 * POST /api/questions/record
 * 记录做题结果
 */
router.post('/record', (req, res) => {
  const { questionId, isCorrect, userAnswer, mode } = req.body
  const progress = loadData('progress.json', { records: [], stats: { total: 0, correct: 0 } })

  progress.records.push({
    questionId,
    isCorrect,
    userAnswer,
    mode,
    timestamp: new Date().toISOString()
  })

  progress.stats.total++
  if (isCorrect) progress.stats.correct++

  saveData('progress.json', progress)
  res.json({ success: true, stats: progress.stats })
})

/**
 * GET /api/questions/progress
 * 获取做题进度
 */
router.get('/progress/detail', (req, res) => {
  const progress = loadData('progress.json', { records: [], stats: { total: 0, correct: 0 } })
  const questions = loadData('questions.json', [])
  
  // 计算每道题的掌握情况
  const questionStats = {}
  progress.records.forEach(r => {
    if (!questionStats[r.questionId]) {
      questionStats[r.questionId] = { attempts: 0, correct: 0, lastMode: null }
    }
    questionStats[r.questionId].attempts++
    if (r.isCorrect) questionStats[r.questionId].correct++
    questionStats[r.questionId].lastMode = r.mode
  })

  // 找出错题
  const wrongQuestions = Object.entries(questionStats)
    .filter(([_, s]) => s.attempts > 0 && s.correct < s.attempts)
    .map(([id, s]) => ({ ...s, questionId: id }))

  res.json({
    totalQuestions: questions.length,
    practicedQuestions: Object.keys(questionStats).length,
    wrongCount: wrongQuestions.length,
    stats: progress.stats,
    wrongQuestions
  })
})

/**
 * POST /api/questions/generate-direct
 * 直接从文本内容生成题目（不需要先上传文档）
 */
router.post('/generate-direct', async (req, res) => {
  try {
    const { content, docName = '手动输入', questionCount, difficulty } = req.body
    
    if (!content || content.trim().length < 50) {
      return res.status(400).json({ error: '内容太少，至少需要50个字符' })
    }

    const questions = await generateQuestions(content, docName, {
      questionCount: questionCount || 5,
      difficulty: difficulty || 'mixed'
    })

    const existingQuestions = loadData('questions.json', [])
    existingQuestions.push(...questions)
    saveData('questions.json', existingQuestions)

    res.json({ success: true, count: questions.length, questions })
  } catch (error) {
    console.error('[Generate Direct Error]', error)
    res.status(500).json({ error: error.message || '题目生成失败' })
  }
})

/**
 * DELETE /api/questions/clear-progress
 * 清除做题记录
 */
router.delete('/clear-progress', (req, res) => {
  saveData('progress.json', { records: [], stats: { total: 0, correct: 0 } })
  res.json({ success: true })
})

export default router
