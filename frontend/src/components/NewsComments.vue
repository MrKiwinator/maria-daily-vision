<template>
  <section id="comments" class="comments" aria-labelledby="comments-heading">
    <h2 id="comments-heading" class="comments-heading">
      Комментарии
      <span v-if="comments.length" class="comments-count">{{ comments.length }}</span>
    </h2>

    <p v-if="loading" class="empty-state comments-loading">Загрузка комментариев…</p>
    <p v-else-if="loadError" class="error-msg">{{ loadError }}</p>

    <ul v-else-if="comments.length" class="comments-list">
      <li v-for="c in comments" :key="c.id" class="comment-item">
        <div class="comment-head">
          <span class="comment-author">{{ c.username }}</span>
          <time class="comment-date" :datetime="c.created_at">
            {{ formatDate(c.created_at) }}, {{ formatTime(c.created_at) }}
          </time>
        </div>
        <p class="comment-body">{{ c.body }}</p>
        <button
          v-if="canDelete(c)"
          type="button"
          class="comment-delete"
          :disabled="deletingId === c.id"
          @click="removeComment(c.id)"
        >
          {{ deletingId === c.id ? '…' : 'Удалить' }}
        </button>
      </li>
    </ul>
    <p v-else class="comments-empty">Пока нет комментариев. Будьте первым.</p>

    <form class="comment-form" @submit.prevent="submit">
      <label for="comment-body" class="comment-label">
        Ваш комментарий
        <span class="comment-hint">как {{ auth.user?.username }}</span>
      </label>
      <textarea
        id="comment-body"
        v-model="draft"
        rows="3"
        maxlength="2000"
        placeholder="Напишите комментарий…"
        required
      />
      <p v-if="submitError" class="error-msg">{{ submitError }}</p>
      <button type="submit" class="btn btn-primary" :disabled="submitting || !draft.trim()">
        {{ submitting ? 'Отправка…' : 'Отправить' }}
      </button>
    </form>
  </section>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';
import { formatDate, formatTime } from '../utils/text.js';

const props = defineProps({
  newsId: { type: [Number, String], required: true },
});

const auth = useAuthStore();
const comments = ref([]);
const loading = ref(false);
const loadError = ref('');
const draft = ref('');
const submitting = ref(false);
const submitError = ref('');
const deletingId = ref(null);

function canDelete(comment) {
  if (!auth.user) return false;
  return auth.isAdmin || comment.user_id === auth.user.id;
}

async function load() {
  if (!props.newsId) return;
  loading.value = true;
  loadError.value = '';
  try {
    const data = await api(`/api/news/${props.newsId}/comments`);
    comments.value = data.comments || [];
  } catch (e) {
    loadError.value = e.message;
    comments.value = [];
  } finally {
    loading.value = false;
  }
}

async function submit() {
  const body = draft.value.trim();
  if (!body) return;
  submitError.value = '';
  submitting.value = true;
  try {
    const data = await api(`/api/news/${props.newsId}/comments`, {
      method: 'POST',
      body: { body },
    });
    comments.value.push(data.comment);
    draft.value = '';
  } catch (e) {
    submitError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

async function removeComment(id) {
  if (!window.confirm('Удалить комментарий?')) return;
  deletingId.value = id;
  try {
    await api(`/api/news/${props.newsId}/comments/${id}`, { method: 'DELETE' });
    comments.value = comments.value.filter((c) => c.id !== id);
  } catch (e) {
    window.alert(e.message || 'Не удалось удалить');
  } finally {
    deletingId.value = null;
  }
}

watch(() => props.newsId, () => load());

onMounted(() => load());
</script>

<style scoped>
.comments {
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border);
}

.comments-heading {
  font-family: var(--font-headline);
  font-size: 1.35rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.comments-count {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  font-family: var(--font-body);
}

.comments-loading,
.comments-empty {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 1.25rem;
}

.comments-list {
  list-style: none;
  margin: 0 0 1.5rem;
  padding: 0;
}

.comment-item {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1rem 1.1rem;
  margin-bottom: 0.75rem;
  border-radius: 4px;
}

.comment-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 1rem;
  margin-bottom: 0.5rem;
}

.comment-author {
  font-weight: 700;
  color: var(--accent);
}

.comment-date {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.comment-body {
  white-space: pre-wrap;
  line-height: 1.55;
  margin: 0;
}

.comment-delete {
  margin-top: 0.5rem;
  background: none;
  border: none;
  padding: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #a33;
  cursor: pointer;
}

.comment-delete:hover {
  text-decoration: underline;
}

.comment-form {
  margin-top: 1rem;
}

.comment-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.35rem;
  font-size: 0.95rem;
}

.comment-hint {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.comment-form textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  margin-bottom: 0.75rem;
  resize: vertical;
  min-height: 4.5rem;
}

.comment-form .btn {
  margin-top: 0.25rem;
}
</style>
