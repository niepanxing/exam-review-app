import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function getFilePath(filename) {
  return path.join(DATA_DIR, filename)
}

export function loadData(filename, defaultValue = null) {
  const filePath = getFilePath(filename)
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error(`[Storage] 读取 ${filename} 失败:`, e.message)
  }
  return defaultValue
}

export function saveData(filename, data) {
  const filePath = getFilePath(filename)
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error(`[Storage] 写入 ${filename} 失败:`, e.message)
    return false
  }
}

export function appendToArray(filename, items) {
  const existing = loadData(filename, [])
  existing.push(...items)
  return saveData(filename, existing)
}

// 初始化默认数据
export function initDefaultData() {
  if (!loadData('questions.json')) saveData('questions.json', [])
  if (!loadData('documents.json')) saveData('documents.json', [])
  if (!loadData('progress.json')) saveData('progress.json', { records: [], stats: { total: 0, correct: 0 } })
  if (!loadData('settings.json')) {
    saveData('settings.json', {
      aiEndpoint: 'https://api.openai.com/v1/chat/completions',
      aiApiKey: '',
      aiModel: 'gpt-4o-mini',
      questionsPerBatch: 5,
      difficulty: 'mixed'
    })
  }
}

initDefaultData()
