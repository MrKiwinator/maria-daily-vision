<template>
  <section class="about-page">
    <h2 class="page-title">О Марии</h2>

    <div v-if="loading" class="empty-state">Загрузка…</div>
    <template v-else>
      <div v-if="about?.photo_path" class="about-photo">
        <img :src="imageUrl(about.photo_path)" alt="Мария" />
      </div>

      <div
        v-if="about?.content_html"
        class="about-content"
        v-html="renderedContent"
      />

      <div v-if="auth.isAdmin" class="admin-edit">
        <h3>Редактирование (админ)</h3>
        <form @submit.prevent="saveAbout">
          <div class="form-group">
            <label>Главное фото</label>
            <input type="file" accept="image/*" @change="onPhotoChange" />
          </div>
          <div class="form-group">
            <label>Текст (HTML)</label>
            <textarea v-model="editContent" rows="10" />
          </div>
          <div class="form-group inline-upload">
            <label>Вставить фото в текст</label>
            <select v-model="inlineAlign">
              <option value="left">Слева от текста</option>
              <option value="right">Справа от текста</option>
            </select>
            <input type="file" accept="image/*" @change="onInlineChange" />
          </div>
          <p v-if="saveError" class="error-msg">{{ saveError }}</p>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
        </form>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { api, imageUrl } from '../api/client.js';

const auth = useAuthStore();
const about = ref(null);
const loading = ref(true);
const editContent = ref('');
const photoFile = ref(null);
const inlineFile = ref(null);
const inlineAlign = ref('left');
const saving = ref(false);
const saveError = ref('');

const renderedContent = computed(() => {
  if (!about.value?.content_html) return '';
  return about.value.content_html.replace(
    /src="(\/uploads\/[^"]+)"/g,
    (_, p) => `src="${imageUrl(p)}"`
  );
});

onMounted(load);

async function load() {
  loading.value = true;
  try {
    const data = await api('/api/about');
    about.value = data.about;
    editContent.value = data.about?.content_html || '';
  } finally {
    loading.value = false;
  }
}

function onPhotoChange(e) {
  photoFile.value = e.target.files?.[0] || null;
}

function onInlineChange(e) {
  inlineFile.value = e.target.files?.[0] || null;
}

async function saveAbout() {
  saveError.value = '';
  saving.value = true;
  const form = new FormData();
  form.append('content_html', editContent.value);
  if (photoFile.value) form.append('photo', photoFile.value);
  if (inlineFile.value) {
    form.append('inline_image', inlineFile.value);
    form.append('align', inlineAlign.value);
  }
  try {
    const data = await api('/api/about', { method: 'PUT', body: form });
    about.value = data.about;
    editContent.value = data.about.content_html;
    photoFile.value = null;
    inlineFile.value = null;
  } catch (e) {
    saveError.value = e.message;
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.page-title {
  font-family: var(--font-headline);
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
}

.about-photo {
  margin-bottom: 1.5rem;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.about-photo img {
  width: 100%;
  border-radius: 4px;
  box-shadow: var(--shadow);
}

.about-content {
  font-size: 1.05rem;
  line-height: 1.75;
  margin-bottom: 2rem;
}

.admin-edit {
  border-top: 1px solid var(--border);
  padding-top: 2rem;
  margin-top: 2rem;
}

.admin-edit h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-muted);
}

.inline-upload {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
