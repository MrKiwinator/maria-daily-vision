<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink to="/news" class="masthead">
        <h1 class="masthead-title">Maria Daily Vision</h1>
      </RouterLink>
      <p v-if="tagline" class="tagline">{{ tagline }}</p>

      <button
        type="button"
        class="burger"
        :aria-expanded="menuOpen"
        aria-controls="main-nav-panel"
        @click="menuOpen = !menuOpen"
      >
        <span class="burger-lines" aria-hidden="true" />
        <span class="burger-label">{{ menuOpen ? 'Закрыть' : 'Меню' }}</span>
      </button>

      <div
        id="main-nav-panel"
        class="nav-panel"
        :class="{ 'nav-panel--open': menuOpen }"
      >
        <nav class="main-nav" aria-label="Основное меню">
          <RouterLink to="/about" @click="closeMenu">О Марии</RouterLink>
          <RouterLink to="/news" @click="closeMenu">Новости</RouterLink>
          <RouterLink v-if="auth.isAdmin" to="/users" @click="closeMenu">
            Пользователи
          </RouterLink>
          <button type="button" class="nav-logout" @click="onLogout">Выход</button>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const tagline = ref('');
const menuOpen = ref(false);

function closeMenu() {
  menuOpen.value = false;
}

watch(
  () => route.fullPath,
  () => {
    closeMenu();
  }
);

onMounted(async () => {
  try {
    const data = await api('/api/settings/tagline');
    tagline.value = data.tagline;
  } catch {
    tagline.value = 'Ежедневные новости и планы из жизни Марии';
  }
});

function onLogout() {
  closeMenu();
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
  position: relative;
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

.burger {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0.5rem auto 0.5rem;
  padding: 0.5rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  cursor: pointer;
  font-weight: 600;
  color: var(--text);
}

.burger-label {
  font-size: 0.9rem;
}

.burger-lines {
  display: block;
  width: 1.25rem;
  height: 2px;
  background: var(--text);
  box-shadow:
    0 -6px 0 var(--text),
    0 6px 0 var(--text);
  position: relative;
}

.nav-panel {
  border-top: 1px solid var(--border);
}

.main-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1.25rem;
  padding: 0.75rem 0;
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

@media (max-width: 767px) {
  .burger {
    display: inline-flex;
  }

  .nav-panel {
    display: none;
    padding: 0 0 0.5rem;
  }

  .nav-panel--open {
    display: block;
  }

  .main-nav {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0.5rem 0 0;
  }

  .main-nav a,
  .main-nav .nav-logout {
    display: block;
    padding: 0.65rem 0.5rem;
    border-bottom: 1px solid var(--border);
    text-align: center;
  }

  .main-nav a.router-link-active {
    border-bottom-color: var(--border);
    background: rgba(122, 32, 56, 0.06);
  }
}
</style>
