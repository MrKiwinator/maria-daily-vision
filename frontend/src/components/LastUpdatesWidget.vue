<template>
  <RouterLink :to="{ name: 'last-updates' }" class="updates-widget">
    <h2 class="updates-widget-title">Последние изменения</h2>
    <p v-if="loading" class="updates-widget-muted">Загрузка…</p>
    <p v-else-if="error" class="updates-widget-muted">Не удалось загрузить</p>
    <ul v-else-if="items.length" class="updates-widget-list">
      <li v-for="item in items" :key="item.id" class="updates-widget-item">
        <time class="updates-widget-date" :datetime="item.created_at">
          {{ formatDate(item.created_at) }}
        </time>
        <span class="updates-widget-text">{{ truncate(item.body, 72) }}</span>
      </li>
    </ul>
    <p v-else class="updates-widget-muted">Пока нет записей</p>
    <span class="updates-widget-more">Все изменения →</span>
  </RouterLink>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api/client.js';
import { formatDate, truncate } from '../utils/text.js';

const items = ref([]);
const loading = ref(true);
const error = ref(false);

onMounted(async () => {
  try {
    const data = await api('/api/last-updates?limit=4');
    items.value = data.items || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.updates-widget {
  display: block;
  text-decoration: none;
  color: inherit;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  border-radius: 4px;
  padding: 1rem 1.1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.updates-widget:hover {
  text-decoration: none;
  border-color: var(--accent);
  box-shadow: 0 4px 16px rgba(122, 32, 56, 0.12);
}

.updates-widget-title {
  font-family: var(--font-headline);
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  line-height: 1.25;
  color: var(--text);
}

.updates-widget-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.updates-widget-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.updates-widget-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.updates-widget-date {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.2rem;
}

.updates-widget-text {
  display: block;
  font-size: 0.88rem;
  line-height: 1.4;
  color: var(--text);
}

.updates-widget-muted {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin: 0;
}

.updates-widget-more {
  display: block;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent);
}
</style>
