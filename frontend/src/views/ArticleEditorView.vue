<template>
  <section class="editor-page">
    <h2 class="page-title">{{ isNews ? 'Новости' : 'Планы' }} / Новая</h2>

    <!-- Шаг 1: редактирование -->
    <template v-if="step === 'edit'">
      <form class="editor-form" @submit.prevent="goPreview">
        <div class="form-group">
          <label>Изображение *</label>
          <input type="file" accept="image/*" required @change="onImageChange" />
          <p v-if="!imageFile && !imagePreview" class="hint">Обязательное поле</p>
        </div>
        <div class="form-group">
          <label>Название</label>
          <input v-model="title" type="text" required maxlength="200" />
        </div>
        <div class="form-group">
          <label>Текст статьи</label>
          <textarea v-model="content" required rows="8" />
        </div>
        <div class="form-group">
          <label>Дата публикации</label>
          <input v-model="publishedAt" type="date" />
        </div>

        <h3 class="preview-label">Превью карточки</h3>
        <ArticleCard
          v-if="canPreview"
          :item="previewItem"
          class="editor-preview-card"
        />

        <button type="submit" class="btn btn-primary btn-next" :disabled="!canPreview">
          Следующий шаг
        </button>
      </form>
    </template>

    <!-- Шаг 2: финальное превью -->
    <template v-else>
      <p class="step-hint">Так новость будет выглядеть на сайте:</p>
      <ArticleCard :item="previewItem" />
      <div class="step-actions">
        <button type="button" class="btn btn-secondary" @click="step = 'edit'">
          Редактировать
        </button>
        <button type="button" class="btn btn-primary" :disabled="publishing" @click="publish">
          {{ publishing ? 'Публикация…' : 'Опубликовать' }}
        </button>
      </div>
      <p v-if="publishError" class="error-msg">{{ publishError }}</p>
    </template>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client.js';
import ArticleCard from '../components/ArticleCard.vue';

const route = useRoute();
const router = useRouter();
const isNews = computed(() => route.meta.type === 'news');
const apiBase = computed(() => (isNews.value ? '/api/news' : '/api/plans'));
const listRoute = computed(() => (isNews.value ? 'news' : 'plans'));

const step = ref('edit');
const title = ref('');
const content = ref('');
const publishedAt = ref(new Date().toISOString().slice(0, 10));
const imageFile = ref(null);
const imagePreview = ref('');
const publishing = ref(false);
const publishError = ref('');

const canPreview = computed(
  () => title.value.trim() && content.value.trim() && imagePreview.value
);

const previewItem = computed(() => ({
  title: title.value.trim() || 'Без названия',
  content: content.value.trim(),
  image_path: imagePreview.value.startsWith('blob:')
    ? imagePreview.value
    : imagePreview.value,
  published_at: publishedAt.value
    ? new Date(publishedAt.value).toISOString()
    : new Date().toISOString(),
}));

function onImageChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  imageFile.value = file;
  if (imagePreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(imagePreview.value);
  }
  imagePreview.value = URL.createObjectURL(file);
}

function goPreview() {
  if (!canPreview.value) return;
  step.value = 'preview';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function publish() {
  publishError.value = '';
  publishing.value = true;
  const form = new FormData();
  form.append('title', title.value.trim());
  form.append('content', content.value.trim());
  form.append('published_at', new Date(publishedAt.value).toISOString());
  form.append('image', imageFile.value);

  try {
    await api(apiBase.value, { method: 'POST', body: form });
    router.push({ name: listRoute.value });
  } catch (e) {
    publishError.value = e.message;
  } finally {
    publishing.value = false;
  }
}
</script>

<style scoped>
.page-title {
  font-family: var(--font-headline);
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.preview-label {
  font-size: 1rem;
  margin: 1.5rem 0 0.75rem;
  color: var(--text-muted);
}

.editor-preview-card {
  margin-bottom: 1.5rem;
}

.btn-next {
  width: 100%;
  max-width: 280px;
}

.hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.step-hint {
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-style: italic;
}

.step-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
}
</style>
