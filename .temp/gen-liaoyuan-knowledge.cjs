/**
 * 优化的 Markdown→HTML 转换，生成带可点击目录的燎原第二周知识点页面
 */
const fs = require('fs');

const SOURCE_FILE = 'D:\\电信\\培训文件\\燎原计划\\第二次考试材料\\燎原计划第二周复习资料汇总.md';
const OUTPUT_FILE = 'D:\\webprogram\\teleai-super-agent\\TeleClaw的工作空间\\exam-review-app\\src\\data\\knowledge\\liao-yuan-di-er-zhou.html';

const mdContent = fs.readFileSync(SOURCE_FILE, 'utf-8');
const lines = mdContent.split('\n');

let html = '';
let inCodeBlock = false;
let inTable = false;
let inUl = false;
let inOl = false;
let tableFirstRow = true;
let sectionCount = 0;

// 章节列表，用于生成目录
const chapters = [];
let currentChapter = null;
let subSectionIndex = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();

  // 代码块
  if (trimmed.startsWith('```')) {
    if (inCodeBlock) {
      html += '</code></pre>';
      inCodeBlock = false;
    } else {
      html += '<pre><code>';
      inCodeBlock = true;
    }
    continue;
  }
  if (inCodeBlock) {
    html += escapeHtml(line) + '\n';
    continue;
  }

  // 跳过顶层标题和描述
  if (i < 20 && (trimmed.startsWith('# 燎原计划第二周') || trimmed.startsWith('> 基于'))) continue;

  // 分隔线
  if (trimmed === '---') {
    closeList();
    continue;
  }

  // 目录部分：替换为可点击的锚点链接
  if (trimmed.startsWith('## 目录')) continue;
  if (trimmed.match(/^- \[第.+章/)) {
    const match = trimmed.match(/^- \[(.+?)\]\(#(.+)\)/);
    if (match) {
      chapters.push({ title: match[1], anchor: match[2] });
    }
    continue;
  }

  // # 章节标题 → section div + h2 (带 anchor id)
  if (trimmed.match(/^# /)) {
    closeList();
    closeTable();
    if (sectionCount > 0) html += '</div>\n';
    const title = trimmed.replace(/^# /, '');
    const anchor = title.toLowerCase().replace(/[^a-z\u4e00-\u9fff0-9]+/g, '-').replace(/^-|-$/g, '');
    currentChapter = title;
    subSectionIndex = 0;
    html += `<div class="section"><h2 id="${anchor}">${formatInline(title)}</h2>\n`;
    sectionCount++;
    continue;
  }

  // ## 小节标题 → h3
  if (trimmed.match(/^## /)) {
    closeList();
    const title = trimmed.replace(/^## /, '');
    subSectionIndex++;
    html += `<h3 id="${currentChapter ? currentChapter.toLowerCase().replace(/[^a-z\u4e00-\u9fff0-9]+/g, '-') + '-' + subSectionIndex : 'sec-' + subSectionIndex}">${formatInline(title)}</h3>\n`;
    continue;
  }

  // ### → h4
  if (trimmed.match(/^### /)) {
    closeList();
    html += `<h4>${formatInline(trimmed.replace(/^### /, ''))}</h4>\n`;
    continue;
  }

  // 表格行
  if (trimmed.startsWith('|')) {
    closeList();
    if (!inTable) {
      inTable = true;
      tableFirstRow = true;
      html += '<table>';
    }
    // 跳过分隔行
    if (trimmed.match(/^\|[\s\-:|]+\|$/)) continue;
    
    const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
    if (tableFirstRow) {
      html += '<tr>' + cells.map(c => `<th>${formatInline(c)}</th>`).join('') + '</tr>\n';
      tableFirstRow = false;
    } else {
      html += '<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>\n';
    }
    continue;
  } else if (inTable) {
    closeTable();
  }

  // 引用
  if (trimmed.startsWith('> ')) {
    closeList();
    html += `<blockquote>${formatInline(trimmed.substring(2))}</blockquote>\n`;
    continue;
  }

  // 无序列表
  if (trimmed.match(/^- /)) {
    if (!inUl) { closeOl(); inUl = true; html += '<ul>'; }
    html += `<li>${formatInline(trimmed.substring(2))}</li>\n`;
    continue;
  }

  // 有序列表
  if (trimmed.match(/^\d+\. /)) {
    if (!inOl) { closeUl(); inOl = true; html += '<ol>'; }
    html += `<li>${formatInline(trimmed.replace(/^\d+\. /, ''))}</li>\n`;
    continue;
  }

  // 空行
  if (trimmed === '') {
    closeList();
    continue;
  }

  // 普通段落
  closeList();
  html += `<p>${formatInline(trimmed)}</p>\n`;
}

// 关闭所有未关闭的标签
closeList();
closeTable();
if (sectionCount > 0) html += '</div>\n';

// 生成带可点击目录的完整页面
const tocHtml = chapters.map(ch => 
  `<a class="toc-item" href="#${ch.anchor}">${ch.title}</a>`
).join('\n');

const finalHtml = `<div class="toc-nav">${tocHtml}</div>\n\n` + html;

fs.writeFileSync(OUTPUT_FILE, finalHtml, 'utf-8');
console.log(`已生成: ${OUTPUT_FILE}`);
console.log(`HTML 大小: ${(finalHtml.length / 1024).toFixed(1)} KB`);
console.log(`章节: ${chapters.length} 个`);

// === 辅助函数 ===
function closeList() { closeUl(); closeOl(); }
function closeUl() { if (inUl) { html += '</ul>\n'; inUl = false; } }
function closeOl() { if (inOl) { html += '</ol>\n'; inOl = false; } }
function closeTable() { if (inTable) { html += '</table>\n'; inTable = false; } }

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatInline(text) {
  // 粗体
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 行内代码
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // ★▲ 标记
  text = text.replace(/★/g, '<span class="tag">★高频</span>');
  text = text.replace(/▲/g, '<span class="tag orange">▲难点</span>');
  return text;
}
