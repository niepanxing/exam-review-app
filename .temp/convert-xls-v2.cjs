const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'D:/zxj/xwechat_files/wxid_nl8ralj0p2eo22_136b/msg/file/2026-06/一般工贸行业安全培训重点内容2025、10、15(1).xls';
const wb = XLSX.readFile(filePath);

let idCounter = Date.now();
const allQuestions = [];

// 选择题新版本: 序号, 题干, 选项A, 选项B, 选项C, 答案, 出处, 知识点, 解析
function processChoiceNew() {
  const ws = wb.Sheets['选择题新版本'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1]) continue;
    const question = String(row[1] || '').trim();
    if (!question) continue;

    const q = {
      id: `safety_${idCounter++}`,
      type: 'single',
      question,
      options: [],
      answer: '',
      explanation: { mainExp: String(row[8] || '').trim() },
      difficulty: 1,
      tags: [String(row[7] || '').trim()].filter(Boolean),
      sourceDoc: '安全培训重点内容',
      sourcePage: null,
      createdAt: new Date().toISOString(),
      documentId: 'bank-safety',
      bank: '安全培训'
    };

    // 选项在列2,3,4（选项A, 选项B, 选项C）
    // XLS中选项值可能已带"A"前缀，需要去掉再统一格式化
    const letters = ['A', 'B', 'C'];
    for (let j = 0; j < 3; j++) {
      const rawVal = String(row[2 + j] || '').trim();
      if (rawVal) {
        // 去掉开头的字母+可能的点号/空格前缀，如"A保证..." → "保证..."
        const cleaned = rawVal.replace(/^[A-Ca-c][.、．\s]?/, '');
        q.options.push(`${letters[j]}. ${cleaned}`);
      }
    }

    if (q.options.length < 2) continue;

    // 答案在列5
    const ans = String(row[5] || '').trim().toUpperCase();
    q.answer = ans.charAt(0);
    if (!['A', 'B', 'C', 'D'].includes(q.answer)) continue;

    allQuestions.push(q);
  }
}

// 判断题新版本: 序号, 题干, 答案, 出处, 解析
function processJudgeNew() {
  const ws = wb.Sheets['判断题新版本'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1]) continue;
    const question = String(row[1] || '').trim();
    if (!question) continue;

    const q = {
      id: `safety_${idCounter++}`,
      type: 'judge',
      question,
      options: ['A. 正确', 'B. 错误'],
      answer: true,
      explanation: { mainExp: String(row[4] || '').trim() },
      difficulty: 1,
      tags: [],
      sourceDoc: '安全培训重点内容',
      sourcePage: null,
      createdAt: new Date().toISOString(),
      documentId: 'bank-safety',
      bank: '安全培训'
    };

    const ans = String(row[2] || '').trim();
    if (ans === '对' || ans === '正确' || ans === '√' || ans === 'A' || ans === 'true') {
      q.answer = true;
    } else {
      q.answer = false;
    }
    allQuestions.push(q);
  }
}

processChoiceNew();
processJudgeNew();

const single = allQuestions.filter(q => q.type === 'single').length;
const multiple = allQuestions.filter(q => q.type === 'multiple').length;
const judge = allQuestions.filter(q => q.type === 'judge').length;

console.log(`安全培训题库: ${allQuestions.length}题 (单选${single}/多选${multiple}/判断${judge})`);

// 打印前3条验证
for (let i = 0; i < Math.min(3, allQuestions.length); i++) {
  const q = allQuestions[i];
  console.log(`\n[${i+1}] ${q.type} | ${q.question.substring(0, 30)}...`);
  console.log('  Options:', JSON.stringify(q.options));
  console.log('  Answer:', q.answer);
}

// 写入题库文件
const banksDir = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\banks';
fs.writeFileSync(`${banksDir}/安全培训.json`, JSON.stringify(allQuestions, null, 0), 'utf-8');

// 重新生成index.json（从所有bank文件）
const bankFiles = fs.readdirSync(banksDir).filter(f => f.endsWith('.json') && f !== 'index.json');
const bankList = bankFiles.map(f => {
  const data = JSON.parse(fs.readFileSync(`${banksDir}/${f}`, 'utf-8'));
  return {
    name: f.replace('.json', ''),
    file: f,
    total: data.length,
    single: data.filter(q => q.type === 'single').length,
    multiple: data.filter(q => q.type === 'multiple').length,
    judge: data.filter(q => q.type === 'judge').length
  };
});
fs.writeFileSync(`${banksDir}/index.json`, JSON.stringify(bankList, null, 2), 'utf-8');

// 重新合并questions.json（从所有bank文件）
const allQ = [];
for (const f of bankFiles) {
  const data = JSON.parse(fs.readFileSync(`${banksDir}/${f}`, 'utf-8'));
  allQ.push(...data);
}
const questionsPath = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\questions.json';
fs.writeFileSync(questionsPath, JSON.stringify(allQ, null, 0), 'utf-8');

console.log(`\n已写入! 总题库: ${allQ.length}题`);
