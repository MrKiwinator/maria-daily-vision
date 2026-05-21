<template>
  <div class="app-shell">
    <AppHeader />
    <main class="container page-layout">
      <div class="page-main">
        <RouterView />
      </div>
      <aside class="page-sidebar" aria-label="Последние изменения">
        <LastUpdatesWidget />
      </aside>
    </main>
  </div>
</template>

<script setup>
import AppHeader from '../components/AppHeader.vue';
import LastUpdatesWidget from '../components/LastUpdatesWidget.vue';
import { RouterView } from 'vue-router';
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.page-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 50vh;
}

.page-main {
  flex: 1;
  min-width: 0;
}

.page-sidebar {
  flex-shrink: 0;
}

@media (min-width: 1100px) {
  .page-layout {
    flex-direction: row;
    align-items: flex-start;
    gap: 1.75rem;
  }

  .page-sidebar {
    width: 240px;
    position: sticky;
    top: 1rem;
  }
}
</style>
