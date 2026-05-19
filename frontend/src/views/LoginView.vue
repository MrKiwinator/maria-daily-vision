<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">Maria Daily Vision</h1>
      <p class="login-sub">Войдите, чтобы читать новости</p>
      <form @submit.prevent="onSubmit">
        <div class="form-group">
          <label for="username">Логин</label>
          <input id="username" v-model="username" type="text" required autocomplete="username" />
        </div>
        <div class="form-group">
          <label for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
          />
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? 'Вход…' : 'Войти' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    const redirect = route.query.redirect || '/news';
    router.push(redirect);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: var(--bg);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  padding: 2rem;
}

.login-title {
  font-family: var(--font-headline);
  font-size: 1.75rem;
  text-align: center;
  margin-bottom: 0.25rem;
}

.login-sub {
  text-align: center;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.btn-block {
  width: 100%;
  margin-top: 0.5rem;
}
</style>
