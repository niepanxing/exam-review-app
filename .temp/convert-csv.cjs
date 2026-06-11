const fs = require('fs');
const path = require('path');

// CSV解析（处理引号内的逗号）
function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''); // 去BOM
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (const ch of raw) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === '\n' && !inQuotes) { lines.push(current); current = ''; continue; }
    if (ch === '\r' && !inQuotes) continue;
    current += ch;
  }
  if (current.trim()) lines.push(current);
  
  // 解析表头
  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length === 0 || (vals.length === 1 && vals[0] === '')) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function parseLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

// 转换行到应用格式
let idCounter = Date.now();
function convertRow(row, bankName) {
  const type = row.type === '单选' ? 'single' : row.type === '多选' ? 'multiple' : row.type === '判断' ? 'judge' : 'single';
  
  // 选项
  let options = [];
  if (type === 'judge') {
    options = ['A. 正确', 'B. 错误'];
  } else {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (const l of letters) {
      const val = row[`option_${l}`];
      if (val) options.push(`${l}. ${val}`);
    }
  }
  
  // 答案
  let answer;
  if (type === 'judge') {
    const a = (row.answer || '').trim();
    if (['A', '正确', '对', 'true', 'TRUE'].includes(a)) answer = true;
    else answer = false;
  } else if (type === 'multiple') {
    // 多选答案可能是 "A,B,C" 或 "AB" 等
    const a = (row.answer || '').trim();
    if (a.includes(',')) {
      answer = a.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      answer = a.split('').filter(c => /[A-Fa-f]/.test(c)).map(c => c.toUpperCase());
    }
  } else {
    answer = (row.answer || '').trim().charAt(0).toUpperCase();
  }
  
  // 解析
  const explanation = {
    mainExp: row.explanation || ''
  };
  
  return {
    id: `csv_${idCounter++}`,
    type,
    question: row.question || '',
    options,
    answer,
    explanation,
    difficulty: 1,
    tags: [],
    sourceDoc: row.source || bankName,
    sourcePage: null,
    createdAt: new Date().toISOString(),
    documentId: `bank-${bankName}`,
    bank: bankName  // 新增字段：标记属于哪个题库
  };
}

// 处理CSV文件
const files = [
  { path: 'D:\\电信\\培训文件\\燎原计划\\first-test\\模拟题1.csv', name: '模拟题1' },
  { path: 'D:\\电信\\培训文件\\燎原计划\\first-test\\模拟题2.csv', name: '模拟题2' },
  { path: 'D:\\电信\\培训文件\\燎原计划\\first-test\\题库备份_精华80题_带答案.csv', name: '精华80题' },
  { path: 'D:\\电信\\培训文件\\燎原计划\\first-test\\智能体与研发管理题库_300题_带答案.csv', name: '题库300题' },
];

const allQuestions = {};
const bankStats = {};

// 先加载原有题库（标记为"AI生成"）
const origPath = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\questions.json';
try {
  const orig = JSON.parse(fs.readFileSync(origPath, 'utf-8'));
  const banked = orig.map(q => ({ ...q, bank: q.bank || 'AI生成' }));
  allQuestions['AI生成'] = banked;
  bankStats['AI生成'] = { total: banked.length, single: 0, multiple: 0, judge: 0 };
  banked.forEach(q => {
    if (q.type === 'single') bankStats['AI生成'].single++;
    else if (q.type === 'multiple') bankStats['AI生成'].multiple++;
    else if (q.type === 'judge') bankStats['AI生成'].judge++;
  });
} catch (e) {
  console.error('加载原题库失败:', e.message);
}

// 转换每个CSV
for (const f of files) {
  console.log(`\n处理: ${f.name}`);
  const rows = parseCSV(f.path);
  console.log(`  CSV行数: ${rows.length}`);
  
  const converted = rows.map(r => convertRow(r, f.name));
  allQuestions[f.name] = converted;
  
  bankStats[f.name] = { total: converted.length, single: 0, multiple: 0, judge: 0 };
  converted.forEach(q => {
    if (q.type === 'single') bankStats[f.name].single++;
    else if (q.type === 'multiple') bankStats[f.name].multiple++;
    else if (q.type === 'judge') bankStats[f.name].judge++;
  });
  
  console.log(`  转换完成: ${bankStats[f.name]}`);
}

// 合并所有题目
const merged = [];
for (const [bank, questions] of Object.entries(allQuestions)) {
  merged.push(...questions);
}

// 输出统计
console.log('\n===== 题库统计 =====');
let totalAll = 0;
for (const [bank, stats] of Object.entries(bankStats)) {
  console.log(`  ${bank}: ${stats.total}题 (单选${stats.single}/多选${stats.multiple}/判断${stats.judge})`);
  totalAll += stats.total;
}
console.log(`\n  总计: ${totalAll}题`);

// 写入合并文件
const outPath = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\questions.json';
fs.writeFileSync(outPath, JSON.stringify(merged, null, 0), 'utf-8');
console.log(`\n已写入: ${outPath} (${merged.length}题)`);

// 写入各题库单独文件（供选择题库时加载）
const banksDir = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\banks';
if (!fs.existsSync(banksDir)) fs.mkdirSync(banksDir, { recursive: true });

const bankList = [];
for (const [bank, questions] of Object.entries(allQuestions)) {
  const filePath = path.join(banksDir, `${bank}.json`);
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 0), 'utf-8');
  bankList.push({ name: bank, file: `${bank}.json`, ...bankStats[bank] });
}

const banksIndexPath = path.join(banksDir, 'index.json');
fs.writeFileSync(banksIndexPath, JSON.stringify(bankList, null, 2), 'utf-8');
console.log(`题库索引: ${banksIndexPath}`);
console.log('完成！');