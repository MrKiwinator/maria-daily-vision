<template>
  <section class="recent-comments-widget" aria-labelledby="recent-comments-heading">
    <h2 id="recent-comments-heading" class="recent-comments-title">Последние комментарии</h2>
    <p v-if="loading" class="recent-comments-muted">Загрузка…</p>
    <p v-else-if="error" class="recent-comments-muted">Не удалось загрузить</p>
    <ul v-else-if="comments.length" class="recent-comments-list">
      <li v-for="c in comments" :key="c.id" class="recent-comments-item">
        <RouterLink
          :to="{ name: 'news-detail', params: { id: c.news_id }, hash: '#comments' }"
          class="recent-comments-link"
        >
          <span class="recent-comments-news">{{ truncate(c.news_title, 48) }}</span>
          <span class="recent-comments-body">{{ truncate(c.body, 80) }}</span>
          <span class="recent-comments-meta">{{ c.username }} · {{ formatDate(c.created_at) }}</span>
        </RouterLink>
      </li>
    </ul>
    <p v-else class="recent-comments-muted">Комментариев пока нет</p>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api/client.js';
import { formatDate, truncate } from '../utils/text.js';

const comments = ref([]);
const loading = ref(true);
const error = ref(false);

onMounted(async () => {
  try {
    const data = await api('/api/news/comments/recent?limit=8');
    comments.value = data.comments || [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.recent-comments-widget {
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  border-radius: 4px;
  padding: 1rem 1.1rem;
}

.recent-comments-title {
  font-family: var(--font-headline);
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  line-height: 1.25;
}

.recent-comments-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.recent-comments-item {
  border-bottom: 1px solid var(--border);
}

.recent-comments-item:last-child {
  border-bottom: none;
}

.recent-comments-link {
  display: block;
  padding: 0.55rem 0;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}

.recent-comments-link:hover {
  text-decoration: none;
}

.recent-comments-link:hover .recent-comments-news {
  color: var(--accent);
}

.recent-comments-news {
  display: block;
  font-weight: 700;
  font-size: 0.82rem;
  line-height: 1.3;
  margin-bottom: 0.25rem;
  color: var(--text);
}

.recent-comments-body {
  display: block;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text);
  margin-bottom: 0.2rem;
}

.recent-comments-meta {
  display: block;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.recent-comments-muted {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin: 0;
}
</style>
