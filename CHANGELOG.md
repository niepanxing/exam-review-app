---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '395817d0-2241-4700-8b5b-02c01cf6eb1d'
  PropagateID: '395817d0-2241-4700-8b5b-02c01cf6eb1d'
  ReservedCode1: '0f5df9ad-4d35-4460-90de-7f6736ca3fe6'
  ReservedCode2: '0f5df9ad-4d35-4460-90de-7f6736ca3fe6'
---

# Changelog

All notable changes to this project will be documented in this file.

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