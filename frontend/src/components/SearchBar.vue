<template>
  <div class="search-bar">
    <input
      v-model="localSearch"
      type="search"
      placeholder="Поиск по названию…"
      aria-label="Поиск по названию"
      @keyup.enter="apply"
    />
    <input
      v-model="localDate"
      type="date"
      aria-label="Поиск по дате"
      @change="apply"
    />
    <button type="button" class="btn btn-secondary" @click="apply">Найти</button>
    <button v-if="localSearch || localDate" type="button" class="btn-clear" @click="clear">
      Сбросить
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  search: { type: String, default: '' },
  date: { type: String, default: '' },
});
const emit = defineEmits(['search']);

const localSearch = ref(props.search);
const localDate = ref(props.date);

watch(
  () => [props.search, props.date],
  ([s, d]) => {
    localSearch.value = s;
    localDate.value = d;
  }
);

function apply() {
  emit('search', { search: localSearch.value.trim(), date: localDate.value });
}

function clear() {
  localSearch.value = '';
  localDate.value = '';
  emit('search', { search: '', date: '' });
}
</script>

<style scoped>
.search-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}

.search-bar input[type='search'],
.search-bar input[type='date'] {
  flex: 1 1 140px;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
}

.btn-clear {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: underline;
}
</style>
