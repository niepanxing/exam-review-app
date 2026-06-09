---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '42c18e22-debd-4a38-ba76-136e2ac1266e'
  PropagateID: '42c18e22-debd-4a38-ba76-136e2ac1266e'
  ReservedCode1: '0ac371df-6b5d-46bb-a2c7-95967611b28f'
  ReservedCode2: '0ac371df-6b5d-46bb-a2c7-95967611b28f'
---

# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-06-09

### Features
- 试卷模式全新分配：80题按主题分配
  - 研发云 25题 + 智能体 25题 + 产品思维 10题 + 项目管理 10题 + Claude Code 5题 + AI Coding 5题
- 新增2篇文档解析：开源支撑和培训方案.pptx、毛剑-AI Coding.pdf
- 题库扩充至 808 题（新增 293 题，覆盖12篇文档）
- 主题分类匹配：按文档名+题目关键词双重匹配

### Bug Fixes
- 电脑端侧边栏主题切换和题库数量移到header，不再被遮挡
- 手机端解析面板撑宽页面修复（overflow控制+防横滚）

## [1.1.0] - 2026-06-09

### Features
- 手机端底部导航栏（6个快捷入口 + 更多菜单弹窗）
- 全局响应式布局：选项按钮、导航栏、弹窗适配小屏幕
- 题目数据内置：515道题打包进前端，无后端也能刷题
- localStorage 进度存储：做题记录保存在浏览器本地，无需服务器
- 自动后端检测：有后端走 API，没后端自动切换本地数据
- Netlify 部署配置：netlify.toml + SPA 路由重定向
- 分享友好：纯静态部署，别人点链接直接刷题

### Bug Fixes
- Exam.vue startExam 改用 store 获取题目（修复转圈卡住）
- WrongRetry 改用 store 获取错题 + 记录答案
- 所有页面 axios 直接调用改为走 store 统一管理
- Exam.vue resultMap reactive 误用 .value（12处全部修正）
- Exam.vue poolInfo 数据结构与 API 返回不匹配

## [1.0.0] - 2026-06-09

### Features
- Vue 3 + Element Plus 前端，Express 后端
- 文档解析：支持 PDF、Word(.docx)、PPT(.pptx)、Markdown、TXT
- AI 自动出题：DeepSeek API 生成单选/多选/判断题
- 每道题含：来源文档+页码、详细解析、术语解释、关联知识点、记忆技巧
- 批量生成脚本：4路并发，515道题已入库
- 做题模式：选完提交，即时反馈 + 详细解析
- 背题模式：直接阅读题干和答案
- 试卷模式：模拟真实考试（100分制，60分钟，60分及格）
  - 单选50题x1分 + 多选20题x2分 + 判断10题x1分
  - 多选评分：全对+2 / 漏选+1 / 错选-2
- 错题重做：3种模式（全部/随机20/只做多选）
- 暗色/亮色主题切换
- 粘性导航栏 + 题号圆点 + 自动滚顶
- 大按钮选项，单选即时高亮，多选☑/☐切换
- 答案快照模式：切换题目不丢失未提交答案

### Bug Fixes
- 修复判断题答案比对：AI返回boolean `True/False` 与代码比较字符串不匹配
- 修复做题模式答案快照：切换题目时未提交答案丢失
- 修复试卷模式 `resultMap` reactive 对象误用 `.value` 导致渲染崩溃
- 修复试卷模式 `poolInfo` 数据结构与 API 返回不匹配
- 修复配置栏/结果页 v-if 条件冲突导致结果页不显示

> AI生成