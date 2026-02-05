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
          <div v-if="isAdmin" class="nav-menu-dropdown">
            <button type="button" class="btn btn-outline" :class="{ active: showVoteResultDropdown }" @click="toggleVoteResultDropdown" @blur="onVoteResultDropdownBlur">
              投票结果 ▾
            </button>
            <div v-show="showVoteResultDropdown" class="nav-dropdown-panel">
              <router-link to="/main-awards" class="dropdown-link" @click="closeVoteResultDropdown">主奖项</router-link>
              <router-link to="/vote-result?type=popular" class="dropdown-link" @click="closeVoteResultDropdown">特别奖项</router-link>
            </div>
          </div>
          <div class="nav-menu-dropdown">
            <button type="button" class="btn btn-outline" :class="{ active: showScreenDropdown }" @click="toggleScreenDropdown" @blur="onScreenDropdownBlur">
              展示 ▾
            </button>
            <div v-show="showScreenDropdown" class="nav-dropdown-panel">
              <router-link to="/screen" class="dropdown-link" @click="closeScreenDropdown">大屏展示</router-link>
              <router-link to="/multi-screen" class="dropdown-link" @click="closeScreenDropdown">多屏播放</router-link>
            </div>
          </div>
          <div v-if="canAccessConsole" class="nav-menu-dropdown">
            <button type="button" class="btn btn-outline" :class="{ active: showConsoleDropdown }" @click="toggleConsoleDropdown" @blur="onConsoleDropdownBlur">
              控制台 ▾
            </button>
            <div v-show="showConsoleDropdown" class="nav-dropdown-panel">
              <router-link v-if="isJudge || isAdmin" to="/score" class="dropdown-link" @click="closeConsoleDropdown">评委控制台</router-link>
              <router-link v-if="isAdmin" to="/admin" class="dropdown-link" @click="closeConsoleDropdown">管理员控制台</router-link>
            </div>
          </div>
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
        <div v-if="isAdmin" class="side-menu-group">
          <div class="side-menu-group-title">投票结果</div>
          <router-link to="/vote-result?type=popular" class="btn btn-outline" @click="closeSideMenu">特别奖项</router-link>
          <router-link to="/main-awards" class="btn btn-outline" @click="closeSideMenu">主奖项</router-link>
        </div>
        <div class="side-menu-group">
          <div class="side-menu-group-title">展示</div>
          <router-link to="/screen" class="btn btn-outline" @click="closeSideMenu">大屏展示</router-link>
          <router-link to="/multi-screen" class="btn btn-outline" @click="closeSideMenu">多屏播放</router-link>
        </div>
        <template v-if="canAccessConsole">
          <div class="side-menu-group">
            <div class="side-menu-group-title">控制台</div>
            <router-link v-if="isJudge || isAdmin" to="/score" class="btn btn-outline" @click="closeSideMenu">评委控制台</router-link>
            <router-link v-if="isAdmin" to="/admin" class="btn btn-outline" @click="closeSideMenu">管理员控制台</router-link>
          </div>
        </template>
      </div>
    </div>

    <main class="main-content">
      <div class="page-header">
        <h1 class="page-title">十年之约 · 我和D5的未来对话</h1>
        <p class="page-subtitle">释放你的想象力，分享你的创作</p>
        <p class="page-tagline">进入心流之境，体验创作自由</p>
      </div>

      <div class="home-search-wrap">
        <div class="home-search-inner">
          <span class="home-search-icon" aria-hidden="true">🔍</span>
          <input
            v-model.trim="searchKeyword"
            type="search"
            class="home-search-input"
            placeholder="按作品名称或创作者搜索…"
            autocomplete="off"
            aria-label="搜索作品"
          >
          <button
            v-if="searchKeyword"
            type="button"
            class="home-search-clear"
            aria-label="清空"
            @click="searchKeyword = ''"
          >
            ×
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading active">
        <div class="spinner"></div>
        <p style="margin-top: 1rem; color: var(--text-secondary);">加载中...</p>
      </div>

      <div class="masonry-grid" ref="gridRef">
        <div v-for="w in filteredWorks" :key="w.id" class="masonry-item">
          <div class="work-card">
            <WorkVideoPreview :work="w" variant="card" @preview="openVideoPreview(w)" />
            <div class="work-content">
              <div class="work-title">{{ w.title || '未命名作品' }}</div>
              <p v-if="w.description" class="work-description" :title="w.description">{{ w.description }}</p>
              <div class="work-creator-row">
                <img v-if="w.creatorAvatar" :src="w.creatorAvatar" :alt="w.creatorName || ''" class="work-creator-avatar" loading="lazy">
                <span v-else class="work-creator-avatar work-creator-avatar-placeholder">{{ (w.creatorName || '未')[0] }}</span>
                <span class="work-creator-name">{{ w.creatorName || '未知' }}</span>
              </div>
              <div class="work-footer">
                <div class="work-votes"><span>{{ w.voteCount ?? 0 }}</span></div>
                <div v-if="w.hasVoted && isVoteOpen" class="work-vote-done">
                  <span class="vote-status-text">已投票</span>
                  <button
                    type="button"
                    class="vote-btn-cancel-text"
                    title="取消投票"
                    @click.stop="openCancelConfirm(w)"
                  >
                    取消投票
                  </button>
                </div>
                <button
                  v-else
                  type="button"
                  :class="['vote-btn', w.hasVoted && 'voted', w.isOwner && 'own-work']"
                  :disabled="w.hasVoted || w.isOwner || !isVoteOpen || (userVoteCount >= maxVotesPerUser && !w.hasVoted && !w.isOwner)"
                  :title="!isVoteOpen ? voteClosedTip : (userVoteCount >= maxVotesPerUser ? `每人每天最多可投 ${maxVotesPerUser} 票，您今日已投满` : undefined)"
                  @click.stop="handleVote(w)"
                >
                  {{ w.hasVoted ? '已投票' : w.isOwner ? '自己的作品' : !isVoteOpen ? '未开放' : userVoteCount >= maxVotesPerUser ? '今日已达上限' : '投票' }}
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
      <div v-else-if="!loading && filteredWorks.length === 0" class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>未找到匹配作品</h3>
        <p>试试其他关键词，或清空搜索查看全部</p>
      </div>
    </main>

    <WorkVideoModal :show="videoModalOpen" :work="previewWork" @close="closeVideoModal" />

    <!-- 取消投票二次确认弹框 -->
    <Teleport to="body">
      <Transition name="cancel-confirm-fade">
        <div
          v-show="cancelConfirm.show"
          class="cancel-confirm-overlay"
          @click.self="closeCancelConfirm"
        >
          <div class="cancel-confirm-card">
            <div class="cancel-confirm-icon-wrap">
              <span class="cancel-confirm-icon" aria-hidden="true">♥</span>
              <span class="cancel-confirm-icon cancel-confirm-icon-slash" aria-hidden="true">／</span>
            </div>
            <h3 class="cancel-confirm-title">取消投票</h3>
            <p class="cancel-confirm-desc">
              确定要取消对<span class="cancel-confirm-work-title">《{{ cancelConfirm.work?.title || '该作品' }}》</span>的投票吗？取消后可以重新投票给其他作品。
            </p>
            <div class="cancel-confirm-actions">
              <button
                type="button"
                class="cancel-confirm-btn cancel-confirm-btn-ghost"
                :disabled="cancelConfirm.loading"
                @click="closeCancelConfirm"
              >
                再想想
              </button>
              <button
                type="button"
                class="cancel-confirm-btn cancel-confirm-btn-danger"
                :disabled="cancelConfirm.loading"
                @click="confirmCancelVote"
              >
                <span v-if="cancelConfirm.loading" class="cancel-confirm-spinner"></span>
                <span v-else>确定取消</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="tip-modal" :class="{ active: tipModal.show }" @click.self="closeTipModal">
      <div class="tip-modal-content">
        <div class="tip-modal-icon" :class="tipModal.type">{{ tipModal.icon }}</div>
        <h3 class="tip-modal-title">{{ tipModal.title }}</h3>
        <p class="tip-modal-message">{{ tipModal.message }}</p>
        <div class="tip-modal-actions">
          <template v-if="tipModal.primaryText">
            <button type="button" class="tip-modal-btn tip-modal-btn-secondary" @click="onTipSecondary">{{ tipModal.secondaryText || '取消' }}</button>
            <button type="button" class="tip-modal-btn" @click="onTipPrimary">{{ tipModal.primaryText }}</button>
          </template>
          <button v-else type="button" class="tip-modal-btn" @click="closeTipModal">确定</button>
        </div>
      </div>
    </div>

    <router-link to="/upload" class="fab" title="上传作品">+</router-link>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkVideoPreview from '../components/WorkVideoPreview.vue';
import WorkVideoModal from '../components/WorkVideoModal.vue';
import { useAuth } from '../composables/useAuth';
import { getWorks } from '../api/works';
import { getUserVoteCount, vote as apiVote, cancelVote as apiCancelVote } from '../api/vote';
import { getScreenConfig } from '../api/screenConfig';
import { exchangeCode } from '../api/auth';

const route = useRoute();
const router = useRouter();
const { user, isLoggedIn, isAdmin, isJudge, setToken, checkAuth, logout } = useAuth();

const loading = ref(true);
const works = ref([]);
const searchKeyword = ref('');
/** 按作品名称、创作者模糊筛选（当前页数据） */
const filteredWorks = computed(() => {
  const kw = (searchKeyword.value || '').trim().toLowerCase();
  if (!kw) return works.value;
  return works.value.filter((w) => {
    const title = (w.title || '').toLowerCase();
    const creator = (w.creatorName || '').toLowerCase();
    return title.includes(kw) || creator.includes(kw);
  });
});
const userVoteCount = ref(0);
/** 每人每天最多投票数（从管理员配置读取，1–100，按中国时区） */
const maxVotesPerUser = ref(1);
/** 投票开放时间（时间戳 ms），null 表示不限制 */
const voteOpenStart = ref(null);
const voteOpenEnd = ref(null);
/** 当前是否在投票开放时间内 */
const isVoteOpen = computed(() => {
  const now = Date.now();
  const start = voteOpenStart.value;
  const end = voteOpenEnd.value;
  if (start == null && end == null) return true;
  if (start != null && now < start) return false;
  if (end != null && now > end) return false;
  return true;
});
/** 投票未开放时的提示文案 */
const voteClosedTip = computed(() => {
  const now = Date.now();
  const start = voteOpenStart.value;
  const end = voteOpenEnd.value;
  if (start != null && now < start) return `投票将于 ${new Date(start).toLocaleString('zh-CN')} 开始`;
  if (end != null && now > end) return '投票已结束';
  return '';
});
const showUserDropdown = ref(false);
const showSideUserDropdown = ref(false);
const showVoteResultDropdown = ref(false);
const showScreenDropdown = ref(false);
const showConsoleDropdown = ref(false);
const sideMenuOpen = ref(false);
/** 是否可访问控制台（评委或管理员） */
const canAccessConsole = computed(() => isJudge.value || isAdmin.value);
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

/** 取消投票二次确认弹框 */
const cancelConfirm = reactive({
  show: false,
  work: null,
  loading: false,
});
function openCancelConfirm(work) {
  if (!work?.id || !work?.hasVoted) return;
  cancelConfirm.work = work;
  cancelConfirm.show = true;
  cancelConfirm.loading = false;
}
function closeCancelConfirm() {
  if (cancelConfirm.loading) return;
  cancelConfirm.show = false;
  cancelConfirm.work = null;
}
async function confirmCancelVote() {
  const w = cancelConfirm.work;
  if (!w?.id) return;
  cancelConfirm.loading = true;
  try {
    const res = await apiCancelVote(w.id);
    if (res.success) {
      await loadWorks({ silent: true });
      cancelConfirm.loading = false;
      closeCancelConfirm();
      showTipModal('已取消投票，可以重新投票给其他作品', 'success', '取消成功');
    } else {
      cancelConfirm.loading = false;
      closeCancelConfirm();
      showTipModal(res.error?.message || '取消失败', 'error', '取消失败');
    }
  } catch {
    cancelConfirm.loading = false;
    closeCancelConfirm();
    showTipModal('取消失败，请重试', 'error', '取消失败');
  } finally {
    cancelConfirm.loading = false;
  }
}

const tipModal = reactive({
  show: false,
  type: 'info',
  icon: 'ℹ️',
  title: '提示',
  message: '',
  primaryText: '',
  secondaryText: '',
  onPrimary: null,
});
function showTipModal(message, type = 'info', title = '提示', primaryText = '', onPrimary = null, secondaryText = '再逛逛') {
  tipModal.message = message;
  tipModal.type = type;
  tipModal.title = title;
  tipModal.icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  tipModal.primaryText = primaryText;
  tipModal.secondaryText = secondaryText;
  tipModal.onPrimary = onPrimary;
  tipModal.show = true;
}
function closeTipModal() {
  tipModal.show = false;
  tipModal.primaryText = '';
  tipModal.onPrimary = null;
}
function onTipPrimary() {
  if (typeof tipModal.onPrimary === 'function') tipModal.onPrimary();
  closeTipModal();
}
function onTipSecondary() {
  closeTipModal();
}

async function loadTheme() {
  try {
    const res = await getScreenConfig();
    if (res.success && res.data) {
      if (res.data.theme) applyTheme(res.data.theme);
      const n = res.data.maxVotesPerUser != null ? Number(res.data.maxVotesPerUser) : 1;
      maxVotesPerUser.value = Math.min(100, Math.max(1, n));
      voteOpenStart.value = res.data.voteOpenStart != null ? Number(res.data.voteOpenStart) : null;
      voteOpenEnd.value = res.data.voteOpenEnd != null ? Number(res.data.voteOpenEnd) : null;
    }
  } catch {}
}

function toggleUserMenu() {
  showUserDropdown.value = !showUserDropdown.value;
  showVoteResultDropdown.value = false;
  showScreenDropdown.value = false;
  showConsoleDropdown.value = false;
}
function toggleSideUserMenu() {
  showSideUserDropdown.value = !showSideUserDropdown.value;
}
function toggleVoteResultDropdown() {
  showVoteResultDropdown.value = !showVoteResultDropdown.value;
  if (showVoteResultDropdown.value) {
    showUserDropdown.value = false;
    showScreenDropdown.value = false;
    showConsoleDropdown.value = false;
  }
}
function closeVoteResultDropdown() {
  showVoteResultDropdown.value = false;
}
function onVoteResultDropdownBlur() {
  setTimeout(() => { showVoteResultDropdown.value = false; }, 150);
}
function toggleScreenDropdown() {
  showScreenDropdown.value = !showScreenDropdown.value;
  if (showScreenDropdown.value) {
    showUserDropdown.value = false;
    showVoteResultDropdown.value = false;
    showConsoleDropdown.value = false;
  }
}
function closeScreenDropdown() {
  showScreenDropdown.value = false;
}
function onScreenDropdownBlur() {
  setTimeout(() => { showScreenDropdown.value = false; }, 150);
}
function toggleConsoleDropdown() {
  showConsoleDropdown.value = !showConsoleDropdown.value;
  if (showConsoleDropdown.value) {
    showUserDropdown.value = false;
    showVoteResultDropdown.value = false;
    showScreenDropdown.value = false;
  }
}
function closeConsoleDropdown() {
  showConsoleDropdown.value = false;
}
function onConsoleDropdownBlur() {
  setTimeout(() => { showConsoleDropdown.value = false; }, 150);
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

/** 作品列表项：后端已返回 voteCount、hasVoted，此处只补 isOwner */
function toDisplayItem(work) {
  return {
    ...work,
    voteCount: work.voteCount ?? 0,
    hasVoted: !!work.hasVoted,
    isOwner: user.value && work.userId === user.value.userid,
  };
}

/** @param {{ silent?: boolean }} opts - silent 为 true 时不显示全屏 loading（用于投票/取消投票后刷新） */
async function loadWorks(opts = {}) {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!opts.silent) loading.value = true;
  try {
    const worksData = await getWorks({ page: 1, limit: 100 });
    const items = worksData?.data?.items ?? [];
    if (!worksData?.success || !Array.isArray(items) || items.length === 0) {
      works.value = [];
      return;
    }
    if (!token) userVoteCount.value = 0;
    // 按作品 id 去重，避免同一视频在列表中重复出现导致多次加载
    const seenIds = new Set();
    const uniqueItems = items.filter((w) => {
      const id = w.id;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    works.value = uniqueItems.map((w) => toDisplayItem(w));

    if (token) {
      try {
        const countRes = await getUserVoteCount();
        if (countRes.success && countRes.data) userVoteCount.value = countRes.data.count ?? 0;
      } catch {
        userVoteCount.value = 0;
      }
    }
  } catch {
    works.value = [];
  } finally {
    if (!opts.silent) loading.value = false;
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
  if (!isVoteOpen.value) {
    showTipModal(voteClosedTip.value || '当前不在投票开放时间内', 'info', '投票未开放');
    return;
  }
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (!token) {
    showTipModal('请先登录后才能投票哦～', 'info', '登录提示', '去登录', () => router.push({ name: 'Login' }), '再逛逛');
    return;
  }
  if (userVoteCount.value >= maxVotesPerUser.value) {
    showTipModal(`每人每天最多可投 ${maxVotesPerUser.value} 票，您今日已投满`, 'info', '投票已达上限');
    return;
  }
  try {
    const res = await apiVote(w.id);
    if (res.success) {
      await loadWorks({ silent: true });
    } else {
      showTipModal(res.error?.message || '投票失败', 'error', '投票失败');
    }
  } catch {
    showTipModal('投票失败，请重试', 'error', '投票失败');
  }
}

onMounted(async () => {
  try {
    await loadTheme();
    // 钉钉回调带 token：可能落在 hash 前 (?token=xxx#/) 或 hash 内 (#/?token=xxx)，两处都读
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tokenFromUrl =
      route.query.token || (searchParams && searchParams.get('token'));
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      // 清掉 URL 上的 token，避免暴露且刷新重复用
      const path = window.location.pathname || '/';
      const hash = window.location.hash || '#/';
      window.history.replaceState({}, document.title, path + hash);
    } else {
      // 钉钉回调带 code/authCode：可能落在 hash 前 (?code=xxx#/) 或 hash 内 (#/?code=xxx)，两处都读
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
            const path = window.location.pathname || '/';
            const hash = window.location.hash || '#/';
            window.history.replaceState({}, document.title, path + hash);
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

<style scoped>
/* 取消投票二次确认弹框 */
.cancel-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.cancel-confirm-fade-enter-active,
.cancel-confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}
.cancel-confirm-fade-enter-active .cancel-confirm-card,
.cancel-confirm-fade-leave-active .cancel-confirm-card {
  transition: transform 0.25s ease;
}
.cancel-confirm-fade-enter-from,
.cancel-confirm-fade-leave-to {
  opacity: 0;
}
.cancel-confirm-fade-enter-from .cancel-confirm-card,
.cancel-confirm-fade-leave-to .cancel-confirm-card {
  transform: scale(0.95) translateY(-8px);
}
.cancel-confirm-card {
  background: #fff;
  border-radius: 1rem;
  padding: 1.75rem 1.5rem;
  max-width: 380px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
  text-align: center;
}
.cancel-confirm-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: 1rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}
.cancel-confirm-icon {
  font-size: 1.75rem;
  color: #ef4444;
  line-height: 1;
}
.cancel-confirm-icon-slash {
  position: absolute;
  font-size: 1.25rem;
  font-weight: 700;
  color: #dc2626;
  transform: rotate(-25deg);
}
.cancel-confirm-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem;
}
.cancel-confirm-desc {
  font-size: 0.9375rem;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}
.cancel-confirm-work-title {
  color: var(--primary-color, #2563eb);
  font-weight: 600;
}
.cancel-confirm-actions {
  display: flex;
  gap: 0.75rem;
}
.cancel-confirm-btn {
  flex: 1;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
}
.cancel-confirm-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
.cancel-confirm-btn-ghost {
  background: #f1f5f9;
  color: #475569;
}
.cancel-confirm-btn-ghost:hover:not(:disabled) {
  background: #e2e8f0;
}
.cancel-confirm-btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #fff;
}
.cancel-confirm-btn-danger:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}
.cancel-confirm-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: cancelConfirmSpin 0.7s linear infinite;
}
@keyframes cancelConfirmSpin {
  to { transform: rotate(360deg); }
}
/* 已投票 + 取消投票 一组 */
.work-vote-done {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.vote-status-text {
  padding: 0.5rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 600;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}
.vote-btn-cancel-text {
  padding: 0.5rem 0.75rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--border-color, #e2e8f0);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.vote-btn-cancel-text:hover {
  color: #ef4444;
  border-color: #fecaca;
  background: #fef2f2;
}

.tip-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center; padding: 2rem; }
.tip-modal.active { display: flex; }
.tip-modal-content { background: white; border-radius: 1rem; padding: 2rem; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; animation: tipSlideUp 0.3s ease-out; }
@keyframes tipSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.tip-modal-icon { font-size: 3rem; margin-bottom: 1rem; }
.tip-modal-icon.success { color: #10b981; }
.tip-modal-icon.error { color: #ef4444; }
.tip-modal-icon.info { color: var(--primary-color, #2563eb); }
.tip-modal-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #1f2937; }
.tip-modal-message { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
.tip-modal-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
.tip-modal-actions .tip-modal-btn { flex: 1; }
.tip-modal-btn { width: 100%; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; border: none; cursor: pointer; transition: all 0.2s ease; background: var(--gradient, linear-gradient(135deg, #1e40af 0%, #2563eb 100%)); color: white; }
.tip-modal-btn:hover { opacity: 0.95; transform: translateY(-1px); }
.tip-modal-btn-secondary { background: #f3f4f6; color: #374151; }
.tip-modal-btn-secondary:hover { background: #e5e7eb; }
</style>
