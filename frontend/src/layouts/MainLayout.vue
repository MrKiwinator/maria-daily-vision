<template>
  <div class="app-shell">
    <AppHeader />
    <div class="page-wrap" :class="{ 'page-wrap--wide': isWidePage }">
      <main class="page-main">
        <RouterView />
      </main>
      <aside class="sidebar-aside" aria-label="Боковая панель">
        <LastUpdatesWidget />
        <RecentNewsCommentsWidget class="sidebar-comments" />
      </aside>
    </div>
  </div>
</template>

<script setup>
import AppHeader from '../components/AppHeader.vue';
import LastUpdatesWidget from '../components/LastUpdatesWidget.vue';
import RecentNewsCommentsWidget from '../components/RecentNewsCommentsWidget.vue';
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';

const route = useRoute();
const isWidePage = computed(() => !!route.meta.wide);
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}

/* Область контента — сетка страницы не затрагивает карточку справа */
.page-wrap {
  position: relative;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1rem 2rem;
  min-height: 50vh;
}

.page-main {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
}

/* Мобильные и планшеты: под контентом страницы (новости, пагинация и т.д.) */
.sidebar-aside {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: static;
  width: 100%;
  max-width: 400px;
  margin: 2rem auto 0;
}

.sidebar-comments {
  display: none;
}

@media (min-width: 768px) {
  .page-wrap {
    max-width: 900px;
    padding: 0 1.5rem 3rem;
  }
}

@media (min-width: 1024px) {
  .page-wrap {
    max-width: 1040px;
  }
}

.page-wrap--wide {
  max-width: min(1400px, calc(100vw - 2rem));
}

@media (min-width: 1320px) {
  .page-wrap--wide {
    max-width: 1400px;
  }

  .sidebar-aside {
    position: absolute;
    left: calc(100% + 1.25rem);
    top: 0;
    width: 240px;
    max-width: none;
    margin: 0;
    z-index: 5;
  }

  .sidebar-comments {
    display: block;
  }
}
</style>
