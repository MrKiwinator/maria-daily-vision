<template>
  <section class="updates-page">
    <h1 class="page-title">Последние изменения</h1>
    <p class="page-intro">Хронология обновлений сайта и разделов.</p>

    <div v-if="auth.isAdmin" class="admin-add">
      <h2 class="section-label">Добавить запись</h2>
      <form @submit.prevent="addItem">
        <div class="form-group">
          <label for="new-update">Текст изменения</label>
          <textarea
            id="new-update"
            v-model="newBody"
            rows="3"
            maxlength="2000"
            placeholder="Например: добавлены комментарии к новостям"
            required
          />
        </div>
        <p v-if="addError" class="error-msg">{{ addError }}</p>
        <button type="submit" class="btn btn-primary" :disabled="adding || !newBody.trim()">
          {{ adding ? 'Сохранение…' : 'Добавить' }}
        </button>
      </form>
    </div>

    <p v-if="loading" class="empty-state">Загрузка…</p>
    <p v-else-if="listError" class="error-msg">{{ listError }}</p>
    <p v-else-if="!items.length" class="empty-state">Записей пока нет</p>

    <ul v-else class="updates-list">
      <li v-for="item in items" :key="item.id" class="update-row">
        <template v-if="editingId === item.id">
          <form class="edit-form" @submit.prevent="saveEdit(item.id)">
            <div class="form-group">
              <label :for="`edit-${item.id}`">Редактирование</label>
              <textarea :id="`edit-${item.id}`" v-model="editBody" rows="3" maxlength="2000" required />
            </div>
            <p v-if="editError" class="error-msg">{{ editError }}</p>
            <div class="row-actions">
              <button type="submit" class="btn btn-primary btn-sm" :disabled="saving">
                {{ saving ? '…' : 'Сохранить' }}
              </button>
              <button type="button" class="btn btn-secondary btn-sm" @click="cancelEdit">
                Отмена
              </button>
            </div>
          </form>
        </template>
        <template v-else>
          <time class="update-date" :datetime="item.updated_at || item.created_at">
            {{ formatDate(item.updated_at || item.created_at) }}
            <span v-if="item.updated_at && item.updated_at !== item.created_at" class="edited-tag">
              (изм.)
            </span>
          </time>
          <p class="update-body">{{ item.body }}</p>
          <div v-if="auth.isAdmin" class="row-actions">
            <button type="button" class="btn btn-secondary btn-sm" @click="startEdit(item)">
              Изменить
            </button>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              :disabled="deletingId === item.id"
              @click="removeItem(item.id)"
            >
              {{ deletingId === item.id ? '…' : 'Удалить' }}
            </button>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';
import { formatDate } from '../utils/text.js';

const auth = useAuthStore();
const items = ref([]);
const loading = ref(true);
const listError = ref('');
const newBody = ref('');
const adding = ref(false);
const addError = ref('');
const editingId = ref(null);
const editBody = ref('');
const editError = ref('');
const saving = ref(false);
const deletingId = ref(null);

async function load() {
  loading.value = true;
  listError.value = '';
  try {
    const data = await api('/api/last-updates');
    items.value = data.items || [];
  } catch (e) {
    listError.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function addItem() {
  const body = newBody.value.trim();
  if (!body) return;
  addError.value = '';
  adding.value = true;
  try {
    const data = await api('/api/last-updates', { method: 'POST', body: { body } });
    items.value.unshift(data.item);
    newBody.value = '';
  } catch (e) {
    addError.value = e.message;
  } finally {
    adding.value = false;
  }
}

function startEdit(item) {
  editingId.value = item.id;
  editBody.value = item.body;
  editError.value = '';
}

function cancelEdit() {
  editingId.value = null;
  editBody.value = '';
}

async function saveEdit(id) {
  const body = editBody.value.trim();
  if (!body) return;
  editError.value = '';
  saving.value = true;
  try {
    const data = await api(`/api/last-updates/${id}`, { method: 'PUT', body: { body } });
    const idx = items.value.findIndex((x) => x.id === id);
    if (idx !== -1) items.value[idx] = data.item;
    cancelEdit();
  } catch (e) {
    editError.value = e.message;
  } finally {
    saving.value = false;
  }
}

async function removeItem(id) {
  if (!window.confirm('Удалить эту запись?')) return;
  deletingId.value = id;
  try {
    await api(`/api/last-updates/${id}`, { method: 'DELETE' });
    items.value = items.value.filter((x) => x.id !== id);
    if (editingId.value === id) cancelEdit();
  } catch (e) {
    window.alert(e.message || 'Не удалось удалить');
  } finally {
    deletingId.value = null;
  }
}

onMounted(() => load());
</script>

<style scoped>
.page-title {
  font-family: var(--font-headline);
  font-size: 1.75rem;
  margin-bottom: 0.35rem;
}

.page-intro {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.section-label {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.admin-add {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1.25rem;
  margin-bottom: 2rem;
  border-radius: 4px;
}

.updates-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.update-row {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1.1rem 1.25rem;
  margin-bottom: 0.75rem;
  border-radius: 4px;
}

.update-date {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.edited-tag {
  font-size: 0.8rem;
  font-style: italic;
}

.update-body {
  white-space: pre-wrap;
  line-height: 1.6;
  margin: 0 0 0.75rem;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
}
</style>
