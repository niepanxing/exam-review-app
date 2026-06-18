/**
 * 1. 给燎原第二周314题添加具体章节出处（sourceDoc 改为 "第一章 CV 二次开发" 格式）
 * 2. 生成知识点复习模块的 HTML 文件
 */
const fs = require('fs');

const BANK_FILE = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\banks\\燎原第二周.json';
const QUESTIONS_FILE = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\questions.json';
const KNOWLEDGE_DIR = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\knowledge';
const SOURCE_FILE = 'D:\\电信\\培训文件\\燎原计划\\第二次考试材料\\燎原计划第二周复习资料汇总.md';

// 章节 tags → 章节名映射
const TAG_CHAPTER_MAP = {
  'CV二开定义': '第一章 CV 二次开发',
  '痛点': '第一章 CV 二次开发',
  '平台体系': '第一章 CV 二次开发',
  '星海': '第一章 CV 二次开发',
  '算法入仓': '第一章 CV 二次开发',
  '二开流程': '第一章 CV 二次开发',
  '能力开放': '第一章 CV 二次开发',
  '积木式应用': '第一章 CV 二次开发',
  '大屏': '第一章 CV 二次开发',
  '卡片': '第一章 CV 二次开发',
  '卡片开发': '第一章 CV 二次开发',
  '数据源': '第一章 CV 二次开发',
  '单点登录': '第一章 CV 二次开发',
  '一语定场景': '第一章 CV 二次开发',
  '参数': '第一章 CV 二次开发',
  '算力成本': '第一章 CV 二次开发',
  '核心原则': '第一章 CV 二次开发',
  '案例': '第一章 CV 二次开发',
  '审核阈值': '第一章 CV 二次开发',
  '标品': '第一章 CV 二次开发',
  'QPS': '第一章 CV 二次开发',
  '周期': '第一章 CV 二次开发',
  '合作模式': '第一章 CV 二次开发',
  '公有云': '第一章 CV 二次开发',
  '定价': '第一章 CV 二次开发',
  '二开加载': '第一章 CV 二次开发',
  '积木式': '第一章 CV 二次开发',
  '销售品': '第一章 CV 二次开发',
  'A类': '第一章 CV 二次开发',
  '标品条件': '第一章 CV 二次开发',
  '成效数据': '第一章 CV 二次开发',
  'API': '第一章 CV 二次开发',
  '湖南': '第一章 CV 二次开发',
  '法规': '第一章 CV 二次开发',
  '保存期限': '第一章 CV 二次开发',
  '开放平台': '第一章 CV 二次开发',
  '流程': '第一章 CV 二次开发',
  '星海训练': '第一章 CV 二次开发',
  'CV二开': '第一章 CV 二次开发',
  '边界': '第一章 CV 二次开发',
  'CV算力成本': '第一章 CV 二次开发',
  '公式': '第一章 CV 二次开发',
  '标品审核': '第一章 CV 二次开发',
  '阈值': '第一章 CV 二次开发',
  '加密链': '第一章 CV 二次开发',
  '算力': '第一章 CV 二次开发',
  '尺寸': '第一章 CV 二次开发',

  '数字生活二开': '第二章 数字生活二开',
  '平台定位': '第二章 数字生活二开',
  '集约分工': '第二章 数字生活二开',
  '平台架构': '第二章 数字生活二开',
  '基础能力': '第二章 数字生活二开',
  '能力体系': '第二章 数字生活二开',
  'API数量': '第二章 数字生活二开',
  '对接模式': '第二章 数字生活二开',
  '用户旅程': '第二章 数字生活二开',
  '认证加密': '第二章 数字生活二开',
  '高频考点': '第二章 数字生活二开',
  '难点': '第二章 数字生活二开',
  '数据交互': '第二章 数字生活二开',
  '成效数字': '第二章 数字生活二开',
  '数字生活': '第二章 数字生活二开',
  '二开级别': '第二章 数字生活二开',
  '认证时效': '第二章 数字生活二开',

  '物联网协议四层体系': '第三章 物联网感知云与 ThingsMQ',
  'ThingsMQ定位': '第三章 物联网感知云与 ThingsMQ',
  '部署形态': '第三章 物联网感知云与 ThingsMQ',
  'ThingsMQ性能': '第三章 物联网感知云与 ThingsMQ',
  'ThingsMQ核心组件': '第三章 物联网感知云与 ThingsMQ',
  '规则引擎': '第三章 物联网感知云与 ThingsMQ',
  'JS脚本': '第三章 物联网感知云与 ThingsMQ',
  '二开方式': '第三章 物联网感知云与 ThingsMQ',
  '插件开发': '第三章 物联网感知云与 ThingsMQ',
  '接口规范': '第三章 物联网感知云与 ThingsMQ',
  '协议插件': '第三章 物联网感知云与 ThingsMQ',
  '桥接插件': '第三章 物联网感知云与 ThingsMQ',
  '协议插件实现': '第三章 物联网感知云与 ThingsMQ',
  '南向北向接入': '第三章 物联网感知云与 ThingsMQ',
  'ThingsMQ': '第三章 物联网感知云与 ThingsMQ',
  '中间件': '第三章 物联网感知云与 ThingsMQ',
  'MQTT': '第三章 物联网感知云与 ThingsMQ',
  '云云对接': '第三章 物联网感知云与 ThingsMQ',
  '协议': '第三章 物联网感知云与 ThingsMQ',

  '融合应用二开': '第四章 融合应用二开',
  '四层架构': '第四章 融合应用二开',
  '功能模块': '第四章 融合应用二开',
  '易错点': '第四章 融合应用二开',
  '产品定位': '第四章 融合应用二开',

  'SDK平台': '第五章 量子密信 SDK 客户端二开',
  '加密方式': '第五章 量子密信 SDK 客户端二开',
  '四大问题': '第五章 量子密信 SDK 客户端二开',
  'SDK形态': '第五章 量子密信 SDK 客户端二开',
  'Lib版': '第五章 量子密信 SDK 客户端二开',
  '组合使用': '第五章 量子密信 SDK 客户端二开',
  '集成模式': '第五章 量子密信 SDK 客户端二开',
  '公版服务': '第五章 量子密信 SDK 客户端二开',
  '私版服务': '第五章 量子密信 SDK 客户端二开',
  '技术架构': '第五章 量子密信 SDK 客户端二开',
  '登录流程': '第五章 量子密信 SDK 客户端二开',
  'RTC分层': '第五章 量子密信 SDK 客户端二开',
  'MVVM': '第五章 量子密信 SDK 客户端二开',
  '量子加解密': '第五章 量子密信 SDK 客户端二开',
  '安全介质': '第五章 量子密信 SDK 客户端二开',
  '密钥管理': '第五章 量子密信 SDK 客户端二开',
  '环境要求': '第五章 量子密信 SDK 客户端二开',
  'Android': '第五章 量子密信 SDK 客户端二开',
  'Gradle': '第五章 量子密信 SDK 客户端二开',
  '功能': '第五章 量子密信 SDK 客户端二开',
  '对比': '第五章 量子密信 SDK 客户端二开',
  '服务': '第五章 量子密信 SDK 客户端二开',
  '节点': '第五章 量子密信 SDK 客户端二开',
  '平台': '第五章 量子密信 SDK 客户端二开',
  'Kit版': '第五章 量子密信 SDK 客户端二开',
  '版本': '第五章 量子密信 SDK 客户端二开',
  '量子密信': '第五章 量子密信 SDK 客户端二开',
  '加密': '第五章 量子密信 SDK 客户端二开',

  '6.1': '第六章 TOGAF 企业架构设计与实践',
  'TOGAF概述': '第六章 TOGAF 企业架构设计与实践',
  '企业架构定义': '第六章 TOGAF 企业架构设计与实践',
  '6.2': '第六章 TOGAF 企业架构设计与实践',
  '4A架构': '第六章 TOGAF 企业架构设计与实践',
  '6.3': '第六章 TOGAF 企业架构设计与实践',
  'ADM预备阶段': '第六章 TOGAF 企业架构设计与实践',
  'ADM阶段A': '第六章 TOGAF 企业架构设计与实践',
  'ADM阶段C': '第六章 TOGAF 企业架构设计与实践',
  'ADM阶段E': '第六章 TOGAF 企业架构设计与实践',
  'ADM阶段F': '第六章 TOGAF 企业架构设计与实践',
  'ADM阶段G': '第六章 TOGAF 企业架构设计与实践',
  'ADM需求管理': '第六章 TOGAF 企业架构设计与实践',
  '6.4': '第六章 TOGAF 企业架构设计与实践',
  '关键术语': '第六章 TOGAF 企业架构设计与实践',
  '6.5': '第六章 TOGAF 企业架构设计与实践',
  'ACMM成熟度': '第六章 TOGAF 企业架构设计与实践',
  '6.6': '第六章 TOGAF 企业架构设计与实践',
  '业务架构设计': '第六章 TOGAF 企业架构设计与实践',
  '6.7': '第六章 TOGAF 企业架构设计与实践',
  '数据架构原则': '第六章 TOGAF 企业架构设计与实践',
  '数据资产三层': '第六章 TOGAF 企业架构设计与实践',
  '数据治理原则': '第六章 TOGAF 企业架构设计与实践',
  '6.8': '第六章 TOGAF 企业架构设计与实践',
  '应用架构原则': '第六章 TOGAF 企业架构设计与实践',
  '6.9': '第六章 TOGAF 企业架构设计与实践',
  '技术架构云服务': '第六章 TOGAF 企业架构设计与实践',
  'IT资产整合': '第六章 TOGAF 企业架构设计与实践',
  '6.10': '第六章 TOGAF 企业架构设计与实践',
  '架构落地案例': '第六章 TOGAF 企业架构设计与实践',
  '四统一': '第六章 TOGAF 企业架构设计与实践',
  '建设意义': '第六章 TOGAF 企业架构设计与实践',
  'ADM阶段H': '第六章 TOGAF 企业架构设计与实践',
  '传统职能型问题': '第六章 TOGAF 企业架构设计与实践',
  'ADM概述': '第六章 TOGAF 企业架构设计与实践',
  'ADM阶段': '第六章 TOGAF 企业架构设计与实践',
  '业务架构设计步骤': '第六章 TOGAF 企业架构设计与实践',
  '技术架构目标': '第六章 TOGAF 企业架构设计与实践',
  '架构落地三化': '第六章 TOGAF 企业架构设计与实践',
  'ADM特性': '第六章 TOGAF 企业架构设计与实践',
  '过渡架构': '第六章 TOGAF 企业架构设计与实践',
  '业务架构趋势': '第六章 TOGAF 企业架构设计与实践',
  '应用架构中台化': '第六章 TOGAF 企业架构设计与实践',
  '架构治理': '第六章 TOGAF 企业架构设计与实践',
  'TOGAF': '第六章 TOGAF 企业架构设计与实践',
  'ADM': '第六章 TOGAF 企业架构设计与实践',
  'ACMM': '第六章 TOGAF 企业架构设计与实践',
  '成熟度': '第六章 TOGAF 企业架构设计与实践',

  '课堂四要素': '第七章 TTT 讲师培训',
  'SUPER五要素': '第七章 TTT 讲师培训',
  '高频': '第七章 TTT 讲师培训',
  '讲师基本功': '第七章 TTT 讲师培训',
  '声音': '第七章 TTT 讲师培训',
  '讲授三部曲': '第七章 TTT 讲师培训',
  '记忆规律': '第七章 TTT 讲师培训',
  '教学方法': '第七章 TTT 讲师培训',
  '刺激度': '第七章 TTT 讲师培训',
  '互动流程': '第七章 TTT 讲师培训',
  'Me-We-Us': '第七章 TTT 讲师培训',
  '表情': '第七章 TTT 讲师培训',
  '课程导入': '第七章 TTT 讲师培训',
  '方法': '第七章 TTT 讲师培训',
  '重复原则': '第七章 TTT 讲师培训',
  '首要原则': '第七章 TTT 讲师培训',
  '最近原则': '第七章 TTT 讲师培训',
  '能力': '第七章 TTT 讲师培训',
  '控场': '第七章 TTT 讲师培训',
  'TTT': '第七章 TTT 讲师培训',
  '记忆': '第七章 TTT 讲师培训',
  '★高频考点': '第七章 TTT 讲师培训',
  '▲难点': '第七章 TTT 讲师培训',

  '考核形式': '第八章 数字生活二开实战考核',
  '评分点': '第八章 数字生活二开实战考核',
  '卡片尺寸': '第八章 数字生活二开实战考核',
  'JSSDK': '第八章 数字生活二开实战考核',
  '关键参数': '第八章 数字生活二开实战考核',
  '编码规范': '第八章 数字生活二开实战考核',
  '接口清单': '第八章 数字生活二开实战考核',
  '大屏编排': '第八章 数字生活二开实战考核',
  '实战考核': '第八章 数字生活二开实战考核',

  '算法': '第九章 重点难点速查手册',
};

// 第二章和第八章有重叠的 JSSDK 等 tags，用题目关键词进一步区分
const CHAPTER_KEYWORDS = [
  { chapter: '第二章 数字生活二开', keywords: ['数字生活', '社乡', '统一能力', 'DaaS', 'JSSDK.*加密', 'tokenCode', '天翼账号', '敏感字段', '数据订阅'] },
  { chapter: '第八章 数字生活二开实战考核', keywords: ['卡片开发', '卡片尺寸', '基层治理', '大屏编排', 'JSSDK.*SxIntegration', '背景地图', '灵动云'] },
];

function detectChapterByQuestion(q) {
  // 先看 tags 匹配
  for (const tag of (q.tags || [])) {
    if (TAG_CHAPTER_MAP[tag]) return TAG_CHAPTER_MAP[tag];
  }
  // 看 sourceDoc 中的原有信息
  if (q.sourceDoc && q.sourceDoc !== '燎原计划第二周复习资料汇总') return q.sourceDoc;
  // 兜底
  return '燎原计划第二周复习资料汇总';
}

// ====== 第一步：更新题库章节出处 ======
const questions = JSON.parse(fs.readFileSync(BANK_FILE, 'utf-8'));
let updated = 0;
const chapterStats = {};

questions.forEach(q => {
  const chapter = detectChapterByQuestion(q);
  if (chapter !== q.sourceDoc) {
    q.sourceDoc = chapter;
    updated++;
  }
  chapterStats[chapter] = (chapterStats[chapter] || 0) + 1;
});

console.log(`\n=== 题库出处更新 ===`);
console.log(`更新了 ${updated} 道题的 sourceDoc`);
console.log('章节分布:');
Object.entries(chapterStats).sort((a,b) => b[1]-a[1]).forEach(([ch, cnt]) => {
  console.log(`  ${ch}: ${cnt} 题`);
});

// 写回
fs.writeFileSync(BANK_FILE, JSON.stringify(questions, null, 0), 'utf-8');
console.log(`已更新: ${BANK_FILE}`);

// 同步更新 questions.json
const allQuestions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf-8'));
const otherQuestions = allQuestions.filter(q => q.bank !== '燎原第二周');
const bankIds = new Set(questions.map(q => q.id));
// 用更新后的燎原第二周题替换
const merged = [...otherQuestions, ...questions];
fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(merged, null, 0), 'utf-8');
console.log(`已同步总题库: ${merged.length} 题`);

// ====== 第二步：生成知识点复习 HTML ======
const mdContent = fs.readFileSync(SOURCE_FILE, 'utf-8');

// Markdown → 简易 HTML 转换
function mdToHtml(md) {
  let html = md;
  // 跳过顶层标题和目录
  html = html.replace(/^# 燎原计划第二周[\s\S]*?---\n/, '');
  
  // 处理章节标题 # → section div + h2
  html = html.replace(/^# (.+)$/gm, (match, title) => {
    return `<div class="section"><h2>${title}</h2>`;
  });
  
  // 处理 ## → h3
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  
  // 处理 ### → h4
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  
  // 处理 > 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // 合并连续 blockquote
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
  
  // 处理粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // 处理行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 处理表格
  html = html.replace(/^\|(.+)\|$/gm, (match, row) => {
    const cells = row.split('|').map(c => c.trim());
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  });
  // 表格前后加 table 标签
  html = html.replace(/((?:<tr>[\s\S]*?<\/tr>\n?)+)/g, '<table>$1</table>');
  
  // 表头行加 th
  html = html.replace(/<table>\s*<tr>([\s\S]*?)<\/tr>/, (match, cells) => {
    return '<table><tr>' + cells.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>') + '</tr>';
  });
  
  // 处理无序列表
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  // 包裹连续的 li
  html = html.replace(/((?:<li>[\s\S]*?<\/li>\n?)+)/g, '<ul>$1</ul>');
  
  // 处理有序列表
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // 处理 ★ 和 ▲ 标记
  html = html.replace(/★/g, '<span class="tag">★高频</span>');
  html = html.replace(/▲/g, '<span class="tag orange">▲难点</span>');
  
  // 关闭 section div（在每个 # 之前和文件末尾）
  const sections = html.split(/(<div class="section">)/);
  let result = '';
  let inSection = false;
  for (let i = 0; i < sections.length; i++) {
    if (sections[i] === '<div class="section">') {
      if (inSection) result += '</div>';
      result += sections[i];
      inSection = true;
    } else {
      result += sections[i];
    }
  }
  if (inSection) result += '</div>';
  html = result;
  
  // 处理普通段落（不含标签的行）
  html = html.replace(/^(?!<[a-z/])(.+)$/gm, '<p>$1</p>');
  
  // 清理空行
  html = html.replace(/\n{3,}/g, '\n\n');
  
  return html.trim();
}

const htmlContent = mdToHtml(mdContent);

// 生成目录
const chapterList = [
  { id: 'ch1', title: '第一章 CV 二次开发' },
  { id: 'ch2', title: '第二章 数字生活二开' },
  { id: 'ch3', title: '第三章 物联网感知云与 ThingsMQ' },
  { id: 'ch4', title: '第四章 融合应用二开' },
  { id: 'ch5', title: '第五章 量子密信 SDK 客户端二开' },
  { id: 'ch6', title: '第六章 TOGAF 企业架构设计与实践' },
  { id: 'ch7', title: '第七章 TTT 讲师培训' },
  { id: 'ch8', title: '第八章 数字生活二开实战考核' },
  { id: 'ch9', title: '第九章 重点难点速查手册' },
];

const fullHtml = htmlContent;

fs.writeFileSync(`${KNOWLEDGE_DIR}\\liao-yuan-di-er-zhou.html`, fullHtml, 'utf-8');
console.log(`\n已生成知识点 HTML: ${KNOWLEDGE_DIR}\\liao-yuan-di-er-zhou.html`);
console.log(`HTML 大小: ${(fullHtml.length / 1024).toFixed(1)} KB`);

// 更新 knowledge/index.js
const indexJsPath = `${KNOWLEDGE_DIR}\\index.js`;
let indexJs = fs.readFileSync(indexJsPath, 'utf-8');

// 添加 import
const newImport = `import liaoYuan from './liao-yuan-di-er-zhou.html?raw'`;
if (!indexJs.includes(newImport)) {
  indexJs = newImport + '\n' + indexJs;
}

// 添加模块
const newModule = `  {
    id: 'liao-yuan-di-er-zhou',
    title: '燎原第二周复习资料汇总',
    icon: '📋',
    color: '#e65100',
    content: liaoYuan
  }`;

if (!indexJs.includes('liao-yuan-di-er-zhou')) {
  // 在数组末尾添加
  indexJs = indexJs.replace(/\]\s*$/, `,\n${newModule}\n]`);
}

fs.writeFileSync(indexJsPath, indexJs, 'utf-8');
console.log(`已更新: ${indexJsPath}`);

console.log(`\n=== 全部完成 ===`);
