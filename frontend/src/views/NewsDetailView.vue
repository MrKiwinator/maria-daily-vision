<template>
  <section class="detail-page">
    <p v-if="loading" class="empty-state">Загрузка…</p>
    <p v-else-if="error" class="error-msg">{{ error }}</p>
    <template v-else-if="item">
      <div class="detail-main">
        <div class="detail-head">
          <RouterLink to="/news" class="back-link">← К списку новостей</RouterLink>
          <div v-if="auth.isAdmin" class="admin-actions">
            <RouterLink :to="{ name: 'news-edit', params: { id: item.id } }" class="btn btn-secondary">
              Редактировать
            </RouterLink>
            <button type="button" class="btn btn-danger" :disabled="deleting" @click="onDelete">
              {{ deleting ? 'Удаление…' : 'Удалить' }}
            </button>
          </div>
        </div>
        <article class="detail-article">
          <h1 class="detail-title">{{ item.title }}</h1>
          <p class="detail-meta">
            {{ formatDate(item.published_at) }}
            <span class="detail-time">{{ formatTime(item.published_at) }}</span>
          </p>
          <div class="detail-image-wrap">
            <img :src="imageUrl(item.image_path)" :alt="item.title" class="detail-image" />
          </div>
          <div class="detail-body">{{ item.content }}</div>
        </article>
      </div>

      <section v-if="related.length" class="detail-related" aria-labelledby="related-news-heading">
        <h2 id="related-news-heading" class="related-heading">Последние новости</h2>
        <div class="related-grid">
          <ArticleCard
            v-for="rel in related"
            :key="rel.id"
            :item="rel"
            variant="quad"
            detail-route="news-detail"
          />
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api, imageUrl } from '../api/client.js';
import { formatDate, formatTime } from '../utils/text.js';
import ArticleCard from '../components/ArticleCard.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const item = ref(null);
const related = ref([]);
const loading = ref(true);
const error = ref('');
const deleting = ref(false);

async function loadRelated(excludeId) {
  related.value = [];
  try {
    const params = new URLSearchParams({ page: '1', search: '', date: '' });
    const data = await api(`/api/news?${params}`);
    const list = data.items || [];
    const id = Number(excludeId);
    related.value = list.filter((x) => Number(x.id) !== id).slice(0, 4);
  } catch {
    related.value = [];
  }
}

async function load() {
  loading.value = true;
  error.value = '';
  item.value = null;
  related.value = [];
  try {
    const data = await api(`/api/news/${route.params.id}`);
    item.value = data.item;
    await loadRelated(data.item.id);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function onDelete() {
  if (!item.value || !window.confirm('Удалить эту новость? Это действие нельзя отменить.')) {
    return;
  }
  deleting.value = true;
  try {
    await api(`/api/news/${item.value.id}`, { method: 'DELETE' });
    router.push({ name: 'news' });
  } catch (e) {
    error.value = e.message;
  } finally {
    deleting.value = false;
  }
}

watch(
  () => route.params.id,
  () => load()
);

onMounted(() => load());
</script>

<style scoped>
.detail-page {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

.detail-main {
  max-width: 42rem;
  margin: 0 auto;
}

.detail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back-link {
  color: var(--text-muted);
  font-weight: 600;
}

.back-link:hover {
  color: var(--accent);
}

.admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.detail-title {
  font-family: var(--font-headline);
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  line-height: 1.25;
  margin-bottom: 0.5rem;
}

.detail-meta {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

.detail-time {
  margin-left: 0.35rem;
  font-variant-numeric: tabular-nums;
}

.detail-image-wrap {
  margin-bottom: 1.5rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  overflow: hidden;
  border-radius: 4px;
}

.detail-image {
  width: 100%;
  display: block;
}

.detail-body {
  white-space: pre-wrap;
  font-size: 1.05rem;
  line-height: 1.65;
}

.detail-related {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
  max-width: 100%;
}

.related-heading {
  font-family: var(--font-headline);
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  color: var(--text);
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  align-items: stretch;
}

.related-grid :deep(.article-card-outer) {
  margin-bottom: 0;
}

@media (max-width: 900px) {
  .related-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .related-grid {
    grid-template-columns: 1fr;
  }
}
</style>
