/**
 * 重新生成燎原第二周题库的解析
 * 只更新 explanation 字段，补充 terms / relatedPoints / funTip
 * 保留原有的题目、选项、答案不变
 */
const https = require('https');
const fs = require('fs');

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const API_KEY = 'sk-3168b812f4c8455aa9b9048b54b0de66';
const MODEL = 'deepseek-v4-flash';

const BANK_FILE = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\banks\\燎原第二周.json';
const QUESTIONS_FILE = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\questions.json';

// 并发数
const CONCURRENCY = 4;
// 每批大小
const BATCH_SIZE = 5;

function callAPI(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
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
          reject(new Error('Parse error: ' + e.message));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

const EXAMPLE_OUTPUT = `{
  "mainExp": "这个题啊，你就把它想成搭积木。CV二开的核心就是'站在别人的底座上搭自己的东西'，而不是从零开始造轮子。文档里说得很清楚——利用视联各平台的底座能力，快速搭建二开应用。选项A说用省侧自建AI去替代平台，那不是搭积木，那是要拆了积木自己造砖；选项C说只提供拉流，太窄了，拉流只是其中一个能力；选项D完全依赖第三方也不对，必须是利用标准平台能力。所以答案是B。",
  "terms": [
    { "term": "CV二开", "definition": "就是基于视联网的计算机视觉二次开发，用现成的平台能力快速做出应用，不用从零写代码。" },
    { "term": "平台底座能力", "definition": "平台已经帮你做好的基础功能，比如视频拉流、算法推理等，你直接调用就行，就像用现成的乐高底板。" }
  ],
  "relatedPoints": [
    "CV二开≠拉流+省侧自建AI，这是个常考易错点",
    "三大痛点：不能开→平台解耦、不会开→实战实训、不会卖→业务运营"
  ],
  "funTip": "记住：CV二开就是'不造轮子，只搭车'——用别人的底座，做自己的应用。"
}`;

function buildPrompt(question) {
  const typeLabel = question.type === 'single' ? '单选' : question.type === 'multiple' ? '多选' : '判断';
  const answerStr = question.type === 'multiple' ? question.answer.join(',') : 
                    question.type === 'judge' ? (question.answer ? '正确' : '错误') : question.answer;
  
  const existingExp = question.explanation?.mainExp || '';
  
  return `你是考试辅导老师，擅长用大白话和生活类比来解释专业术语，让零基础的小白也能一看就懂。

请为以下${typeLabel}题重新写解析。题目和答案已经确定，不需要修改，你只需要输出 explanation 部分。

题目：${question.question}
选项：${question.options.join(' | ')}
正确答案：${answerStr}
原有解析（参考）：${existingExp}

要求：
1. mainExp：用大白话+生活类比来解释，像跟朋友聊天一样，但必须准确。把专业术语翻译成人话。
2. terms：提取2-4个关键术语，每个用一句话大白话解释，就像给外行科普。
3. relatedPoints：列出2-3个相关知识点或常考易错点，简短一句话。
4. funTip：一个记忆口诀或趣味联想，帮助记住这道题的核心考点。

请严格按以下JSON格式输出，不要有任何其他文字：
${EXAMPLE_OUTPUT}`;
}

function parseExplanation(text) {
  try {
    let jsonStr = text;
    // 尝试提取 JSON 对象
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const parsed = JSON.parse(jsonStr);
    return {
      mainExp: String(parsed.mainExp || '').trim(),
      terms: Array.isArray(parsed.terms) ? parsed.terms.filter(t => t.term && t.definition).map(t => ({
        term: String(t.term).trim(),
        definition: String(t.definition).trim()
      })) : [],
      relatedPoints: Array.isArray(parsed.relatedPoints) ? parsed.relatedPoints.map(p => String(p).trim()).filter(Boolean) : [],
      funTip: parsed.funTip ? String(parsed.funTip).trim() : ''
    };
  } catch (e) {
    console.error('JSON解析失败:', e.message, text.substring(0, 200));
    return null;
  }
}

async function processQuestion(question, idx, total) {
  const prompt = buildPrompt(question);
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await callAPI(prompt);
      const explanation = parseExplanation(response);
      if (explanation && explanation.mainExp) {
        console.log(`[${idx + 1}/${total}] OK: ${question.question.substring(0, 30)}...`);
        return explanation;
      }
      console.log(`[${idx + 1}/${total}] 解析为空，重试...`);
    } catch (e) {
      console.log(`[${idx + 1}/${total}] 错误: ${e.message}，重试...`);
    }
    retries--;
    if (retries > 0) await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`[${idx + 1}/${total}] 失败，保留原解析: ${question.question.substring(0, 30)}...`);
  return null;
}

async function main() {
  // 读取题库
  const questions = JSON.parse(fs.readFileSync(BANK_FILE, 'utf-8'));
  console.log(`共 ${questions.length} 道题需要重新生成解析\n`);

  let success = 0;
  let failed = 0;

  // 分批并发处理
  for (let i = 0; i < questions.length; i += CONCURRENCY * BATCH_SIZE) {
    const batch = questions.slice(i, Math.min(i + CONCURRENCY * BATCH_SIZE, questions.length));
    
    // 分成 CONCURRENCY 个小组并行
    const groups = [];
    for (let g = 0; g < CONCURRENCY; g++) {
      const groupItems = batch.filter((_, idx) => idx % CONCURRENCY === g);
      if (groupItems.length > 0) groups.push(groupItems);
    }

    const promises = groups.map(group => 
      group.reduce(async (prev, q) => {
        await prev;
        const qIdx = questions.indexOf(q);
        const explanation = await processQuestion(q, qIdx, questions.length);
        if (explanation) {
          q.explanation = explanation;
          success++;
        } else {
          failed++;
        }
      }, Promise.resolve())
    );

    await Promise.all(promises);

    // 避免API限流
    if (i + CONCURRENCY * BATCH_SIZE < questions.length) {
      process.stdout.write('--- 批次间隔2秒 ---\n');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${success}, 失败(保留原解析): ${failed}`);

  // 写回题库文件
  fs.writeFileSync(BANK_FILE, JSON.stringify(questions, null, 0), 'utf-8');
  console.log(`已更新: ${BANK_FILE}`);

  // 更新 questions.json
  const allQuestions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
  const otherQuestions = allQuestions.filter(q => q.bank !== '燎原第二周');
  const merged = [...otherQuestions, ...questions];
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(merged, null, 0), 'utf-8');
  console.log(`已更新总题库: ${QUESTIONS_FILE} (${merged.length} 题)`);
}

main().catch(console.error);
