const https = require('https');
const fs = require('fs');

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const API_KEY = 'sk-3168b812f4c8455aa9b9048b54b0de66';
const MODEL = 'deepseek-v4-flash';

// 读取资料
const sourceFile = 'D:\\电信\\培训文件\\燎原计划\\第二次考试材料\\燎原计划第二周复习资料汇总.md';
const sourceContent = fs.readFileSync(sourceFile, 'utf-8');

// 按章节分割
const chapters = [
  { name: 'CV二次开发', start: '# 第一章 CV 二次开发', end: '# 第二章 数字生活二开', count: 55, singles: 28, multiples: 14, judges: 13 },
  { name: '数字生活二开', start: '# 第二章 数字生活二开', end: '# 第三章 物联网感知云', count: 40, singles: 20, multiples: 10, judges: 10 },
  { name: '物联网感知云与ThingsMQ', start: '# 第三章 物联网感知云', end: '# 第四章 融合应用二开', count: 35, singles: 18, multiples: 9, judges: 8 },
  { name: '融合应用二开', start: '# 第四章 融合应用二开', end: '# 第五章 量子密信', count: 20, singles: 10, multiples: 5, judges: 5 },
  { name: '量子密信SDK客户端二开', start: '# 第五章 量子密信', end: '# 第六章 TOGAF', count: 30, singles: 15, multiples: 8, judges: 7 },
  { name: 'TOGAF企业架构', start: '# 第六章 TOGAF', end: '# 第七章 TTT', count: 50, singles: 25, multiples: 13, judges: 12 },
  { name: 'TTT讲师培训', start: '# 第七章 TTT', end: '# 第八章 数字生活二开实战考核', count: 25, singles: 13, multiples: 6, judges: 6 },
  { name: '数字生活二开实战考核', start: '# 第八章 数字生活二开实战考核', end: '# 第九章 重点难点速查手册', count: 25, singles: 13, multiples: 6, judges: 6 },
  { name: '重点难点速查手册', start: '# 第九章 重点难点速查手册', end: null, count: 20, singles: 10, multiples: 5, judges: 5 },
];

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
            reject(new Error('API response error: ' + data.substring(0, 200)));
          }
        } catch (e) {
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

const EXAMPLE_OUTPUT = `[
  {
    "type": "single",
    "question": "CV二开的核心目标是什么？",
    "options": ["A. 拉流+省侧自建AI", "B. 基于标训推平台/视联网标准能力快速搭建二开应用", "C. 仅提供基础视频流", "D. 替代所有省侧系统"],
    "answer": "B",
    "explanation": "CV二开的核心是利用视联各平台底座能力，快速搭建二开应用。CV二开≠拉流+省侧自建AI，必须基于标训推平台/视联网标准能力才算。出自第一章1.1节。",
    "tags": ["CV二开", "定义"]
  },
  {
    "type": "multiple",
    "question": "以下哪些是燎原计划CV二开专项要解决的痛点？",
    "options": ["A. 不能开", "B. 不会开", "C. 不会卖", "D. 不想开"],
    "answer": ["A", "B", "C"],
    "explanation": "燎原计划CV二开专项打通"最后一公里"三个痛点：不能开（平台解耦）、不会开（实战实训）、不会卖（业务运营）。'不想开'不在三大痛点之列。出自第一章1.1节。",
    "tags": ["CV二开", "痛点"]
  },
  {
    "type": "judge",
    "question": "CV二开就是拉流加上省侧自建AI平台。",
    "options": ["A. 正确", "B. 错误"],
    "answer": false,
    "explanation": "CV二开≠拉流+省侧自建AI，必须基于标训推平台/视联网标准能力才算。这是常考易错点。出自第一章1.1节。",
    "tags": ["CV二开", "边界"]
  }
]`;

function buildPrompt(chapterContent, chapterName, singles, multiples, judges) {
  return `你是考试出题专家。请根据以下"${chapterName}"的学习资料，出${singles}道单选题、${multiples}道多选题、${judges}道判断题。

要求：
1. 题目必须严格基于资料内容，不可凭空编造
2. 每道题必须有详细解析，解析要通俗易懂适合小白，包含：
   - 正确答案的推理过程
   - 错误选项的辨析
   - 标明出处（第几章哪一节）
   - 相关知识点的延伸说明
3. 单选题4个选项(A/B/C/D)，只有一个正确答案
4. 多选题4-5个选项，2-4个正确答案
5. 判断题选项固定为"A. 正确"/"B. 错误"，answer用true/false
6. 选项格式：以"A. "开头，如"A. 选项内容"
7. 多选题answer是数组，如["A","C"]
8. tags数组标明知识模块
9. 覆盖资料中的★高频考点和▲难点

请严格按以下JSON格式输出，不要有任何其他文字：
${EXAMPLE_OUTPUT}

---

学习资料：

${chapterContent}`;
}

function parseQuestions(text) {
  // 尝试提取JSON
  let jsonStr = text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  try {
    const questions = JSON.parse(jsonStr);
    return questions;
  } catch (e) {
    // 尝试修复常见JSON问题
    try {
      const fixed = jsonStr.replace(/,\s*]/g, ']').replace(/'\s*:/g, '":').replace(/:\s*'/g, ':"');
      return JSON.parse(fixed);
    } catch (e2) {
      console.error('JSON parse failed, first 500 chars:', jsonStr.substring(0, 500));
      return [];
    }
  }
}

function normalizeQuestion(q, idPrefix, idCounter) {
  // 统一格式
  const normalized = {
    id: `${idPrefix}_${idCounter}`,
    type: q.type === 'judge' ? 'judge' : (q.type === 'multiple' ? 'multiple' : 'single'),
    question: String(q.question || '').trim(),
    options: [],
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

  // 处理选项
  if (Array.isArray(q.options)) {
    normalized.options = q.options.map(opt => {
      let o = String(opt).trim();
      // 确保选项以字母. 开头
      if (!/^[A-E][.、．\s]/.test(o)) {
        o = o; // 保持原样
      }
      return o;
    });
  }

  // 判断题answer必须是boolean
  if (normalized.type === 'judge') {
    if (typeof normalized.answer === 'string') {
      normalized.answer = !['false', 'B', '错', '错误', '0'].includes(normalized.answer);
    }
    normalized.options = ['A. 正确', 'B. 错误'];
  }

  // 多选题answer必须是数组
  if (normalized.type === 'multiple' && !Array.isArray(normalized.answer)) {
    if (typeof normalized.answer === 'string' && normalized.answer.length > 1) {
      normalized.answer = normalized.answer.split('');
    } else {
      normalized.answer = [normalized.answer];
    }
  }

  // 单选题answer必须是单字母字符串
  if (normalized.type === 'single' && typeof normalized.answer !== 'string') {
    normalized.answer = String(normalized.answer);
  }

  return normalized;
}

async function main() {
  const allQuestions = [];
  let idCounter = Date.now();

  console.log(`准备处理 ${chapters.length} 个章节...\n`);

  // 并发控制：同时处理2个章节
  for (let i = 0; i < chapters.length; i += 2) {
    const batch = chapters.slice(i, i + 2);
    const promises = batch.map(async (ch) => {
      const content = extractChapter(sourceContent, ch.start, ch.end);
      if (!content) {
        console.log(`[跳过] ${ch.name} - 未找到内容`);
        return [];
      }
      console.log(`[开始] ${ch.name} (${content.length} 字, 目标 ${ch.count} 题)`);

      const prompt = buildPrompt(content, ch.name, ch.singles, ch.multiples, ch.judges);

      let retries = 3;
      while (retries > 0) {
        try {
          const response = await callAPI(prompt);
          const questions = parseQuestions(response);
          if (questions.length > 0) {
            console.log(`[完成] ${ch.name} - 生成 ${questions.length} 题`);
            return questions;
          }
          console.log(`[重试] ${ch.name} - 解析结果为空`);
        } catch (e) {
          console.log(`[重试] ${ch.name} - ${e.message}`);
        }
        retries--;
        if (retries > 0) await new Promise(r => setTimeout(r, 3000));
      }
      console.log(`[失败] ${ch.name}`);
      return [];
    });

    const results = await Promise.all(promises);
    for (const questions of results) {
      for (const q of questions) {
        idCounter++;
        allQuestions.push(normalizeQuestion(q, 'ly2', idCounter));
      }
    }

    // 避免API限流
    if (i + 2 < chapters.length) {
      console.log('--- 等待3秒 ---\n');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // 统计
  const singles = allQuestions.filter(q => q.type === 'single').length;
  const multiples = allQuestions.filter(q => q.type === 'multiple').length;
  const judges = allQuestions.filter(q => q.type === 'judge').length;

  console.log(`\n=== 最终统计 ===`);
  console.log(`总题数: ${allQuestions.length}`);
  console.log(`单选: ${singles}, 多选: ${multiples}, 判断: ${judges}`);

  // 过滤无效题目
  const validQuestions = allQuestions.filter(q => {
    if (!q.question) return false;
    if (q.type === 'single' && (!q.options || q.options.length < 2)) return false;
    if (q.type === 'judge' && typeof q.answer !== 'boolean') return false;
    if (q.type === 'multiple' && (!Array.isArray(q.answer) || q.answer.length < 2)) return false;
    return true;
  });

  console.log(`有效题目: ${validQuestions.length}`);

  // 如果不足300题，补发
  if (validQuestions.length < 250) {
    const deficit = 300 - validQuestions.length;
    console.log(`\n题目不足，尝试补充 ${deficit} 题...`);
    // 用速查手册补充
    const speedChContent = extractChapter(sourceContent, '# 第九章 重点难点速查手册', null);
    if (speedChContent) {
      const supplementSingles = Math.ceil(deficit * 0.5);
      const supplementMultiples = Math.ceil(deficit * 0.25);
      const supplementJudges = deficit - supplementSingles - supplementMultiples;
      const prompt = buildPrompt(speedChContent, '重点难点速查手册(补充)', supplementSingles, supplementMultiples, supplementJudges);
      try {
        const response = await callAPI(prompt);
        const extraQ = parseQuestions(response);
        for (const q of extraQ) {
          idCounter++;
          const nq = normalizeQuestion(q, 'ly2', idCounter);
          if (nq.question && nq.options && nq.options.length >= 2) {
            validQuestions.push(nq);
          }
        }
        console.log(`补充后总题数: ${validQuestions.length}`);
      } catch (e) {
        console.log(`补充失败: ${e.message}`);
      }
    }
  }

  // 写入文件
  const banksDir = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\banks';
  const bankFile = `${banksDir}\\燎原第二周.json`;
  fs.writeFileSync(bankFile, JSON.stringify(validQuestions, null, 0), 'utf-8');
  console.log(`\n已写入: ${bankFile}`);

  // 更新index.json
  const indexPath = `${banksDir}\\index.json`;
  const bankList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  // 移除已存在的同名bank
  const filtered = bankList.filter(b => b.name !== '燎原第二周');
  const finalSingles = validQuestions.filter(q => q.type === 'single').length;
  const finalMultiples = validQuestions.filter(q => q.type === 'multiple').length;
  const finalJudges = validQuestions.filter(q => q.type === 'judge').length;
  filtered.push({
    name: '燎原第二周',
    file: '燎原第二周.json',
    total: validQuestions.length,
    single: finalSingles,
    multiple: finalMultiples,
    judge: finalJudges
  });
  fs.writeFileSync(indexPath, JSON.stringify(filtered, null, 2), 'utf-8');

  // 合并questions.json
  const questionsPath = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\questions.json';
  const existing = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
  // 移除旧的同bank题目
  const existingFiltered = existing.filter(q => q.bank !== '燎原第二周');
  const merged = [...existingFiltered, ...validQuestions];
  fs.writeFileSync(questionsPath, JSON.stringify(merged, null, 0), 'utf-8');

  console.log(`\n=== 完成 ===`);
  console.log(`燎原第二周题库: ${validQuestions.length} 题 (单选${finalSingles}/多选${finalMultiples}/判断${finalJudges})`);
  console.log(`总题库: ${merged.length} 题`);
}

main().catch(console.error);
