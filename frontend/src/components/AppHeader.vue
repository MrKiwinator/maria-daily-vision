<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink to="/news" class="masthead">
        <h1 class="masthead-title">Maria Daily Vision</h1>
      </RouterLink>
      <p v-if="tagline" class="tagline">{{ tagline }}</p>
      <nav class="main-nav">
        <RouterLink to="/about">О Марии</RouterLink>
        <RouterLink to="/news">Новости</RouterLink>
        <RouterLink to="/plans">Планы</RouterLink>
        <RouterLink v-if="auth.isAdmin" to="/users">Пользователи</RouterLink>
        <button type="button" class="nav-logout" @click="onLogout">Выход</button>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';

const auth = useAuthStore();
const router = useRouter();
const tagline = ref('');

onMounted(async () => {
  try {
    const data = await api('/api/settings/tagline');
    tagline.value = data.tagline;
  } catch {
    tagline.value = 'Ежедневные новости и планы из жизни Марии';
  }
});

function onLogout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<style scoped>
.site-header {
  border-bottom: 3px double var(--border);
  background: var(--bg-card);
  padding: 1.25rem 0 0.75rem;
  margin-bottom: 1.5rem;
}

.header-inner {
  text-align: center;
}

.masthead {
  text-decoration: none;
  color: inherit;
}

.masthead:hover {
  text-decoration: none;
}

.masthead-title {
  font-family: var(--font-headline);
  font-size: clamp(2rem, 6vw, 3.25rem);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.1;
  text-transform: uppercase;
  border-bottom: 1px solid var(--text);
  display: inline-block;
  padding-bottom: 0.25rem;
}

.tagline {
  margin: 0.75rem auto 1rem;
  max-width: 36em;
  font-size: 0.95rem;
  color: var(--text-muted);
  font-style: italic;
}

.main-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1.25rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--border);
}

.main-nav a {
  color: var(--text);
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  padding: 0.25rem 0;
  border-bottom: 2px solid transparent;
}

.main-nav a.router-link-active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.nav-logout {
  background: none;
  border: none;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.25rem 0;
}

.nav-logout:hover {
  color: var(--accent);
}
</style>
