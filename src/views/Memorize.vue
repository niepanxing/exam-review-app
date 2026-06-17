<template>
  <div class="memorize-page">
    <div class="config-bar" v-if="!started">
      <h2>📖 背题模式</h2>
      <p class="page-desc">直接看题目 + 答案 + 解析，像翻卡片一样快速过一遍</p>
      <div class="config-form">
        <el-form :model="config" label-position="top">
          <el-form-item label="选择题库">
            <el-radio-group v-model="config.bank">
              <el-radio-button value="">全部题库</el-radio-button>
              <el-radio-button v-for="b in bankIndex" :key="b.name" :value="b.name">{{ b.name }} ({{ b.total }})</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="题目范围">
            <el-radio-group v-model="config.scope">
              <el-radio-button value="all">全部题目</el-radio-button>
              <el-radio-button value="type">按题型</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="题型筛选" v-if="config.scope === 'type'">
            <el-checkbox-group v-model="config.types">
              <el-checkbox value="single">单选题</el-checkbox>
              <el-checkbox value="multiple">多选题</el-checkbox>
              <el-checkbox value="judge">判断题</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="题目顺序">
            <el-radio-group v-model="config.order">
              <el-radio-button value="random">随机</el-radio-button>
              <el-radio-button value="seq">顺序</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="题目数量">
            <el-slider v-model="config.limit" :min="5" :max="100" :step="5" show-input />
          </el-form-item>
        </el-form>
        <el-button type="primary" size="large" class="start-btn" :loading="loading" @click="startMemorize">开始背题</el-button>
      </div>
    </div>

    <div class="memorize-main" v-if="started">
      <!-- 固定顶部 -->
      <div class="sticky-bar">
        <div class="sticky-top">
          <el-progress :percentage="progress" :stroke-width="8" :color="'#6366f1'" style="flex:1" />
          <span class="progress-text">{{ currentIndex + 1 }} / {{ questions.length }}</span>
          <div class="sticky-nav-btns">
            <el-button size="small" @click="prevQ" :disabled="currentIndex === 0"><el-icon><ArrowLeft /></el-icon></el-button>
            <el-button size="small" @click="nextQ" :disabled="currentIndex >= questions.length - 1"><el-icon><ArrowRight /></el-icon></el-button>
          </div>
        </div>
        <div class="sticky-dots">
          <div class="nav-dot" v-for="(q, i) in questions" :key="q.id"
            :class="{ active: i === currentIndex, marked: markedSet.has(q.id) }"
            @click="goToQ(i)">{{ i + 1 }}</div>
        </div>
      </div>

      <!-- 卡片 -->
      <div class="memorize-card" v-if="currentQ">
        <div class="card-meta">
          <el-tag :type="typeTagMap[currentQ.type]" size="small">{{ typeLabelMap[currentQ.type] }}</el-tag>
          <el-tag :type="diffTagMap[currentQ.difficulty]" size="small" v-if="currentQ.difficulty">{{ '⭐'.repeat(currentQ.difficulty) }}</el-tag>
          <span class="source-page" v-if="currentQ.sourcePage">📍 {{ currentQ.sourceDoc }} 第{{ currentQ.sourcePage }}页</span>
        </div>
        <div class="card-question">{{ currentQ.question }}</div>

        <div class="card-options" v-if="currentQ.type !== 'judge'">
          <div v-for="(opt, i) in currentQ.options" :key="i" class="card-option" :class="{ correct: isCorrectOption(opt) }">
            <span v-if="isCorrectOption(opt)" class="option-marker correct">✓</span>
            <span class="option-text">{{ opt }}</span>
          </div>
        </div>

        <div class="card-judge" v-if="currentQ.type === 'judge'">
          <div class="judge-answer" :class="{ positive: currentQ.answer, negative: !currentQ.answer }">
            {{ currentQ.answer ? '✅ 正确' : '❌ 错误' }}
          </div>
        </div>

        <div class="card-answer" v-if="currentQ.type !== 'judge'">正确答案：<strong>{{ formatAnswer(currentQ) }}</strong></div>

        <div class="card-explanation" v-if="showAnswer">
          <div class="exp-section" v-if="currentQ.explanation?.mainExp"><h4>💡 详细解析</h4><p>{{ currentQ.explanation.mainExp }}</p></div>
          <div class="exp-section" v-if="currentQ.explanation?.terms?.length">
            <h4>📖 术语解释</h4>
            <div class="term-item" v-for="(t, i) in currentQ.explanation.terms" :key="i">
              <div class="term-name">{{ t.term }}</div><div class="term-def">{{ t.definition }}</div>
            </div>
          </div>
          <div class="exp-section" v-if="currentQ.explanation?.relatedPoints?.length">
            <h4>🔗 关联知识点</h4>
            <div class="related-tags"><el-tag v-for="(p, i) in currentQ.explanation.relatedPoints" :key="i" size="small" type="info">{{ p }}</el-tag></div>
          </div>
          <div class="exp-section" v-if="currentQ.explanation?.funTip">
            <h4>🎯 记忆技巧</h4><div class="fun-tip">{{ currentQ.explanation.funTip }}</div>
          </div>
        </div>

        <div class="card-actions">
          <el-button @click="toggleAnswer">{{ showAnswer ? '收起解析 ▲' : '查看解析 ▼' }}</el-button>
          <el-button :type="marked ? 'danger' : 'default'" @click="markDifficulty">{{ marked ? '已标记 ★' : '标记难' }}</el-button>
          <el-button type="primary" @click="nextQ" v-if="currentIndex < questions.length - 1">下一题 <el-icon><ArrowRight /></el-icon></el-button>
          <el-button type="success" @click="finishMemorize" v-else>完成 🏁</el-button>
        </div>
      </div>
    </div>

    <div class="finish-page" v-if="finished">
      <h2>🎉 背题完成！</h2>
      <p>一共过了 {{ questions.length }} 道题</p>
      <p v-if="markedSet.size > 0">其中 {{ markedSet.size }} 道打了"标记难"</p>
      <div class="finish-actions">
        <el-button type="primary" @click="restart">再来一轮</el-button>
        <el-button @click="$router.push('/practice')">去做题</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { useQuestionStore } from '../stores/questions.js'
import { ElMessage } from 'element-plus'

const store = useQuestionStore()
const bankIndex = computed(() => store.bankIndex || [])
const started = ref(false); const finished = ref(false); const loading = ref(false)
const questions = ref([]); const currentIndex = ref(0); const showAnswer = ref(false)
const markedSet = ref(new Set())
const config = reactive({ bank: '', scope: 'all', types: ['single', 'multiple', 'judge'], order: 'random', limit: 20 })
const typeTagMap = { single: '', multiple: 'warning', judge: 'success' }
const typeLabelMap = { single: '单选', multiple: '多选', judge: '判断' }
const diffTagMap = { 1: 'success', 2: 'warning', 3: 'danger' }

const currentQ = computed(() => questions.value[currentIndex.value])
const progress = computed(() => questions.value.length ? Math.round(((currentIndex.value + 1) / questions.value.length) * 100) : 0)
const marked = computed(() => currentQ.value ? markedSet.value.has(currentQ.value.id) : false)

function formatAnswer(q) { return q.type === 'single' ? q.answer : q.answer.join(', ') }
function isCorrectOption(opt) {
  if (!currentQ.value) return false
  const l = opt.charAt(0)
  return currentQ.value.type === 'single' ? l === currentQ.value.answer : currentQ.value.answer.includes(l)
}
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

async function startMemorize() {
  loading.value = true
  try {
    const params = { random: config.order === 'random' ? 'true' : 'false', limit: config.limit }
    if (config.bank) params.bank = config.bank
    if (config.scope === 'type') {
      let all = []
      for (const type of config.types) { const res = await store.fetchQuestions({ ...params, type }); all = all.concat(res) }
      questions.value = all.sort(() => Math.random() - 0.5).slice(0, config.limit)
    } else { questions.value = await store.fetchQuestions(params) }
    if (!questions.value.length) { ElMessage.warning('没有符合条件的题目'); loading.value = false; return }
    currentIndex.value = 0; showAnswer.value = false; markedSet.value = new Set()
    started.value = true; finished.value = false; nextTick(scrollToTop)
  } catch { ElMessage.error('获取题目失败') } finally { loading.value = false }
}

function toggleAnswer() { showAnswer.value = !showAnswer.value }
function markDifficulty() {
  if (!currentQ.value) return
  if (markedSet.value.has(currentQ.value.id)) markedSet.value.delete(currentQ.value.id)
  else markedSet.value.add(currentQ.value.id)
}
function nextQ() { if (currentIndex.value < questions.value.length - 1) { currentIndex.value++; showAnswer.value = false; nextTick(scrollToTop) } }
function prevQ() { if (currentIndex.value > 0) { currentIndex.value--; showAnswer.value = false; nextTick(scrollToTop) } }
function goToQ(i) { currentIndex.value = i; showAnswer.value = false; nextTick(scrollToTop) }
function finishMemorize() { finished.value = true }
function restart() { started.value = false; finished.value = false }
</script>

<style scoped>
.memorize-page { max-width: 800px; }
.memorize-page h2 { font-size: 22px; margin-bottom: 6px; }
.page-desc { color: var(--text-muted); margin-bottom: 24px; }
.config-form { max-width: 500px; }
.start-btn { margin-top: 16px; width: 200px; height: 44px; font-size: 16px; }

.sticky-bar {
  position: sticky; top: 0; z-index: 50;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 14px 18px; margin-bottom: 20px;
}
.sticky-top { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.progress-text { font-size: 14px; color: var(--text-secondary); white-space: nowrap; }
.sticky-nav-btns { display: flex; gap: 6px; flex-shrink: 0; }
.sticky-dots { display: flex; flex-wrap: wrap; gap: 4px; max-height: 80px; overflow-y: auto; }
.nav-dot {
  min-width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 6px; font-size: 11px; background: var(--bg-dark); color: var(--text-muted);
  cursor: pointer; transition: all 0.15s; padding: 0 4px;
}
.nav-dot.active { background: var(--primary); color: #fff; }
.nav-dot.marked { background: rgba(239,68,68,0.2); color: var(--danger); }

.memorize-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 28px;
}
.card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.source-page { font-size: 12px; color: var(--text-muted); }
.card-question { font-size: 18px; line-height: 1.8; font-weight: 600; margin-bottom: 20px; }
.card-options { margin-bottom: 16px; }
.card-option { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 6px; background: var(--bg-dark); border-radius: 8px; }
.card-option.correct { background: rgba(34,197,94,0.08); }
.option-marker { font-weight: 700; font-size: 16px; }
.option-marker.correct { color: var(--success); }
.option-text { font-size: 14px; }
.card-judge { margin-bottom: 16px; }
.judge-answer { font-size: 20px; font-weight: 700; padding: 12px; border-radius: 8px; text-align: center; }
.judge-answer.positive { color: var(--success); background: rgba(34,197,94,0.1); }
.judge-answer.negative { color: var(--danger); background: rgba(239,68,68,0.1); }
.card-answer { font-size: 15px; color: var(--success); margin-bottom: 12px; padding: 10px 14px; background: rgba(34,197,94,0.08); border-radius: 8px; }
.card-explanation { margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 20px; }
.exp-section { margin-bottom: 18px; }
.exp-section h4 { font-size: 15px; color: var(--primary-light); margin-bottom: 8px; }
.exp-section p { font-size: 15px; line-height: 1.9; }
.term-item { padding: 10px 14px; background: rgba(99,102,241,0.08); border-radius: 8px; margin-bottom: 6px; }
.term-name { font-weight: 600; color: var(--primary-light); margin-bottom: 4px; }
.term-def { font-size: 14px; line-height: 1.6; }
.related-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.fun-tip { padding: 12px 16px; background: rgba(245,158,11,0.1); border-left: 3px solid var(--warning); border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.7; }
.card-actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }

.finish-page { text-align: center; padding: 60px 20px; }
.finish-page h2 { font-size: 28px; margin-bottom: 16px; }
.finish-page p { color: var(--text-secondary); margin-bottom: 8px; }
.finish-actions { margin-top: 24px; display: flex; justify-content: center; gap: 12px; }
</style>
