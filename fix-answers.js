/**
 * AI答案校验脚本 - 对照解析修正错误答案
 * 用法: node fix-answers.js
 */
import { loadData, saveData } from './server/services/storage.js'

const BATCH_SIZE = 10
const CONCURRENCY = 4
const settings = loadData('settings.json')

if (!settings.aiApiKey) {
  console.error('错误：未配置 API Key')
  process.exit(1)
}

const allQuestions = loadData('questions.json', [])
console.log(`[答案校验] 共 ${allQuestions.length} 道题需要校验`)

// 构建校验任务
const tasks = []
for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
  const batch = allQuestions.slice(i, i + BATCH_SIZE)
  tasks.push(batch)
}

console.log(`[答案校验] 分 ${tasks.length} 批, ${CONCURRENCY} 路并发\n`)

async function verifyBatch(questions) {
  const items = questions.map((q, i) => ({
    index: i,
    id: q.id,
    type: q.type,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation
  }))

  const userPrompt = `请逐题校验答案是否正确。如果答案与解析矛盾，请给出正确答案。
严格返回JSON数组，每项包含 id 和 corrected（如果答案正确则为null，如果答案错误则为正确答案）。

题目列表：
${JSON.stringify(items, null, 0)}

返回格式：
[{"id":"q_xxx","corrected":null}]  // 答案正确
[{"id":"q_xxx","corrected":"B"}]    // 单选题答案应为B
[{"id":"q_xxx","corrected":["A","C"]}] // 多选题答案应为A和C
[{"id":"q_xxx","corrected":false}]  // 判断题答案应为false

只返回需要修正的题目和确认正确的题目，不要遗漏。`

  const resp = await fetch(settings.aiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.aiApiKey}` },
    body: JSON.stringify({
      model: settings.aiModel || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: '你是一位严谨的考试答案校验专家。仔细对照题目、选项和解析，判断答案是否正确。特别注意多选题是否遗漏选项、判断题的true/false是否正确。返回JSON数组。' },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 8000
    }),
    signal: AbortSignal.timeout(300000)
  })

  if (!resp.ok) throw new Error(`API ${resp.status}`)

  const result = await resp.json()
  let text = (result.choices?.[0]?.message?.content || '').trim()
    .replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()

  let corrections
  try { corrections = JSON.parse(text) }
  catch {
    const m = text.match(/\[[\s\S]*\]/)
    if (m) corrections = JSON.parse(m[0])
    else throw new Error('JSON解析失败')
  }

  return corrections
}

// 执行校验
let completed = 0
let totalFixed = 0
const fixes = []

async function runTask(batch, idx) {
  try {
    const corrections = await verifyBatch(batch)
    const fixMap = new Map()
    for (const c of corrections) {
      if (c.corrected !== null && c.corrected !== undefined) {
        fixMap.set(c.id, c.corrected)
      }
    }

    for (const q of batch) {
      if (fixMap.has(q.id)) {
        const oldAns = JSON.stringify(q.answer)
        q.answer = fixMap.get(q.id)
        totalFixed++
        fixes.push({ id: q.id, type: q.type, question: q.question.substring(0, 40), old: oldAns, new: JSON.stringify(q.answer) })
      }
    }

    completed++
    const pct = Math.round((completed / tasks.length) * 100)
    const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2))
    process.stdout.write(`\r[${bar}] ${pct}% (${completed}/${tasks.length}) 已修正${totalFixed}题答案`)
  } catch (e) {
    completed++
    process.stdout.write(`\n  批次${idx + 1}失败: ${e.message}\n`)
  }
}

for (let i = 0; i < tasks.length; i += CONCURRENCY) {
  const batch = tasks.slice(i, i + CONCURRENCY)
  await Promise.all(batch.map((t, j) => runTask(t, i + j)))
}

console.log('\n\n[答案校验] 全部完成！')
console.log(`[答案校验] 共修正 ${totalFixed} 道题的答案`)

if (totalFixed > 0) {
  // 输出修正明细
  console.log('\n修正明细:')
  fixes.forEach((f, i) => {
    console.log(`  ${i + 1}. [${f.type}] ${f.question}... → ${f.old} → ${f.new}`)
  })

  // 保存
  saveData('questions.json', allQuestions)
  console.log(`\n[答案校验] 题库已保存，共 ${allQuestions.length} 题`)
} else {
  console.log('[答案校验] 所有答案均正确，无需修正')
}

process.exit(0)
