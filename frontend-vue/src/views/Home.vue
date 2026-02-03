<template>
  <div class="index-page">
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/" class="logo">
          <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render" class="logo-img">
        </router-link>
        <div class="nav-actions">
          <div v-if="isLoggedIn" class="user-menu">
            <button type="button" class="btn btn-outline" @click="toggleUserMenu">{{ user?.name || '已登录' }}</button>
            <div v-show="showUserDropdown" class="user-dropdown">
              <button type="button" class="dropdown-item" @click="handleLogout">退出登录</button>
            </div>
          </div>
          <button v-else type="button" class="btn btn-outline" @click="goLogin">登录</button>
          <router-link to="/upload" class="btn btn-primary">上传作品</router-link>
          <router-link to="/vote-result" class="btn btn-outline">投票结果</router-link>
          <router-link v-if="isJudge || isAdmin" to="/score" class="btn btn-outline">作品评价</router-link>
          <router-link to="/screen" class="btn btn-outline">大屏展示</router-link>
          <router-link to="/multi-screen" class="btn btn-outline">多屏播放</router-link>
          <router-link v-if="isAdmin" to="/admin" class="btn btn-outline">管理</router-link>
        </div>
        <button type="button" class="menu-toggle" aria-label="打开菜单" @click="openSideMenu">☰</button>
      </div>
    </nav>

    <div class="menu-overlay" :class="{ active: sideMenuOpen }" @click="closeSideMenu"></div>
    <div class="side-menu" :class="{ active: sideMenuOpen }">
      <div class="side-menu-header">
        <h2 class="side-menu-title">菜单</h2>
        <button type="button" class="side-menu-close" aria-label="关闭" @click="closeSideMenu">×</button>
      </div>
      <div class="side-menu-actions">
        <div v-if="isLoggedIn" class="user-menu">
          <button type="button" class="btn btn-outline" @click="toggleSideUserMenu">{{ user?.name || '已登录' }}</button>
          <div v-show="showSideUserDropdown" class="user-dropdown">
            <button type="button" class="dropdown-item" @click="handleLogout">退出登录</button>
          </div>
        </div>
        <button v-else type="button" class="btn btn-outline" @click="goLogin">登录</button>
        <router-link to="/upload" class="btn btn-primary" @click="closeSideMenu">上传作品</router-link>
        <router-link to="/vote-result" class="btn btn-outline" @click="closeSideMenu">投票结果</router-link>
        <router-link v-if="isJudge || isAdmin" to="/score" class="btn btn-outline" @click="closeSideMenu">作品评价</router-link>
        <router-link to="/screen" class="btn btn-outline" @click="closeSideMenu">大屏展示</router-link>
        <router-link to="/multi-screen" class="btn btn-outline" @click="closeSideMenu">多屏播放</router-link>
        <router-link v-if="isAdmin" to="/admin" class="btn btn-outline" @click="closeSideMenu">管理</router-link>
      </div>
    </div>

    <main class="main-content">
      <div class="page-header">
        <h1 class="page-title">2026年会作品投票</h1>
        <p class="page-subtitle">释放你的想象力，分享你的创作</p>
        <p class="page-tagline">进入心流之境，体验创作自由</p>
      </div>

      <div v-if="loading" class="loading active">
        <div class="spinner"></div>
        <p style="margin-top: 1rem; color: var(--text-secondary);">加载中...</p>
      </div>

      <div class="masonry-grid" ref="gridRef">
        <div v-for="w in works" :key="w.id" class="masonry-item">
          <div class="work-card">
            <WorkVideoPreview :work="w" variant="card" @preview="openVideoPreview(w)" />
            <div class="work-content">
              <div class="work-title">{{ w.title || '未命名作品' }}</div>
              <div class="work-creator">{{ w.creatorName || '未知' }}</div>
              <div class="work-footer">
                <div class="work-votes"><span>{{ w.voteCount ?? 0 }}</span></div>
                <button
                  type="button"
                  :class="['vote-btn', w.hasVoted && 'voted', w.isOwner && 'own-work']"
                  :disabled="w.hasVoted || w.isOwner || (userVoteCount >= maxVotesPerUser && !w.hasVoted && !w.isOwner)"
                  @click.stop="handleVote(w)"
                >
                  {{ w.hasVoted ? '已投票' : w.isOwner ? '自己的作品' : '投票' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && works.length === 0" class="empty-state">
        <div class="empty-state-icon">🎬</div>
        <h3>暂无作品</h3>
        <p>成为第一个释放想象力的人吧！</p>
      </div>
    </main>

    <WorkVideoModal :show="videoModalOpen" :work="previewWork" @close="closeVideoModal" />

    <router-link to="/upload" class="fab" title="上传作品">+</router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkVideoPreview from '../components/WorkVideoPreview.vue';
import WorkVideoModal from '../components/WorkVideoModal.vue';
import { useAuth } from '../composables/useAuth';
import { getWorks } from '../api/works';
import { getVoteStats, getUserVoteCount, vote as apiVote } from '../api/vote';
import { getScreenConfig } from '../api/screenConfig';
import { exchangeCode } from '../api/auth';

const route = useRoute();
const router = useRouter();
const { user, isLoggedIn, isAdmin, isJudge, setToken, checkAuth, logout } = useAuth();

const loading = ref(true);
const works = ref([]);
const userVoteCount = ref(0);
/** 每人最多投票数（从管理员配置读取，默认 1） */
const maxVotesPerUser = ref(1);
const showUserDropdown = ref(false);
const showSideUserDropdown = ref(false);
const sideMenuOpen = ref(false);
const videoModalOpen = ref(false);
const previewWork = ref(null);
const gridRef = ref(null);

function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  if (theme.primaryColor) root.style.setProperty('--primary-color', theme.primaryColor);
  if (theme.primaryDark) root.style.setProperty('--primary-dark', theme.primaryDark);
  if (theme.primaryLight) root.style.setProperty('--primary-light', theme.primaryLight);
  if (theme.secondaryColor) root.style.setProperty('--secondary-color', theme.secondaryColor);
  const pd = theme.primaryDark || '#1e40af';
  const pc = theme.primaryColor || '#2563eb';
  root.style.setProperty('--gradient', `linear-gradient(135deg, ${pd} 0%, ${pc} 100%)`);
}

async function loadTheme() {
  try {
    const res = await getScreenConfig();
    if (res.success && res.data) {
      if (res.data.theme) applyTheme(res.data.theme);
      const n = res.data.maxVotesPerUser != null ? Number(res.data.maxVotesPerUser) : 1;
      maxVotesPerUser.value = Math.min(100, Math.max(1, n));
    }
  } catch {}
}

function toggleUserMenu() {
  showUserDropdown.value = !showUserDropdown.value;
}
function toggleSideUserMenu() {
  showSideUserDropdown.value = !showSideUserDropdown.value;
}
function openSideMenu() {
  sideMenuOpen.value = true;
  document.body.style.overflow = 'hidden';
}
function closeSideMenu() {
  sideMenuOpen.value = false;
  document.body.style.overflow = '';
}
function goLogin() {
  router.push({ name: 'Login' });
}
async function handleLogout() {
  showUserDropdown.value = false;
  showSideUserDropdown.value = false;
  await logout();
}

function toDisplayItem(work, stats) {
  return {
    id: work.id,
    fileUrl: work.fileUrl,
    title: work.title,
    description: work.description,
    creatorName: work.creatorName,
    userId: work.userId,
    voteCount: (stats?.success && stats?.data) ? (stats.data.voteCount ?? work.voteCount) : (work.voteCount ?? 0),
    hasVoted: (stats?.success && stats?.data) ? !!stats.data.hasVoted : false,
    isOwner: user.value && work.userId === user.value.userid,
  };
}

async function loadWorks() {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  loading.value = true;
  try {
    const worksData = await getWorks({ page: 1, limit: 100 });
    const items = worksData?.data?.items ?? [];
    if (!worksData?.success || !Array.isArray(items) || items.length === 0) {
      works.value = [];
      loading.value = false; // 明确在空数据时解除加载状态
      return;
    }
    if (!token) userVoteCount.value = 0;
    const initialWorks = items.map((w) => toDisplayItem(w, null));
    works.value = initialWorks;
    loading.value = false;

    if (token) {
      try {
        const countRes = await getUserVoteCount();
        if (countRes.success && countRes.data) userVoteCount.value = countRes.data.count ?? 0;
      } catch {
        userVoteCount.value = 0;
      }
      const statsList = await Promise.all(
        items.map((work) =>
          getVoteStats(work.id)
            .then((stats) => toDisplayItem(work, stats))
            .catch(() => toDisplayItem(work, null))
        )
      );
      works.value = statsList;
    }
  } catch {
    works.value = [];
    loading.value = false; // 明确在错误时解除加载状态
  } finally {
    loading.value = false;
  }
}

function openVideoPreview(work) {
  if (!work?.fileUrl) return;
  previewWork.value = work;
  videoModalOpen.value = true;
}

function closeVideoModal() {
  previewWork.value = null;
  videoModalOpen.value = false;
}

async function handleVote(w) {
  if (w.hasVoted || w.isOwner) return;
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!token) {
    if (confirm('请先登录才能投票，是否前往登录页面？')) router.push({ name: 'Login' });
    return;
  }
  if (userVoteCount.value >= maxVotesPerUser.value) {
    alert(`您已经投了 ${maxVotesPerUser.value} 票，每人最多可投 ${maxVotesPerUser.value} 票`);
    return;
  }
  try {
    const res = await apiVote(w.id);
    if (res.success) {
      userVoteCount.value++;
      await loadWorks();
    } else {
      alert(res.error?.message || '投票失败');
    }
  } catch {
    alert('投票失败，请重试');
  }
}

onMounted(async () => {
  try {
    await loadTheme();
    // 钉钉回调带 token：直接写入并清掉 URL 参数
    const tokenFromUrl = route.query.token;
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      window.history.replaceState({}, document.title, route.path || '/');
    } else {
      // 钉钉回调带 code/authCode：可能落在 hash 前 (?code=xxx#/) 或 hash 内 (#/?code=xxx)，两处都读
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
            // 清掉 URL 上的 code/state，避免刷新重复用
            const cleanUrl = window.location.origin + (window.location.pathname || '/') + (window.location.hash || '#/');
            window.history.replaceState({}, document.title, cleanUrl);
          }
        } catch (e) {
          console.error('Exchange code for token failed:', e);
        }
      }
    }
    await checkAuth();
    await loadWorks();
  } finally {
    loading.value = false;
  }
});
</script>
