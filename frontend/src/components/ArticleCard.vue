<template>
  <div class="article-card-outer">
    <div v-if="showAdmin && auth.isAdmin && detailRoute" class="card-admin" @click.stop>
      <RouterLink :to="editLink" class="card-admin-link">
        Редактировать
      </RouterLink>
      <button type="button" class="card-admin-del" @click="confirmDelete">Удалить</button>
    </div>

    <component :is="linkComponent" v-bind="linkBindings" class="article-card-link">
      <article class="article-card" :class="cardClass">
        <h2 class="card-title">{{ item.title }}</h2>
        <p class="card-meta">
          <span class="card-date">
            {{ formatDate(item.published_at) }}
            <span class="card-time">{{ formatTime(item.published_at) }}</span>
          </span>
          <span class="card-comments">{{ commentCountLabel(item.comment_count) }}</span>
        </p>
        <div class="card-image-wrap">
          <img :src="imageUrl(item.image_path)" :alt="item.title" class="card-image" />
          <div class="card-overlay">
            <p class="card-excerpt">{{ truncate(item.content) }}</p>
          </div>
        </div>
      </article>
    </component>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { imageUrl } from '../api/client.js';
import { truncate, formatDate, formatTime, commentCountLabel } from '../utils/text.js';
import { api } from '../api/client.js';

const props = defineProps({
  item: { type: Object, required: true },
  /** Имя маршрута карточки (например news-detail) — вся карточка ведёт на материал */
  detailRoute: { type: String, default: null },
  /** Показать полосу «Редактировать / Удалить» для админа (только при detailRoute для новостей) */
  showAdmin: { type: Boolean, default: false },
  /** Модификаторы сетки: hero | duo | quad | default */
  variant: { type: String, default: 'default' },
});

const emit = defineEmits(['deleted']);

const auth = useAuthStore();

const cardClass = computed(() => {
  const v = props.variant;
  if (v && v !== 'default') return `is-${v}`;
  return '';
});

const linkComponent = computed(() => (props.detailRoute ? RouterLink : 'div'));

const linkBindings = computed(() => {
  if (!props.detailRoute) return {};
  return { to: { name: props.detailRoute, params: { id: props.item.id } } };
});

const editLink = computed(() => {
  if (props.detailRoute === 'news-detail') {
    return { name: 'news-edit', params: { id: props.item.id } };
  }
  return { name: props.detailRoute, params: { id: props.item.id } };
});

async function confirmDelete() {
  if (!window.confirm('Удалить эту новость?')) return;
  try {
    await api(`/api/news/${props.item.id}`, { method: 'DELETE' });
    emit('deleted');
  } catch (e) {
    window.alert(e.message || 'Не удалось удалить');
  }
}
</script>

<style scoped>
.article-card-outer {
  margin-bottom: 1.5rem;
}

.news-mosaic .article-card-outer {
  margin-bottom: 0;
}

.card-admin {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.35rem 0 0.5rem;
  font-size: 0.85rem;
}

.card-admin-link {
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}

.card-admin-link:hover {
  text-decoration: underline;
}

.card-admin-del {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-weight: 600;
  color: #a33;
  cursor: pointer;
}

.card-admin-del:hover {
  text-decoration: underline;
}

.article-card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.article-card-link:hover {
  text-decoration: none;
}

.article-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  overflow: hidden;
  height: 100%;
}

.card-title {
  font-family: var(--font-headline);
  font-size: 1.35rem;
  padding: 1rem 1rem 0.25rem;
  line-height: 1.3;
}

.article-card.is-hero .card-title {
  font-size: clamp(1.5rem, 2.5vw, 2rem);
}

.article-card.is-duo .card-title {
  font-size: 1.2rem;
}

.article-card.is-quad .card-title {
  font-size: 1.05rem;
  padding: 0.65rem 0.75rem 0.2rem;
}

.article-card.is-quad .card-meta {
  padding: 0 0.75rem 0.5rem;
  font-size: 0.8rem;
}

.article-card.is-quad .card-comments {
  font-size: 0.75rem;
}

.article-card.is-quad .card-image-wrap {
  aspect-ratio: 4 / 3;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem 0.75rem;
  padding: 0 1rem 0.75rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.card-date {
  flex: 1 1 auto;
  min-width: 0;
}

.card-comments {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--accent);
  font-size: 0.8rem;
}

.card-time {
  margin-left: 0.35rem;
  font-variant-numeric: tabular-nums;
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

.article-card.is-quad .card-excerpt {
  font-size: 0.82rem;
}

.article-card-link:hover .card-image,
.article-card-outer:has(.article-card-link:hover) .card-image {
  transform: scale(1.03);
}

.article-card-link:hover .card-overlay,
.article-card-outer:has(.article-card-link:hover) .card-overlay {
  background: rgba(0, 0, 0, 0.55);
}

.article-card-link:hover .card-excerpt,
.article-card-outer:has(.article-card-link:hover) .card-excerpt {
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
