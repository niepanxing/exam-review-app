import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/Home.vue'), meta: { title: '首页' } },
  { path: '/upload', name: 'Upload', component: () => import('../views/Upload.vue'), meta: { title: '上传文档' } },
  { path: '/practice', name: 'Practice', component: () => import('../views/Practice.vue'), meta: { title: '做题模式' } },
  { path: '/memorize', name: 'Memorize', component: () => import('../views/Memorize.vue'), meta: { title: '背题模式' } },
  { path: '/exam', name: 'Exam', component: () => import('../views/Exam.vue'), meta: { title: '试卷模式' } },
  { path: '/retry', name: 'WrongRetry', component: () => import('../views/WrongRetry.vue'), meta: { title: '错题重做' } },
  { path: '/bank', name: 'QuestionBank', component: () => import('../views/QuestionBank.vue'), meta: { title: '题库管理' } },
  { path: '/settings', name: 'Settings', component: () => import('../views/Settings.vue'), meta: { title: '设置' } }
]

const router = createRouter({ history: createWebHashHistory(), routes })
export default router
