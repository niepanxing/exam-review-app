import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { parseDocument } from '../services/parser.js'
import { generateQuestions } from '../services/generator.js'
import { loadData, saveData } from '../services/storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = express.Router()

// 上传目录
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
import fs from 'fs'
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.md', '.markdown']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error(`不支持的文件格式: ${ext}`))
  },
  limits: { fileSize: 50 * 1024 * 1024 }
})

/**
 * POST /api/upload/document
 */
router.post('/document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请选择文件' })
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8')
    const filePath = req.file.path
    const pages = await parseDocument(filePath)
    if (!pages || pages.length === 0) return res.status(400).json({ error: '文档内容为空' })

    const documents = loadData('documents.json', [])
    const docRecord = {
      id: uuidv4(), name: originalName, filePath, pageCount: pages.length,
      pages, uploadedAt: new Date().toISOString()
    }
    documents.push(docRecord)
    saveData('documents.json', documents)
    res.json({ success: true, document: { id: docRecord.id, name: originalName, pageCount: pages.length } })
  } catch (error) {
    console.error('[Upload Error]', error)
    res.status(500).json({ error: error.message || '文件上传解析失败' })
  }
})

/**
 * POST /api/upload/generate-stream
 * 分批生成题目，SSE 推送进度
 */
router.post('/generate-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    const { documentId, questionCount, difficulty, selectedPages, questionType } = req.body
    const documents = loadData('documents.json', [])
    const doc = documents.find(d => d.id === documentId)
    if (!doc) return sendEvent({ error: '文档不存在' })

    let pagesToUse = doc.pages
    if (selectedPages?.length) pagesToUse = doc.pages.filter(p => selectedPages.includes(p.page))
    const content = pagesToUse.map(p => `【第${p.page}页】\n${p.content}`).join('\n\n')

    sendEvent({ status: 'generating', message: `开始生成 ${questionCount || 5} 道题...` })

    const questions = await generateQuestions(content, doc.name, {
      questionCount: questionCount || 5,
      difficulty: difficulty || 'mixed',
      questionType
    }, (current, total) => {
      sendEvent({ status: 'progress', current, total, message: `批次 ${current}/${total}` })
    })

    // 保存
    const existingQuestions = loadData('questions.json', [])
    questions.forEach(q => {
      q.sourceDoc = doc.name
      q.documentId = documentId
    })
    existingQuestions.push(...questions)
    saveData('questions.json', existingQuestions)

    sendEvent({ status: 'done', count: questions.length, questions })
  } catch (error) {
    console.error('[Generate Error]', error)
    sendEvent({ status: 'error', error: error.message || '题目生成失败' })
  }

  res.end()
})

/**
 * POST /api/upload/generate（保留兼容）
 */
router.post('/generate', async (req, res) => {
  try {
    const { documentId, questionCount, difficulty, selectedPages } = req.body
    const documents = loadData('documents.json', [])
    const doc = documents.find(d => d.id === documentId)
    if (!doc) return res.status(404).json({ error: '文档不存在' })

    let pagesToUse = doc.pages
    if (selectedPages?.length) pagesToUse = doc.pages.filter(p => selectedPages.includes(p.page))
    const content = pagesToUse.map(p => `【第${p.page}页】\n${p.content}`).join('\n\n')

    const questions = await generateQuestions(content, doc.name, {
      questionCount: questionCount || 5, difficulty: difficulty || 'mixed'
    })

    const existingQuestions = loadData('questions.json', [])
    questions.forEach(q => { q.sourceDoc = doc.name; q.documentId = documentId })
    existingQuestions.push(...questions)
    saveData('questions.json', existingQuestions)

    res.json({ success: true, count: questions.length, questions })
  } catch (error) {
    res.status(500).json({ error: error.message || '题目生成失败' })
  }
})

/**
 * GET /api/upload/documents
 */
router.get('/documents', (req, res) => {
  const documents = loadData('documents.json', [])
  res.json(documents.map(d => ({ id: d.id, name: d.name, pageCount: d.pageCount, uploadedAt: d.uploadedAt })))
})

/**
 * DELETE /api/upload/documents/:id
 */
router.delete('/documents/:id', (req, res) => {
  let documents = loadData('documents.json', [])
  const doc = documents.find(d => d.id === req.params.id)
  if (doc?.filePath) try { fs.unlinkSync(doc.filePath) } catch {}
  documents = documents.filter(d => d.id !== req.params.id)
  saveData('documents.json', documents)
  res.json({ success: true })
})

export default router
