<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">🎯 突击复习</div>
        <div class="subtitle">考试出题助手</div>
      </div>
      <el-menu :default-active="currentRoute" @select="handleSelect" class="sidebar-menu">
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/upload">
          <el-icon><UploadFilled /></el-icon>
          <span>上传文档</span>
        </el-menu-item>
        <el-menu-item index="/practice">
          <el-icon><EditPen /></el-icon>
          <span>做题模式</span>
        </el-menu-item>
        <el-menu-item index="/memorize">
          <el-icon><Reading /></el-icon>
          <span>背题模式</span>
        </el-menu-item>
        <el-menu-item index="/exam">
          <el-icon><Document /></el-icon>
          <span>试卷模式</span>
        </el-menu-item>
        <el-menu-item index="/retry">
          <el-icon><RefreshRight /></el-icon>
          <span>错题重做</span>
        </el-menu-item>
        <el-menu-item index="/bank">
          <el-icon><FolderOpened /></el-icon>
          <span>题库管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-footer">
        <div class="theme-toggle" @click="toggleTheme">
          <span class="theme-icon">{{ isDark ? '🌙' : '☀️' }}</span>
          <span class="theme-label">{{ isDark ? '暗色模式' : '亮色模式' }}</span>
          <el-switch :model-value="!isDark" size="small" active-text="" inactive-text="" />
        </div>
        <div class="question-count">
          <el-icon><Document /></el-icon>
          题库: {{ totalQuestions }} 题
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useQuestionStore } from './stores/questions.js'

const router = useRouter()
const route = useRoute()
const store = useQuestionStore()
const totalQuestions = ref(0)

const currentRoute = computed(() => route.path)

// 主题
const isDark = ref(true)

function applyTheme(dark) {
  if (dark) {
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.add('light')
  }
  localStorage.setItem('exam-theme', dark ? 'dark' : 'light')
}

function toggleTheme() {
  isDark.value = !isDark.value
  applyTheme(isDark.value)
}

// 初始化主题
const savedTheme = localStorage.getItem('exam-theme')
if (savedTheme === 'light') {
  isDark.value = false
}
applyTheme(isDark.value)

function handleSelect(index) {
  router.push(index)
}

onMounted(async () => {
  await store.fetchStats()
  totalQuestions.value = store.stats.total
})
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: var(--bg-card);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  transition: background 0.3s, border-color 0.3s;
}

.sidebar-header {
  padding: 24px 20px 16px;
  border-bottom: 1px solid var(--border-color);
}

.logo {
  font-size: 22px;
  font-weight: 700;
  color: var(--primary-light);
  letter-spacing: 1px;
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.sidebar-menu {
  flex: 1;
  padding: 8px;
}

.sidebar-menu .el-menu-item {
  border-radius: 8px;
  margin-bottom: 4px;
  height: 44px;
  line-height: 44px;
}

.sidebar-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-color);
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  user-select: none;
}
.theme-toggle:hover { color: var(--text-primary); }
.theme-icon { font-size: 16px; }
.theme-label { flex: 1; }

.question-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.main-content {
  margin-left: 220px;
  flex: 1;
  padding: 24px;
  min-height: 100vh;
  transition: background 0.3s;
}
</style>
