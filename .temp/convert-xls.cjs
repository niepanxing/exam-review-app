const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'D:/zxj/xwechat_files/wxid_nl8ralj0p2eo22_136b/msg/file/2026-06/一般工贸行业安全培训重点内容2025、10、15(1).xls';
const wb = XLSX.readFile(filePath);

let idCounter = Date.now();
const allQuestions = [];

// 使用新版本sheet
function processChoiceNew() {
  const ws = wb.Sheets['选择题新版本'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  // 第1行是列名
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1]) continue;
    const q = {
      id: `safety_${idCounter++}`,
      type: 'single',
      question: String(row[1] || '').trim(),
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
    // 选项A B C
    const letters = ['A', 'B', 'C', 'D'];
    let optIdx = 2;
    for (const l of letters) {
      const val = row[optIdx];
      if (val && String(val).trim()) {
        q.options.push(`${l}. ${String(val).trim()}`);
        optIdx++;
      } else break;
    }
    // 答案
    const ans = String(row[5] || '').trim().toUpperCase();
    q.answer = ans.charAt(0);
    if (!['A','B','C','D'].includes(q.answer)) continue;
    if (q.options.length < 2) continue;
    if (!q.question) continue;
    allQuestions.push(q);
  }
}

function processJudgeNew() {
  const ws = wb.Sheets['判断题新版本'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[1]) continue;
    const q = {
      id: `safety_${idCounter++}`,
      type: 'judge',
      question: String(row[1] || '').trim(),
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
    if (!q.question) continue;
    allQuestions.push(q);
  }
}

processChoiceNew();
processJudgeNew();

const single = allQuestions.filter(q => q.type === 'single').length;
const multiple = allQuestions.filter(q => q.type === 'multiple').length;
const judge = allQuestions.filter(q => q.type === 'judge').length;

console.log(`安全培训题库: ${allQuestions.length}题 (单选${single}/多选${multiple}/判断${judge})`);

// 写入题库文件
const banksDir = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\banks';
fs.writeFileSync(`${banksDir}/安全培训.json`, JSON.stringify(allQuestions, null, 0), 'utf-8');

// 更新index.json
const indexPath = `${banksDir}/index.json`;
const bankList = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
bankList.push({
  name: '安全培训',
  file: '安全培训.json',
  total: allQuestions.length,
  single, multiple, judge
});
fs.writeFileSync(indexPath, JSON.stringify(bankList, null, 2), 'utf-8');

// 更新questions.json（合并全部题库）
const questionsPath = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\questions.json';
const existing = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
const merged = [...existing, ...allQuestions];
fs.writeFileSync(questionsPath, JSON.stringify(merged, null, 0), 'utf-8');

console.log(`已写入! 总题库: ${merged.length}题`);
