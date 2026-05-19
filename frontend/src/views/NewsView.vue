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
    <template v-else>
      <ArticleCard v-for="item in items" :key="item.id" :item="item" />
    </template>

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
</style>
