<template>
  <div class="knowledge-page">
    <!-- 模块列表视图 -->
    <template v-if="!activeModule">
      <div class="page-header">
        <h1>📚 知识点复习</h1>
        <p class="page-desc">考前速览，核心知识点一网打尽</p>
      </div>
      <div class="module-grid">
        <div
          v-for="mod in modules"
          :key="mod.id"
          class="module-card"
          @click="activeModule = mod"
        >
          <div class="module-icon" :style="{ background: mod.color + '18', color: mod.color }">
            {{ mod.icon }}
          </div>
          <div class="module-info">
            <div class="module-title">{{ mod.title }}</div>
            <div class="module-sections">{{ countSections(mod.content) }} 个知识模块</div>
          </div>
          <el-icon class="module-arrow"><ArrowRight /></el-icon>
        </div>
      </div>
    </template>

    <!-- 详情视图 -->
    <template v-else>
      <div class="detail-header">
        <div class="back-btn" @click="activeModule = null">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </div>
        <h2 class="detail-title">{{ activeModule.title }}</h2>
      </div>

      <!-- 快速导航 -->
      <div class="section-nav" v-if="sectionHeaders.length > 1">
        <div
          v-for="(h, i) in sectionHeaders"
          :key="i"
          class="section-nav-item"
          @click="scrollToSection(i)"
        >
          {{ h }}
        </div>
      </div>

      <!-- 知识内容 -->
      <div class="knowledge-content" v-html="activeModule.content"></div>

      <!-- 底部导航 -->
      <div class="bottom-actions" v-if="moduleIndex > 0 || moduleIndex < modules.length - 1">
        <el-button
          v-if="moduleIndex > 0"
          @click="activeModule = modules[moduleIndex - 1]"
        >
          <el-icon><ArrowLeft /></el-icon>
          {{ modules[moduleIndex - 1].title }}
        </el-button>
        <div v-else></div>
        <el-button
          v-if="moduleIndex < modules.length - 1"
          type="primary"
          @click="activeModule = modules[moduleIndex + 1]"
        >
          {{ modules[moduleIndex + 1].title }}
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { knowledgeModules } from '../data/knowledge/index.js'

const modules = knowledgeModules
const activeModule = ref(null)

const moduleIndex = computed(() => {
  if (!activeModule.value) return -1
  return modules.findIndex(m => m.id === activeModule.value.id)
})

// 提取 h2 标题作为快速导航
const sectionHeaders = computed(() => {
  if (!activeModule.value) return []
  const matches = activeModule.value.content.match(/<h2[^>]*>([\s\S]*?)<\/h2>/g)
  if (!matches) return []
  return matches.map(h => h.replace(/<[^>]+>/g, '').replace(/一、|二、|三、|四、|五、|六、|七、|八、|九、|十、/g, ''))
})

function countSections(html) {
  const matches = html.match(/<div class="section">/g)
  return matches ? matches.length : 0
}

function scrollToSection(index) {
  const sections = document.querySelectorAll('.knowledge-content .section')
  if (sections[index]) {
    sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 切换模块时滚动到顶部
watch(activeModule, () => {
  nextTick(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
})
</script>

<style scoped>
.knowledge-page {
  max-width: 960px;
  min-height: calc(100vh - 48px);
}

.page-header { margin-bottom: 28px; }
.page-header h1 { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
.page-desc { color: var(--text-secondary); font-size: 15px; }

/* 模块卡片网格 */
.module-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.module-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}
.module-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.module-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.module-title { font-weight: 600; font-size: 15px; margin-bottom: 3px; }
.module-sections { font-size: 12px; color: var(--text-muted); }
.module-arrow { margin-left: auto; color: var(--text-muted); flex-shrink: 0; }

/* 详情页 */
.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--primary-light);
  cursor: pointer;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.15s;
  flex-shrink: 0;
}
.back-btn:hover { background: var(--bg-card-hover); }
.detail-title {
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 快速导航 */
.section-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
}
.section-nav-item {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 6px;
  background: var(--bg-card-hover, rgba(0,0,0,0.04));
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.section-nav-item:hover {
  background: var(--primary);
  color: #fff;
}

/* 知识内容样式 */
.knowledge-content {
  line-height: 1.8;
  font-size: 15px;
}
.knowledge-content :deep(.section) {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 28px 32px;
  margin-bottom: 20px;
}
.knowledge-content :deep(.section h2) {
  font-size: 20px;
  color: var(--primary-light, #3b7dd8);
  border-left: 4px solid var(--primary-light, #3b7dd8);
  padding-left: 12px;
  margin-bottom: 18px;
}
.knowledge-content :deep(.section h3) {
  font-size: 16px;
  color: var(--text-primary);
  margin: 20px 0 10px;
  font-weight: 600;
}
.knowledge-content :deep(.section p),
.knowledge-content :deep(.section li) {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
}
.knowledge-content :deep(ul),
.knowledge-content :deep(ol) {
  padding-left: 22px;
}
.knowledge-content :deep(li) {
  margin-bottom: 6px;
}
.knowledge-content :deep(.tag) {
  display: inline-block;
  background: rgba(59, 125, 216, 0.1);
  color: var(--primary-light, #3b7dd8);
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 13px;
  margin: 2px 3px 2px 0;
}
.knowledge-content :deep(.tag.orange) {
  background: rgba(230, 81, 0, 0.1);
  color: #e65100;
}
.knowledge-content :deep(code) {
  background: rgba(0,0,0,0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: Consolas, Monaco, 'Courier New', monospace;
}
.knowledge-content :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

/* 底部翻页 */
.bottom-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

/* 手机端适配 */
@media (max-width: 768px) {
  .module-grid {
    grid-template-columns: 1fr;
  }
  .knowledge-content :deep(.section) {
    padding: 20px 16px;
  }
  .knowledge-content :deep(.section h2) {
    font-size: 18px;
  }
  .detail-title {
    font-size: 17px;
  }
  .page-header h1 {
    font-size: 24px;
  }
}
</style>
