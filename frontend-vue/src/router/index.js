import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/Home.vue'), meta: { title: '2026年会作品投票' } },
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { title: '登录' } },
  { path: '/upload', name: 'Upload', component: () => import('../views/Upload.vue'), meta: { title: '上传作品', auth: true } },
  { path: '/vote-result', name: 'VoteResult', component: () => import('../views/VoteResult.vue'), meta: { title: '投票结果' } },
  { path: '/screen', name: 'Screen', component: () => import('../views/Screen.vue'), meta: { title: '大屏展示' } },
  { path: '/multi-screen', name: 'MultiScreen', component: () => import('../views/MultiScreen.vue'), meta: { title: '多屏播放' } },
  { path: '/admin', name: 'Admin', component: () => import('../views/Admin.vue'), meta: { title: '管理员控制台', admin: true } },
  { path: '/score', name: 'Score', component: () => import('../views/Score.vue'), meta: { title: '评委控制台', auth: true } },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title}` : '2026年会作品投票';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (to.meta.auth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }
  next();
});

export default router;
