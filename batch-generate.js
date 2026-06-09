/**
 * 批量生成500道题 - 4路并发
 * 用法: node batch-generate.js
 */
import { loadData, saveData } from './server/services/storage.js'

const TOTAL = 500
const BATCH_SIZE = 10      // 每批10道
const CONCURRENCY = 4       // 4路并发
const settings = loadData('settings.json')

if (!settings.aiApiKey) {
  console.error('错误：未配置 API Key，请先在应用设置中配置')
  process.exit(1)
}

// 加载所有文档
const docs = loadData('documents.json', [])
if (docs.length === 0) {
  console.error('错误：没有已上传的文档')
  process.exit(1)
}

// 合并所有文档内容，按文档分段
const docContents = []
for (const doc of docs) {
  if (doc.pages?.length > 0) {
    const content = doc.pages.map(p => `【第${p.page}页】\n${p.content}`).join('\n\n')
    docContents.push({ name: doc.name, content })
  }
}

console.log(`[批量生成] ${docs.length} 个文档, 内容总长 ${docContents.reduce((s, d) => s + d.content.length, 0)} 字符`)
console.log(`[批量生成] 目标: ${TOTAL}题, 每批${BATCH_SIZE}题, ${CONCURRENCY}路并发`)

// 生成一批题目
async function generateBatch(content, docName, count, questionType) {
  const difficultyDesc = {
    easy: '简单（基础概念和定义）',
    medium: '中等（理解和应用）',
    hard: '困难（综合分析）',
    mixed: '混合'
  }

  let typeInstruction = '三种题型比例约为 5:3:2'
  if (questionType === 'single') typeInstruction = '全部为单选题'
  else if (questionType === 'multiple') typeInstruction = '全部为多选题'
  else if (questionType === 'judge') typeInstruction = '全部为判断题'

  const systemPrompt = `你是一位专业的IT考试出题专家。出题要求：
1. **题型**：${typeInstruction}
2. **难度**：${difficultyDesc[difficultyDesc.mixed]}
3. 每道题包含：题目、选项（单选4个，多选4-5个）、答案、页码
4. 解析：mainExp(大白话详解) + terms(术语解释) + relatedPoints(关联知识) + funTip(记忆技巧)
5. 严格返回JSON数组，不要markdown代码块`

  const userPrompt = `根据文档内容生成 ${count} 道考试题。
文档：${docName}
---文档内容---
${content}
---结束---
返回JSON数组：
[{"type":"single|multiple|judge","question":"题目","options":["A. ..."],"answer":"A"|["A","C"]|true|false,"sourcePage":1,"explanation":{"mainExp":"...","terms":[{"term":"...","definition":"..."}],"relatedPoints":["..."],"funTip":"..."},"difficulty":1,"tags":["..."]}]`

  const resp = await fetch(settings.aiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.aiApiKey}` },
    body: JSON.stringify({
      model: settings.aiModel || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 16000
    }),
    signal: AbortSignal.timeout(300000)
  })

  if (!resp.ok) throw new Error(`API ${resp.status}: ${await resp.text().then(t => t.slice(0, 100))}`)

  const result = await resp.json()
  let text = (result.choices?.[0]?.message?.content || '').trim()
    .replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()

  let questions
  try { questions = JSON.parse(text) }
  catch {
    const m = text.match(/\[[\s\S]*\]/)
    if (m) questions = JSON.parse(m[0])
    else throw new Error('JSON解析失败')
  }
  if (!Array.isArray(questions)) throw new Error('不是数组')

  return questions.map(q => ({
    ...q,
    sourceDoc: docName,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString()
  }))
}

// 构建批次任务
const types = ['single', 'multiple', 'judge']
const tasks = []
let remaining = TOTAL

for (const type of types) {
  const typeCount = type === 'single' ? Math.round(TOTAL * 0.5)
    : type === 'multiple' ? Math.round(TOTAL * 0.3)
    : TOTAL - Math.round(TOTAL * 0.5) - Math.round(TOTAL * 0.3)

  let typeRemaining = typeCount
  while (typeRemaining > 0) {
    const count = Math.min(BATCH_SIZE, typeRemaining)
    // 轮流使用不同文档的内容
    const docIdx = tasks.length % docContents.length
    tasks.push({ count, type, doc: docContents[docIdx] })
    typeRemaining -= count
  }
}

console.log(`[批量生成] 共 ${tasks.length} 个批次任务`)
console.log(`[批量生成] 开始执行...\n`)

// 并发执行
let completed = 0
let failed = 0
let allQuestions = []

async function runTask(task, idx) {
  try {
    const qs = await generateBatch(task.doc.content, task.doc.name, task.count, task.type)
    allQuestions.push(...qs)
    completed++
    const pct = Math.round((completed / tasks.length) * 100)
    const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2))
    process.stdout.write(`\r[${bar}] ${pct}% (${completed}/${tasks.length}) 已生成${allQuestions.length}题 失败${failed}批`)
    return true
  } catch (e) {
    failed++
    completed++
    const pct = Math.round((completed / tasks.length) * 100)
    const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2))
    process.stdout.write(`\r[${bar}] ${pct}% (${completed}/${tasks.length}) 已生成${allQuestions.length}题 失败${failed}批`)
    console.error(`\n  批次${idx + 1}失败: ${e.message}`)
    return false
  }
}

// 执行所有任务（并发）
for (let i = 0; i < tasks.length; i += CONCURRENCY) {
  const batch = tasks.slice(i, i + CONCURRENCY)
  await Promise.all(batch.map((t, j) => runTask(t, i + j)))
}

console.log('\n\n[批量生成] 全部完成！')
console.log(`[批量生成] 成功: ${allQuestions.length} 题, 失败: ${failed} 批`)

// 写入题库
if (allQuestions.length > 0) {
  const existing = loadData('questions.json', [])
  // 去重：相同sourceDoc + question文本的不重复添加
  const existSet = new Set(existing.map(q => `${q.question}|${q.sourceDoc}`))
  const newQs = allQuestions.filter(q => !existSet.has(`${q.question}|${q.sourceDoc}`))
  
  existing.push(...newQs)
  saveData('questions.json', existing)
  
  console.log(`[批量生成] 新增 ${newQs.length} 题（去重后）`)
  console.log(`[批量生成] 题库总计 ${existing.length} 题`)
} else {
  console.log('[批量生成] 未生成任何题目')
}

process.exit(0)
