<template>
  <section class="editor-page">
    <h2 class="page-title">
      {{ isNews ? 'Новости' : 'Планы' }} /
      {{ pageHeading }}
    </h2>

    <p v-if="loadError" class="error-msg">{{ loadError }}</p>

    <!-- Шаг 1: редактирование -->
    <template v-if="step === 'edit'">
      <form class="editor-form" @submit.prevent="goPreview">
        <div class="form-group">
          <label>Изображение {{ isNews && isEdit ? '(оставьте как есть или выберите новое)' : '*' }}</label>
          <input
            type="file"
            accept="image/*"
            :required="!isEdit"
            @change="onImageChange"
          />
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
        <div class="form-group form-row-datetime">
          <div>
            <label>Дата публикации</label>
            <input v-model="publishedAt" type="date" required />
          </div>
          <div>
            <label>Время (чч:мм)</label>
            <input v-model="publishedTime" type="time" required />
          </div>
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
          {{ publishButtonLabel }}
        </button>
      </div>
      <p v-if="publishError" class="error-msg">{{ publishError }}</p>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, imageUrl } from '../api/client.js';
import ArticleCard from '../components/ArticleCard.vue';
import {
  toInputDate,
  toInputTime,
  fromLocalDateTimeToIso,
} from '../utils/text.js';

const route = useRoute();
const router = useRouter();
const isNews = computed(() => route.meta.type === 'news');
const apiBase = computed(() => (isNews.value ? '/api/news' : '/api/plans'));
const listRoute = computed(() => (isNews.value ? 'news' : 'plans'));

const editId = computed(() => {
  const raw = route.params.id;
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw);
});

const isEdit = computed(() => isNews.value && !!editId.value);

const step = ref('edit');
const title = ref('');
const content = ref('');
const publishedAt = ref('');
const publishedTime = ref('');
const imageFile = ref(null);
const imagePreview = ref('');
const publishing = ref(false);
const publishError = ref('');
const loadError = ref('');

const pageHeading = computed(() => {
  if (isEdit.value) return 'Редактирование';
  return 'Новая';
});

const publishButtonLabel = computed(() => {
  if (publishing.value) return isEdit.value ? 'Сохранение…' : 'Публикация…';
  return isEdit.value ? 'Сохранить' : 'Опубликовать';
});

const canPreview = computed(() => {
  const hasText = title.value.trim() && content.value.trim();
  const hasImage = !!imagePreview.value;
  return hasText && hasImage && publishedAt.value && publishedTime.value;
});

const previewItem = computed(() => ({
  title: title.value.trim() || 'Без названия',
  content: content.value.trim(),
  image_path: imagePreview.value.startsWith('blob:')
    ? imagePreview.value
    : imagePreview.value,
  published_at: fromLocalDateTimeToIso(publishedAt.value, publishedTime.value),
}));

function setDefaultDateTime() {
  const d = new Date();
  publishedAt.value = toInputDate(d);
  publishedTime.value = toInputTime(d) || '09:00';
}

function resetNewNewsForm() {
  loadError.value = '';
  title.value = '';
  content.value = '';
  imageFile.value = null;
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value);
  imagePreview.value = '';
  setDefaultDateTime();
  step.value = 'edit';
}

async function loadNewsForEdit() {
  if (!isEdit.value || !editId.value) return;
  loadError.value = '';
  try {
    const data = await api(`/api/news/${editId.value}`);
    const it = data.item;
    title.value = it.title;
    content.value = it.content;
    publishedAt.value = toInputDate(it.published_at);
    publishedTime.value = toInputTime(it.published_at) || '09:00';
    imagePreview.value = imageUrl(it.image_path);
    imageFile.value = null;
    step.value = 'edit';
  } catch (e) {
    loadError.value = e.message || 'Не удалось загрузить новость';
  }
}

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
  form.append(
    'published_at',
    fromLocalDateTimeToIso(publishedAt.value, publishedTime.value)
  );

  try {
    if (isEdit.value) {
      if (imageFile.value) form.append('image', imageFile.value);
      await api(`${apiBase.value}/${editId.value}`, { method: 'PUT', body: form });
    } else {
      if (!imageFile.value) {
        publishError.value = 'Нужно выбрать изображение';
        return;
      }
      form.append('image', imageFile.value);
      await api(apiBase.value, { method: 'POST', body: form });
    }
    router.push({ name: listRoute.value });
  } catch (e) {
    publishError.value = e.message;
  } finally {
    publishing.value = false;
  }
}

watch(
  () => [isEdit.value, editId.value],
  () => {
    if (isEdit.value) loadNewsForEdit();
  },
  { immediate: true }
);

watch(
  () => route.name,
  (name) => {
    if (name === 'news-new') resetNewNewsForm();
  },
  { immediate: true }
);

onMounted(() => {
  if (!isNews.value) setDefaultDateTime();
});
</script>

<style scoped>
.page-title {
  font-family: var(--font-headline);
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-row-datetime {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 520px) {
  .form-row-datetime {
    grid-template-columns: 1fr;
  }
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
