const https = require('https');
const fs = require('fs');

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const API_KEY = 'sk-3168b812f4c8455aa9b9048b54b0de66';
const MODEL = 'deepseek-v4-flash';

const sourceFile = 'D:\\电信\\培训文件\\燎原计划\\第二次考试材料\\燎原计划第二周复习资料汇总.md';
const sourceContent = fs.readFileSync(sourceFile, 'utf-8');

function extractChapter(content, startMarker, endMarker) {
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) return '';
  let endIdx = content.length;
  if (endMarker) {
    const idx = content.indexOf(endMarker, startIdx);
    if (idx !== -1) endIdx = idx;
  }
  return content.substring(startIdx, endIdx).trim();
}

function callAPI(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
    });

    const req = https.request(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      timeout: 180000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error('API error: ' + data.substring(0, 200)));
          }
        } catch (e) {
          reject(new Error('Parse: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

const EXAMPLE = `[
  {"type":"single","question":"题干","options":["A. 选项","B. 选项","C. 选项","D. 选项"],"answer":"B","explanation":"解析内容，通俗易懂，标明出处","tags":["标签"]},
  {"type":"multiple","question":"题干","options":["A. 选项","B. 选项","C. 选项","D. 选项"],"answer":["A","C"],"explanation":"解析","tags":["标签"]},
  {"type":"judge","question":"题干","options":["A. 正确","B. 错误"],"answer":false,"explanation":"解析","tags":["标签"]}
]`;

function buildPrompt(content, name, singles, multiples, judges) {
  return `根据以下"${name}"学习资料，出${singles}道单选+${multiples}道多选+${judges}道判断题。

严格要求：
1. 题目严格基于资料，不编造
2. 解析通俗易懂适合小白，标明出处章节
3. 单选4选项1正确答案，多选4-5选项2-4正确答案
4. 判断题options固定["A. 正确","B. 错误"]，answer用true/false
5. 多选answer是数组如["A","C"]
6. 覆盖★高频考点和▲难点

只输出JSON数组，不要有任何其他文字：
${EXAMPLE}

资料：
${content}`;
}

function parseQuestions(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); }
  catch (e) {
    console.error('JSON parse error');
    return [];
  }
}

function normalizeQ(q, idCounter) {
  const n = {
    id: `ly2_${idCounter}`,
    type: q.type === 'judge' ? 'judge' : (q.type === 'multiple' ? 'multiple' : 'single'),
    question: String(q.question || '').trim(),
    options: Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [],
    answer: q.answer,
    explanation: { mainExp: String(q.explanation || '').trim() },
    difficulty: 1,
    tags: Array.isArray(q.tags) ? q.tags : [],
    sourceDoc: '燎原计划第二周复习资料汇总',
    sourcePage: null,
    createdAt: new Date().toISOString(),
    documentId: 'bank-liaoyuan2',
    bank: '燎原第二周'
  };
  if (n.type === 'judge') {
    if (typeof n.answer === 'string') n.answer = !['false','B','错','错误','0'].includes(n.answer);
    n.options = ['A. 正确', 'B. 错误'];
  }
  if (n.type === 'multiple' && !Array.isArray(n.answer)) {
    n.answer = typeof n.answer === 'string' && n.answer.length > 1 ? n.answer.split('') : [String(n.answer)];
  }
  if (n.type === 'single' && typeof n.answer !== 'string') n.answer = String(n.answer);
  return n;
}

async function main() {
  // 需要补充的章节
  const batches = [
    { name: 'TOGAF企业架构设计与实践', start: '# 第六章 TOGAF', end: '# 第七章 TTT', singles: 25, multiples: 13, judges: 12 },
    { name: 'CV二次开发补充', start: '# 第一章 CV 二次开发', end: '# 第二章 数字生活二开', singles: 10, multiples: 5, judges: 5 },
    { name: '速查补充', start: '# 第九章 重点难点速查手册', end: null, singles: 10, multiples: 5, judges: 6 },
  ];

  let idCounter = Date.now();
  const newQuestions = [];

  for (const batch of batches) {
    const content = extractChapter(sourceContent, batch.start, batch.end);
    if (!content) { console.log(`[跳过] ${batch.name}`); continue; }
    console.log(`[开始] ${batch.name} (${content.length}字)`);

    for (let retry = 0; retry < 3; retry++) {
      try {
        const prompt = buildPrompt(content, batch.name, batch.singles, batch.multiples, batch.judges);
        const response = await callAPI(prompt);
        const questions = parseQuestions(response);
        if (questions.length > 0) {
          for (const q of questions) {
            idCounter++;
            const nq = normalizeQ(q, idCounter);
            if (nq.question && nq.options.length >= 2) newQuestions.push(nq);
          }
          console.log(`[完成] ${batch.name} - ${questions.length}题`);
          break;
        }
      } catch (e) {
        console.log(`[重试${retry+1}] ${batch.name} - ${e.message}`);
      }
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n补充生成: ${newQuestions.length} 题`);

  // 读取已有题库
  const banksDir = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\banks';
  const existing = JSON.parse(fs.readFileSync(`${banksDir}\\燎原第二周.json`, 'utf-8'));
  const combined = [...existing, ...newQuestions];

  // 去重（按题干去重）
  const seen = new Set();
  const deduped = combined.filter(q => {
    const key = q.question.substring(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const singles = deduped.filter(q => q.type === 'single').length;
  const multiples = deduped.filter(q => q.type === 'multiple').length;
  const judges = deduped.filter(q => q.type === 'judge').length;

  // 写入
  fs.writeFileSync(`${banksDir}\\燎原第二周.json`, JSON.stringify(deduped, null, 0), 'utf-8');

  // 更新index.json
  const indexPath = `${banksDir}\\index.json`;
  const bankList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  const filtered = bankList.filter(b => b.name !== '燎原第二周');
  filtered.push({ name: '燎原第二周', file: '燎原第二周.json', total: deduped.length, single: singles, multiple: multiples, judge: judges });
  fs.writeFileSync(indexPath, JSON.stringify(filtered, null, 2), 'utf-8');

  // 合并questions.json
  const questionsPath = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\questions.json';
  const allQ = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
  const allFiltered = allQ.filter(q => q.bank !== '燎原第二周');
  const merged = [...allFiltered, ...deduped];
  fs.writeFileSync(questionsPath, JSON.stringify(merged, null, 0), 'utf-8');

  console.log(`\n=== 最终 ===`);
  console.log(`燎原第二周: ${deduped.length}题 (单选${singles}/多选${multiples}/判断${judges})`);
  console.log(`总题库: ${merged.length}题`);
}

main().catch(console.error);
