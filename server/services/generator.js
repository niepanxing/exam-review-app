import { loadData } from './storage.js'

/**
 * 调用AI生成考试题目（单次调用）
 */
async function generateBatch(docContent, docName, options = {}) {
  const settings = loadData('settings.json')

  if (!settings.aiApiKey) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  const { questionCount, difficulty = settings.difficulty || 'mixed', questionType } = options

  const difficultyDesc = {
    easy: '简单（基础概念和定义）',
    medium: '中等（理解和应用）',
    hard: '困难（综合分析）',
    mixed: '混合（简单、中等、困难各占约1/3）'
  }

  let typeInstruction = '三种题型比例约为 5:3:2'
  if (questionType === 'single') typeInstruction = '全部为单选题'
  else if (questionType === 'multiple') typeInstruction = '全部为多选题'
  else if (questionType === 'judge') typeInstruction = '全部为判断题'

  const systemPrompt = `你是一位专业的IT考试出题专家。出题要求：

1. **题型**：${typeInstruction}
2. **难度**：${difficultyDesc[difficulty] || difficultyDesc.mixed}
3. **每道题必须包含**：
   - 题目、选项（单选4个，多选4-5个）、正确答案、出处页码
4. **解析要求**：
   - mainExp：大白话详解，用生活类比
   - terms：专业术语通俗解释
   - relatedPoints：关联知识点
   - funTip：记忆技巧或趣味类比
5. **输出**：严格JSON数组，不要markdown代码块`

  const userPrompt = `根据文档内容生成 ${questionCount} 道考试题。

文档：${docName}

---文档内容---
${docContent}
---结束---

返回JSON数组：
[{"type":"single|multiple|judge","question":"题目","options":["A. ..."],"answer":"A"|["A","C"]|true|false,"sourcePage":1,"explanation":{"mainExp":"...","terms":[{"term":"...","definition":"..."}],"relatedPoints":["..."],"funTip":"..."},"difficulty":1,"tags":["..."]}]`

  const response = await fetch(settings.aiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      model: settings.aiModel || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 8000
    }),
    signal: AbortSignal.timeout(180000)
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI API 失败 (${response.status}): ${errText.slice(0, 200)}`)
  }

  const result = await response.json()
  let content = (result.choices?.[0]?.message?.content || '').trim()
  content = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()

  let questions
  try {
    questions = JSON.parse(content)
  } catch {
    const match = content.match(/\[[\s\S]*\]/)
    if (match) questions = JSON.parse(match[0])
    else throw new Error('AI返回内容无法解析为题目JSON')
  }

  if (!Array.isArray(questions)) throw new Error('AI返回的不是数组')

  questions.forEach(q => {
    q.sourceDoc = docName
    if (!q.id) q.id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    if (!q.createdAt) q.createdAt = new Date().toISOString()
  })

  return questions
}

/**
 * 分批生成题目（大批量不卡死）
 * @param {Function} onProgress - 进度回调 (已完成数, 总批数)
 */
export async function generateQuestions(docContent, docName, options = {}, onProgress) {
  const totalCount = options.questionCount || 5

  // 每批最多5道，避免AI返回超长JSON导致解析失败
  const batchSize = 5
  const batches = []

  if (totalCount <= batchSize) {
    // 小批量，直接一次生成
    const questions = await generateBatch(docContent, docName, { ...options, questionCount: totalCount })
    return questions
  }

  // 按题型分配
  const { questionType } = options
  let batchesConfig = []

  if (questionType) {
    // 指定题型
    const numBatches = Math.ceil(totalCount / batchSize)
    for (let i = 0; i < numBatches; i++) {
      const remaining = totalCount - i * batchSize
      const count = Math.min(batchSize, remaining)
      batchesConfig.push({ count, type: questionType })
    }
  } else {
    // 混合题型，按比例分配
    const singleCount = Math.round(totalCount * 0.5)
    const multipleCount = Math.round(totalCount * 0.3)
    const judgeCount = totalCount - singleCount - multipleCount

    const addBatches = (count, type) => {
      let remaining = count
      while (remaining > 0) {
        const c = Math.min(batchSize, remaining)
        batchesConfig.push({ count: c, type })
        remaining -= c
      }
    }
    addBatches(singleCount, 'single')
    addBatches(multipleCount, 'multiple')
    addBatches(judgeCount, 'judge')
  }

  // 按内容分段，避免每次都发全文
  const contentChunks = splitContent(docContent, batchesConfig.length)

  // 逐批生成
  let allQuestions = []
  for (let i = 0; i < batchesConfig.length; i++) {
    const batch = batchesConfig[i]
    console.log(`[Generate] 批次 ${i + 1}/${batchesConfig.length}: ${batch.type} x${batch.count}`)

    if (onProgress) onProgress(i, batchesConfig.length)

    try {
      const questions = await generateBatch(
        contentChunks[i] || docContent,
        docName,
        { questionCount: batch.count, difficulty: options.difficulty, questionType: batch.type }
      )
      allQuestions.push(...questions)
    } catch (error) {
      console.error(`[Generate] 批次 ${i + 1} 失败: ${error.message}`)
      // 某批失败不影响其他批次
    }
  }

  if (onProgress) onProgress(batchesConfig.length, batchesConfig.length)

  return allQuestions
}

/**
 * 将长文档内容均匀分割成 n 段
 */
function splitContent(content, n) {
  const chunks = []
  const chunkSize = Math.ceil(content.length / n)
  for (let i = 0; i < n; i++) {
    chunks.push(content.slice(i * chunkSize, (i + 1) * chunkSize))
  }
  return chunks
}
