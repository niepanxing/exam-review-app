<template>
  <div class="app-layout">
    <!-- 侧边栏（桌面端） -->
    <aside class="sidebar desktop-only">
      <div class="sidebar-header">
        <div class="logo">🎯 突击复习</div>
        <div class="subtitle">考试出题助手</div>
        <div class="header-info">
          <div class="theme-toggle" @click="toggleTheme">
            <span class="theme-icon">{{ isDark ? '🌙' : '☀️' }}</span>
            <span class="theme-label">{{ isDark ? '暗色' : '亮色' }}</span>
            <el-switch :model-value="!isDark" size="small" active-text="" inactive-text="" />
          </div>
          <div class="question-count">
            <el-icon><Document /></el-icon>
            {{ totalQuestions }} 题
          </div>
        </div>
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
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部导航栏（手机端） -->
    <nav class="bottom-nav mobile-only">
      <div class="nav-item" :class="{ active: currentRoute === '/' }" @click="handleSelect('/')">
        <el-icon><HomeFilled /></el-icon>
        <span>首页</span>
      </div>
      <div class="nav-item" :class="{ active: currentRoute === '/practice' }" @click="handleSelect('/practice')">
        <el-icon><EditPen /></el-icon>
        <span>做题</span>
      </div>
      <div class="nav-item" :class="{ active: currentRoute === '/memorize' }" @click="handleSelect('/memorize')">
        <el-icon><Reading /></el-icon>
        <span>背题</span>
      </div>
      <div class="nav-item" :class="{ active: currentRoute === '/exam' }" @click="handleSelect('/exam')">
        <el-icon><Document /></el-icon>
        <span>考试</span>
      </div>
      <div class="nav-item" :class="{ active: currentRoute === '/retry' }" @click="handleSelect('/retry')">
        <el-icon><RefreshRight /></el-icon>
        <span>错题</span>
      </div>
      <div class="nav-item" :class="{ active: ['/bank', '/settings', '/upload'].includes(currentRoute) }" @click="showMoreMenu = true">
        <el-icon><More /></el-icon>
        <span>更多</span>
      </div>
    </nav>

    <!-- 更多菜单（手机端弹出） -->
    <div class="more-overlay" v-if="showMoreMenu" @click="showMoreMenu = false">
      <div class="more-menu" @click.stop>
        <div class="more-menu-item" @click="handleSelect('/upload'); showMoreMenu = false">
          <el-icon><UploadFilled /></el-icon><span>上传文档</span>
        </div>
        <div class="more-menu-item" @click="handleSelect('/bank'); showMoreMenu = false">
          <el-icon><FolderOpened /></el-icon><span>题库管理</span>
        </div>
        <div class="more-menu-item" @click="handleSelect('/settings'); showMoreMenu = false">
          <el-icon><Setting /></el-icon><span>设置</span>
        </div>
        <div class="more-menu-item" @click="toggleTheme">
          <span class="theme-icon">{{ isDark ? '🌙' : '☀️' }}</span>
          <span>{{ isDark ? '亮色模式' : '暗色模式' }}</span>
        </div>
      </div>
    </div>
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
const showMoreMenu = ref(false)

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

.desktop-only { display: flex; }
.mobile-only { display: none; }

/* ===== 侧边栏（桌面端） ===== */
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
  padding: 20px 20px 14px;
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
  margin-top: 2px;
}

.header-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  user-select: none;
}
.theme-toggle:hover { color: var(--text-primary); }
.theme-icon { font-size: 14px; }
.theme-label { flex: 1; }

.question-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.sidebar-menu {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.sidebar-menu .el-menu-item {
  border-radius: 8px;
  margin-bottom: 4px;
  height: 44px;
  line-height: 44px;
}

.main-content {
  margin-left: 220px;
  flex: 1;
  padding: 24px;
  min-height: 100vh;
  transition: background 0.3s;
}

/* ===== 底部导航（手机端） ===== */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  display: flex;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.nav-item .el-icon { font-size: 20px; }
.nav-item.active { color: var(--primary-light); }

/* 更多菜单弹出层 */
.more-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 68px;
}

.more-menu {
  background: var(--bg-card);
  border-radius: 16px 16px 0 0;
  width: 100%;
  max-width: 400px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: env(safe-area-inset-bottom, 0);
}

.more-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 15px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.more-menu-item:hover { background: var(--bg-card-hover); }
.more-menu-item .el-icon { font-size: 20px; }
.more-menu-item .theme-icon { font-size: 20px; }

/* ===== 响应式：手机端 ===== */
@media (max-width: 768px) {
  .desktop-only { display: none !important; }
  .mobile-only { display: flex !important; }

  .main-content {
    margin-left: 0;
    padding: 16px 12px 80px 12px;
  }
}
</style>
