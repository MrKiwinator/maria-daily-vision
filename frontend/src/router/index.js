import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'news' } },
      { path: 'news', name: 'news', component: () => import('../views/NewsView.vue') },
      {
        path: 'news/new',
        name: 'news-new',
        component: () => import('../views/ArticleEditorView.vue'),
        meta: { admin: true, type: 'news' },
      },
      { path: 'plans', name: 'plans', component: () => import('../views/PlansView.vue') },
      {
        path: 'plans/new',
        name: 'plans-new',
        component: () => import('../views/ArticleEditorView.vue'),
        meta: { admin: true, type: 'plans' },
      },
      { path: 'about', name: 'about', component: () => import('../views/AboutView.vue') },
      {
        path: 'users',
        name: 'users',
        component: () => import('../views/UsersView.vue'),
        meta: { admin: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (auth.token && !auth.user) await auth.fetchMe();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'news' };
  }
  if (to.meta.admin && !auth.isAdmin) {
    return { name: 'news' };
  }
});

export default router;
