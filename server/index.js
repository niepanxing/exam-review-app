import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import path from 'path'
import uploadRoutes from './routes/upload.js'
import questionRoutes from './routes/questions.js'
import settingsRoutes from './routes/settings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = 3200

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true }))

// 静态文件服务 - 上传的文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 路由
app.use('/api/upload', uploadRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/settings', settingsRoutes)

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message || err)
  res.status(500).json({ error: err.message || '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`[Exam Review Server] 运行在 http://localhost:${PORT}`)
  console.log(`[Exam Review Server] API 地址: http://localhost:${PORT}/api`)
})
