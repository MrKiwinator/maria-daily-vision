<template>
  <div class="app-shell">
    <AppHeader />
    <main class="container main-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import AppHeader from '../components/AppHeader.vue';
import { RouterView } from 'vue-router';
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.main-content {
  min-height: 50vh;
}
</style>
