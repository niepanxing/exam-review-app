/**
 * 定向批量生成：200研发云 + 100项目管理 + 50毛剑AI Coding = 350题
 * 用法: node batch-generate-3.js
 */
import { loadData, saveData } from './server/services/storage.js'
import fs from 'fs'

const BATCH_SIZE = 10
const CONCURRENCY = 4
const settings = loadData('settings.json')

if (!settings.aiApiKey) {
  console.error('错误：未配置 API Key，请先在应用设置中配置')
  process.exit(1)
}

// 加载已有文档
const docs = loadData('documents.json', [])

// 按主题筛选文档
const yanfayunDocs = []
const xiangmuDocs = []
const aicodingContent = `AI Coding 工程化实践 - 毛剑
1. AI Coding 核心理念：AI不是替代程序员，而是增强程序员能力，人机协作提升开发效率
2. AI Coding 三阶段：辅助编码(Copilot) → 自动生成(Coder) → 自主开发(Agent)
3. Prompt Engineering 最佳实践：清晰的上下文、明确的指令、分步骤引导、示例驱动
4. 代码生成质量保障：人工Review不可省略、单元测试必须编写、安全扫描必须执行
5. AI Coding 在企业落地的挑战：代码安全与隐私、知识产权归属、质量管控体系
6. 上下文管理策略：合理组织项目结构、使用 .cursorrules / .claude 配置文件、分模块提供上下文
7. AI 辅助调试：利用AI快速定位Bug、生成测试用例、分析堆栈信息
8. 面向AI Coding的开发流程变革：需求→设计→AI生成→人工审核→测试→部署
9. 毛剑提出的"三明治工作法"：上层面包=人类定义目标和约束，中间馅料=AI生成实现，下层面包=人类审核验证
10. AI Coding 效率度量：代码采纳率、首次通过率、迭代次数、开发周期缩短比
11. 团队AI Coding最佳实践：统一Prompt模板、代码Review流程增加AI审查环节、知识库共享
12. AI Coding安全红线：禁止上传敏感数据到云端API、生成代码必须通过安全扫描、关键系统需人工验证
13. AI辅助代码审查：代码风格一致性检查、潜在Bug模式识别、性能优化建议、安全漏洞检测
14. AI Coding与DevOps集成：CI/CD流水线中嵌入AI检查、自动化测试生成、发布风险评估
15. 大模型选型策略：通用编码用大参数模型、特定领域用微调模型、推理加速用蒸馏模型
16. AI Coding的知识产权问题：生成代码的归属权、开源协议兼容性、训练数据合规性
17. 渐进式AI Coding落地路径：先辅助后自动、先非核心后核心、先个人后团队
18. AI Coding的伦理考量：代码歧视、偏见放大、透明度不足、问责机制缺失
19. AI Coding工具链生态：Cursor、GitHub Copilot、Codeium、Tabnine、通义灵码等
20. 未来趋势：从代码生成到软件工程自动化、从单文件到全项目理解、从被动响应到主动建议`

for (const doc of docs) {
  if (!doc.pages?.length) continue
  const content = doc.pages.map(p => `【第${p.page}页】\n${p.content}`).join('\n\n')
  const name = doc.name.toLowerCase()
  if (name.includes('codefree') || name.includes('研发云')) {
    yanfayunDocs.push({ name: doc.name, content })
  }
  if (name.includes('ipd') || name.includes('项目管理')) {
    xiangmuDocs.push({ name: doc.name, content })
  }
}

console.log(`研发云文档: ${yanfayunDocs.length} 个, 内容 ${yanfayunDocs.reduce((s,d)=>s+d.content.length,0)} 字符`)
console.log(`项目管理文档: ${xiangmuDocs.length} 个, 内容 ${xiangmuDocs.reduce((s,d)=>s+d.content.length,0)} 字符`)

// 生成配置
const tasks = []

// 200道研发云题
let remaining = 200
const types = ['single', 'multiple', 'judge']
while (remaining > 0) {
  const count = Math.min(BATCH_SIZE, remaining)
  const typeIdx = tasks.filter(t => t.category === 'yanfayun').length % 10
  const type = typeIdx < 5 ? 'single' : typeIdx < 8 ? 'multiple' : 'judge'
  const docIdx = tasks.filter(t => t.category === 'yanfayun').length % yanfayunDocs.length
  tasks.push({ count, type, category: 'yanfayun', doc: yanfayunDocs[docIdx] })
  remaining -= count
}

// 100道项目管理题
remaining = 100
while (remaining > 0) {
  const count = Math.min(BATCH_SIZE, remaining)
  const typeIdx = tasks.filter(t => t.category === 'xiangmu').length % 10
  const type = typeIdx < 5 ? 'single' : typeIdx < 8 ? 'multiple' : 'judge'
  const docIdx = tasks.filter(t => t.category === 'xiangmu').length % xiangmuDocs.length
  tasks.push({ count, type, category: 'xiangmu', doc: xiangmuDocs[docIdx] })
  remaining -= count
}

// 50道毛剑AI Coding题
remaining = 50
while (remaining > 0) {
  const count = Math.min(BATCH_SIZE, remaining)
  const typeIdx = tasks.filter(t => t.category === 'aicoding').length % 10
  const type = typeIdx < 5 ? 'single' : typeIdx < 8 ? 'multiple' : 'judge'
  tasks.push({ count, type, category: 'aicoding', doc: { name: '毛剑 - AI Coding.pdf', content: aicodingContent } })
  remaining -= count
}

console.log(`\n总任务: ${tasks.length} 批, 目标 350 题`)
console.log(`研发云: ${tasks.filter(t=>t.category==='yanfayun').length} 批`)
console.log(`项目管理: ${tasks.filter(t=>t.category==='xiangmu').length} 批`)
console.log(`AI Coding: ${tasks.filter(t=>t.category==='aicoding').length} 批\n`)

// 生成函数
async function generateBatch(content, docName, count, questionType) {
  let typeInstruction = '三种题型比例约为 5:3:2'
  if (questionType === 'single') typeInstruction = '全部为单选题'
  else if (questionType === 'multiple') typeInstruction = '全部为多选题'
  else if (questionType === 'judge') typeInstruction = '全部为判断题'

  const systemPrompt = `你是一位专业的IT考试出题专家。出题要求：
1. **题型**：${typeInstruction}
2. **难度**：混合（简单、中等、困难各占约1/3）
3. 每道题包含：题目、选项（单选4个，多选4-5个）、答案、页码
4. 解析：mainExp(大白话详解) + terms(术语解释) + relatedPoints(关联知识) + funTip(记忆技巧)
5. 严格返回JSON数组，不要markdown代码块`

  const userPrompt = `根据文档内容生成 ${count} 道考试题。题目要多样化，避免重复。
文档：${docName}
---文档内容---
${content.slice(0, 8000)}
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
      temperature: 0.85,
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

// 执行
let completed = 0
let failed = 0
let allQuestions = []
const byCategory = { yanfayun: 0, xiangmu: 0, aicoding: 0 }

async function runTask(task, idx) {
  try {
    const qs = await generateBatch(task.doc.content, task.doc.name, task.count, task.type)
    allQuestions.push(...qs)
    byCategory[task.category] += qs.length
    completed++
    const pct = Math.round((completed / tasks.length) * 100)
    const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2))
    process.stdout.write(`\r[${bar}] ${pct}% (${completed}/${tasks.length}) 已生成${allQuestions.length}题 研发云${byCategory.yanfayun} 项目${byCategory.xiangmu} AICoding${byCategory.aicoding} 失败${failed}`)
    return true
  } catch (e) {
    failed++
    completed++
    process.stdout.write(`\n  批次${idx+1}失败: ${e.message}\n`)
    return false
  }
}

for (let i = 0; i < tasks.length; i += CONCURRENCY) {
  const batch = tasks.slice(i, i + CONCURRENCY)
  await Promise.all(batch.map((t, j) => runTask(t, i + j)))
}

console.log('\n\n[批量生成] 全部完成！')
console.log(`[批量生成] 成功: ${allQuestions.length} 题, 失败: ${failed} 批`)
console.log(`[批量生成] 分类: 研发云${byCategory.yanfayun}题, 项目管理${byCategory.xiangmu}题, AI Coding${byCategory.aicoding}题`)

if (allQuestions.length > 0) {
  const existing = loadData('questions.json', [])
  const existSet = new Set(existing.map(q => `${q.question}|${q.sourceDoc}`))
  const newQs = allQuestions.filter(q => !existSet.has(`${q.question}|${q.sourceDoc}`))
  existing.push(...newQs)
  saveData('questions.json', existing)
  console.log(`[批量生成] 新增 ${newQs.length} 题（去重后）`)
  console.log(`[批量生成] 题库总计 ${existing.length} 题`)
}

process.exit(0)
