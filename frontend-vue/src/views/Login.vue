<template>
  <div class="login-page">
    <div class="login-container">
      <div class="logo-section">
        <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render" class="logo-img">
        <h1 class="login-title">欢迎登录</h1>
        <p class="login-subtitle">登录后即可上传作品并参与投票</p>
      </div>
      <div class="login-buttons">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="dingtalkLoading"
          @click="goDingtalk"
        >
          <span class="btn-icon">📱</span>
          <span>{{ dingtalkLoading ? '获取中...' : '钉钉登录' }}</span>
        </button>
        <button v-if="showMockButton" type="button" class="btn btn-outline" @click="showMockModal = true">
          <span class="btn-icon">🔧</span>
          <span>模拟登录（开发环境）</span>
        </button>
        <button type="button" class="btn btn-outline" @click="showAdminModal = true">
          <span class="btn-icon">👤</span>
          <span>管理员登录</span>
        </button>
      </div>
    </div>

    <!-- 模拟登录弹框（参照 login-page.ts） -->
    <div class="modal mock-login-modal" :class="{ active: showMockModal }" @click.self="closeMockModal">
      <div class="modal-content">
        <button type="button" class="modal-close" aria-label="关闭" @click="closeMockModal">×</button>
        <div class="modal-header">
          <h2 class="modal-title">模拟登录</h2>
          <p class="modal-subtitle">开发环境 - 无需真实钉钉账号</p>
        </div>
        <form @submit.prevent="onMockLogin">
          <div class="form-group">
            <label class="form-label">用户名（可选）</label>
            <input
              v-model="mockUserName"
              type="text"
              class="form-input"
              placeholder="留空将使用随机名称"
            >
            <div class="quick-names">
              <button type="button" class="quick-name-btn" @click="mockUserName = '张三'">张三</button>
              <button type="button" class="quick-name-btn" @click="mockUserName = '李四'">李四</button>
              <button type="button" class="quick-name-btn" @click="mockUserName = '王五'">王五</button>
              <button type="button" class="quick-name-btn" @click="mockUserName = '测试用户'">测试用户</button>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="closeMockModal">取消</button>
            <button type="submit" class="btn btn-primary">登录</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 管理员登录弹框（在登录页直接输入密码，不跳转 /admin） -->
    <div class="modal admin-login-modal" :class="{ active: showAdminModal }" @click.self="closeAdminModal">
      <div class="modal-content">
        <button type="button" class="modal-close" aria-label="关闭" @click="closeAdminModal">×</button>
        <div class="modal-header">
          <h2 class="modal-title">管理员登录</h2>
          <p class="modal-subtitle">请输入管理员密码</p>
        </div>
        <form @submit.prevent="onAdminLogin">
          <div class="form-group">
            <label class="form-label">管理员密码</label>
            <input
              v-model="adminPassword"
              type="password"
              class="form-input"
              :class="{ error: adminError }"
              placeholder="请输入管理员密码"
              required
            >
            <div v-if="adminError" class="error-message show">{{ adminError }}</div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-outline" @click="closeAdminModal">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="adminLoggingIn">登录</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { getDingtalkAuthUrl, adminLogin, exchangeCode } from '../api/auth';

const route = useRoute();
const router = useRouter();
const { setToken, checkAuth } = useAuth();

const showAdminModal = ref(false);
const showMockModal = ref(false);
const mockUserName = ref('');
const adminPassword = ref('');
const adminError = ref('');
const adminLoggingIn = ref(false);
const dingtalkLoading = ref(false);

const showMockButton = computed(() => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  return host === 'localhost' || host === '127.0.0.1';
});

function closeAdminModal() {
  showAdminModal.value = false;
  adminPassword.value = '';
  adminError.value = '';
}

function closeMockModal() {
  showMockModal.value = false;
  mockUserName.value = '';
}

async function goDingtalk() {
  if (dingtalkLoading.value) return;
  dingtalkLoading.value = true;
  try {
    const res = await getDingtalkAuthUrl();
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      dingtalkLoading.value = false;
      alert(res.error?.message || '获取登录地址失败');
    }
  } catch (e) {
    dingtalkLoading.value = false;
    console.error('DingTalk auth URL error:', e);
    alert('获取登录地址失败，请重试');
  }
}

function onMockLogin() {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = new URL('/api/auth/callback', base);
  callbackUrl.searchParams.set('code', 'mock_code_' + Date.now());
  if (mockUserName.value?.trim()) {
    callbackUrl.searchParams.set('mock_user', mockUserName.value.trim());
  }
  callbackUrl.searchParams.set('frontend_origin', base);
  window.location.href = callbackUrl.toString();
}

async function onAdminLogin() {
  const pwd = adminPassword.value?.trim();
  if (!pwd) {
    adminError.value = '请输入管理员密码';
    return;
  }
  adminError.value = '';
  adminLoggingIn.value = true;
  try {
    const res = await adminLogin(pwd);
    if (res.success && res.data?.token) {
      setToken(res.data.token);
      closeAdminModal();
      await router.push({ name: 'Admin' });
    } else {
      adminError.value = res.error?.message || '密码错误，请重试';
    }
  } catch (e) {
    adminError.value = e.response?.data?.error?.message || e.message || '登录失败，请重试';
  } finally {
    adminLoggingIn.value = false;
  }
}

onMounted(async () => {
  const token = route.query.token;
  if (token) {
    setToken(token);
    await checkAuth();
    router.replace({ path: '/', query: {} });
    return;
  }
  // 钉钉回调的 code 可能在 hash 前 (?code=xxx#/login) 或 hash 内，两处都读
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const code =
    route.query.code ||
    route.query.authCode ||
    (searchParams && (searchParams.get('code') || searchParams.get('authCode')));
  if (code) {
    try {
      const state = route.query.state || (searchParams && searchParams.get('state'));
      const mockUser = route.query.mock_user || (searchParams && searchParams.get('mock_user'));
      const res = await exchangeCode({
        code: code,
        state: state,
        mock_user: mockUser,
      });
      if (res.success && res.data?.token) {
        setToken(res.data.token);
        await checkAuth();
        router.replace({ path: '/' });
        return;
      }
    } catch (e) {
      console.error('Exchange code for token failed:', e);
    }
  }
  if (route.query.admin === '1') {
    showAdminModal.value = true;
  }
});
</script>

<style scoped>
/* 登录页整体：渐变背景 + 内容居中（common.css 里是 body.login-page，Vue 根节点需单独写） */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--gradient);
  box-sizing: border-box;
}

.admin-login-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.admin-login-modal.active { display: flex; }
.admin-login-modal .modal-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}
.admin-login-modal .modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
}
.admin-login-modal .modal-close:hover { color: #1f2937; }
.admin-login-modal .modal-header { margin-bottom: 1.5rem; }
.admin-login-modal .modal-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem; color: #1f2937; }
.admin-login-modal .modal-subtitle { font-size: 0.875rem; color: #6b7280; }
.admin-login-modal .form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.admin-login-modal .form-actions .btn { flex: 1; }
.admin-login-modal .error-message { font-size: 0.875rem; color: var(--danger-color); margin-top: 0.25rem; }
.admin-login-modal .error-message.show { display: block; }

/* 模拟登录弹框（与管理员弹框一致，增加快捷姓名） */
.mock-login-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.mock-login-modal.active { display: flex; }
.mock-login-modal .modal-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
}
.mock-login-modal .modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
}
.mock-login-modal .modal-close:hover { color: #1f2937; }
.mock-login-modal .modal-header { margin-bottom: 1.5rem; }
.mock-login-modal .modal-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem; color: #1f2937; }
.mock-login-modal .modal-subtitle { font-size: 0.875rem; color: #6b7280; }
.mock-login-modal .quick-names {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.mock-login-modal .quick-name-btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}
.mock-login-modal .quick-name-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}
.mock-login-modal .form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.mock-login-modal .form-actions .btn { flex: 1; }
</style>
