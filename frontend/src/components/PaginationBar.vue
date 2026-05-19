<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="Навигация по страницам">
    <button
      type="button"
      class="page-btn"
      :disabled="page <= 1"
      @click="$emit('change', page - 1)"
    >
      ← Назад
    </button>
    <span class="page-info">{{ page }} / {{ totalPages }}</span>
    <button
      type="button"
      class="page-btn"
      :disabled="page >= totalPages"
      @click="$emit('change', page + 1)"
    >
      Вперёд →
    </button>
  </nav>
</template>

<script setup>
defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
});
defineEmits(['change']);
</script>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 0;
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-weight: 600;
  color: var(--text-muted);
  min-width: 4rem;
  text-align: center;
}
</style>
