import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('mdv_token'));

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isSuperuser = computed(() => user.value?.role === 'superuser');
  const canManagePlans = computed(
    () => user.value?.role === 'admin' || user.value?.role === 'superuser'
  );
  const canManageUsers = computed(
    () => user.value?.role === 'admin' || user.value?.role === 'superuser'
  );

  async function login(username, password) {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem('mdv_token', data.token);
  }

  async function fetchMe() {
    if (!token.value) return;
    try {
      const data = await api('/api/auth/me');
      user.value = data.user;
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('mdv_token');
  }

  if (token.value) fetchMe();

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isSuperuser,
    canManagePlans,
    canManageUsers,
    login,
    logout,
    fetchMe,
  };
});
