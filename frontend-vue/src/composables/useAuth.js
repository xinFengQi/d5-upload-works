import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getMe, logout as apiLogout } from '../api/auth';

const tokenKey = 'auth_token';
const user = ref(null);
const loading = ref(false);
const tokenVersion = ref(0);

export function useAuth() {
  const router = useRouter();

  const token = computed(() => {
    tokenVersion.value;
    return localStorage.getItem(tokenKey) || localStorage.getItem('token');
  });
  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value && user.value.role === 'admin');
  const isJudge = computed(() => user.value && user.value.isJudge === true);

  function setToken(t) {
    if (t) {
      localStorage.setItem(tokenKey, t);
      localStorage.setItem('token', t);
    } else {
      localStorage.removeItem(tokenKey);
      localStorage.removeItem('token');
    }
    tokenVersion.value++;
  }

  async function checkAuth() {
    const t = token.value;
    if (!t) {
      user.value = null;
      return null;
    }
    loading.value = true;
    try {
      const res = await getMe();
      if (res.success && res.data) {
        user.value = res.data;
        return res.data;
      }
    } catch {
      setToken(null);
      user.value = null;
      return null;
    } finally {
      loading.value = false;
    }
    user.value = null;
    return null;
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {}
    setToken(null);
    user.value = null;
    if (router?.push) {
      router.push({ name: 'Login' });
    } else {
      window.location.href = '/login';
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isJudge,
    loading,
    setToken,
    checkAuth,
    logout,
  };
}
