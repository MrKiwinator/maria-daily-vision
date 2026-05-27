<template>
  <section class="list-page">
    <div class="page-head">
      <h2 class="page-title">Новости</h2>
      <RouterLink v-if="auth.isAdmin" to="/news/new" class="btn btn-primary">
        + Добавить
      </RouterLink>
    </div>

    <SearchBar :search="search" :date="date" @search="onSearch" />
    <PaginationBar :page="page" :total-pages="totalPages" @change="goPage" />

    <p v-if="loading" class="empty-state">Загрузка…</p>
    <p v-else-if="error" class="error-msg">{{ error }}</p>
    <p v-else-if="!items.length" class="empty-state">Новостей пока нет</p>
    <div v-else class="news-mosaic">
      <ArticleCard
        v-for="(item, index) in items"
        :key="item.id"
        :item="item"
        :variant="cardVariant(index)"
        detail-route="news-detail"
        :show-admin="auth.isAdmin"
        @deleted="onDeleted"
      />
    </div>

    <PaginationBar :page="page" :total-pages="totalPages" @change="goPage" />
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';
import SearchBar from '../components/SearchBar.vue';
import PaginationBar from '../components/PaginationBar.vue';
import ArticleCard from '../components/ArticleCard.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const items = ref([]);
const page = ref(1);
const totalPages = ref(1);
const search = ref('');
const date = ref('');
const loading = ref(false);
const error = ref('');

function cardVariant(index) {
  if (index === 0) return 'hero';
  if (index < 3) return 'duo';
  if (index < 7) return 'quad';
  return 'default';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      search: search.value,
      date: date.value,
    });
    const data = await api(`/api/news?${params}`);
    items.value = data.items;
    page.value = data.page;
    totalPages.value = data.totalPages;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function onDeleted() {
  load();
}

function syncFromRoute() {
  page.value = Number(route.query.page) || 1;
  search.value = (route.query.search || '').toString();
  date.value = (route.query.date || '').toString();
}

function goPage(p) {
  router.push({
    name: 'news',
    query: { ...route.query, page: p > 1 ? p : undefined },
  });
}

function onSearch({ search: s, date: d }) {
  router.push({
    name: 'news',
    query: {
      search: s || undefined,
      date: d || undefined,
      page: undefined,
    },
  });
}

watch(
  () => route.query,
  () => {
    syncFromRoute();
    load();
  }
);

onMounted(() => {
  syncFromRoute();
  load();
});
</script>

<style scoped>
.list-page .page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.page-title {
  font-family: var(--font-headline);
  font-size: 1.75rem;
}

@media (min-width: 1024px) {
  .news-mosaic {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
    align-items: stretch;
  }

  .news-mosaic :deep(.article-card-outer:nth-child(1)) {
    grid-column: 1 / -1;
  }

  .news-mosaic :deep(.article-card-outer:nth-child(2)),
  .news-mosaic :deep(.article-card-outer:nth-child(3)) {
    grid-column: span 2;
  }
}

@media (max-width: 1023px) {
  /* На мобильных карточки идут списком: добавляем небольшой разделитель
     между новостями (вместо "прижатых" карточек друг к другу). */
  .news-mosaic :deep(.article-card-outer) {
    margin-bottom: 0.5rem;
  }

  .news-mosaic :deep(.article-card-outer:last-child) {
    margin-bottom: 0;
  }

  .news-mosaic :deep(.article-card.is-hero .card-title),
  .news-mosaic :deep(.article-card.is-duo .card-title) {
    font-size: 1.35rem;
  }

  .news-mosaic :deep(.article-card.is-quad .card-title) {
    font-size: 1.35rem;
    padding: 1rem 1rem 0.25rem;
  }

  .news-mosaic :deep(.article-card.is-quad .card-date) {
    padding: 0 1rem 0.75rem;
    font-size: 0.85rem;
  }

  .news-mosaic :deep(.article-card.is-quad .card-image-wrap) {
    aspect-ratio: 16 / 10;
  }

  .news-mosaic :deep(.article-card.is-quad .card-excerpt) {
    font-size: 0.95rem;
  }
}
</style>
