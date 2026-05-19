<template>
  <article class="article-card">
    <h2 class="card-title">{{ item.title }}</h2>
    <p class="card-date">{{ formatDate(item.published_at) }}</p>
    <div class="card-image-wrap">
      <img :src="imageUrl(item.image_path)" :alt="item.title" class="card-image" />
      <div class="card-overlay">
        <p class="card-excerpt">{{ truncate(item.content) }}</p>
      </div>
    </div>
  </article>
</template>

<script setup>
import { imageUrl } from '../api/client.js';
import { truncate, formatDate } from '../utils/text.js';

defineProps({
  item: { type: Object, required: true },
});
</script>

<style scoped>
.article-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.card-title {
  font-family: var(--font-headline);
  font-size: 1.35rem;
  padding: 1rem 1rem 0.25rem;
  line-height: 1.3;
}

.card-date {
  padding: 0 1rem 0.75rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.card-image-wrap {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  display: flex;
  align-items: flex-end;
  padding: 1rem;
  transition: background 0.35s ease;
}

.card-excerpt {
  color: #fff;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.35s ease, transform 0.35s ease;
  font-size: 0.95rem;
  line-height: 1.5;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.article-card:hover .card-image {
  transform: scale(1.03);
}

.article-card:hover .card-overlay {
  background: rgba(0, 0, 0, 0.55);
}

.article-card:hover .card-excerpt {
  opacity: 1;
  transform: translateY(0);
}

@media (hover: none) {
  .card-overlay {
    background: rgba(0, 0, 0, 0.45);
  }
  .card-excerpt {
    opacity: 1;
    transform: none;
  }
}
</style>
