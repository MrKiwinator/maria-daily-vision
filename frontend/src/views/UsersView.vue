<template>
  <section class="users-page">
    <h2 class="page-title">Пользователи</h2>

    <form class="add-user-form" @submit.prevent="addUser">
      <h3>Добавить пользователя</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Логин</label>
          <input v-model="newUser.username" type="text" required />
        </div>
        <div class="form-group">
          <label>Пароль</label>
          <input v-model="newUser.password" type="password" required minlength="4" />
        </div>
        <div class="form-group">
          <label>Роль</label>
          <select v-model="newUser.role">
            <option value="user">Пользователь</option>
            <option value="admin">Администратор</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" :disabled="adding">
          {{ adding ? '…' : 'Добавить' }}
        </button>
      </div>
      <p v-if="formError" class="error-msg">{{ formError }}</p>
    </form>

    <p v-if="loading" class="empty-state">Загрузка…</p>
    <p v-else-if="listError" class="error-msg">{{ listError }}</p>
    <div v-else class="table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Логин</th>
            <th>Роль</th>
            <th>Создан</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>{{ u.role === 'admin' ? 'Админ' : 'Пользователь' }}</td>
            <td>{{ formatDate(u.created_at) }}</td>
            <td>
              <button
                type="button"
                class="btn btn-danger btn-sm"
                :disabled="u.id === auth.user?.id"
                @click="removeUser(u.id)"
              >
                Удалить
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';
import { formatDate } from '../utils/text.js';

const auth = useAuthStore();
const users = ref([]);
const loading = ref(true);
const listError = ref('');
const formError = ref('');
const adding = ref(false);
const newUser = ref({ username: '', password: '', role: 'user' });

onMounted(load);

async function load() {
  loading.value = true;
  listError.value = '';
  try {
    const data = await api('/api/users');
    users.value = data.users;
  } catch (e) {
    listError.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function addUser() {
  formError.value = '';
  adding.value = true;
  try {
    await api('/api/users', { method: 'POST', body: newUser.value });
    newUser.value = { username: '', password: '', role: 'user' };
    await load();
  } catch (e) {
    formError.value = e.message;
  } finally {
    adding.value = false;
  }
}

async function removeUser(id) {
  if (!confirm('Удалить пользователя?')) return;
  try {
    await api(`/api/users/${id}`, { method: 'DELETE' });
    await load();
  } catch (e) {
    alert(e.message);
  }
}
</script>

<style scoped>
.page-title {
  font-family: var(--font-headline);
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
}

.add-user-form {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1.25rem;
  margin-bottom: 2rem;
}

.add-user-form h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  gap: 1rem;
}

@media (min-width: 640px) {
  .form-row {
    grid-template-columns: 1fr 1fr 140px auto;
    align-items: end;
  }
}

.table-wrap {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.users-table th,
.users-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.users-table th {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
}
</style>
