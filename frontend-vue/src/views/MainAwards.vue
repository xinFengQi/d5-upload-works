<template>
  <div class="main-awards-page">
    <router-link to="/" class="logo-exit" title="返回首页">
      <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
    </router-link>

    <div v-if="loading" class="main-awards-loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>
    <div v-else ref="scrollWrap" class="main-awards-scroll-wrap">
      <!-- 第一屏：十年致敬奖（1名） -->
      <section class="main-award-section">
        <div class="main-award-header">
          <h1 class="main-award-title">十年之约 · 我的D5的未来对话</h1>
          <p class="main-award-name">十年致敬奖获得者</p>
          <p class="main-award-tagline">致敬坚守，定义未来。</p>
        </div>
        <div class="main-award-cards">
          <div v-for="(work, idx) in award1Works" :key="work.id" class="main-award-card">
            <div class="main-award-card-video">
              <WorkVideoPreview :work="work" variant="card" :autoplay="true" @preview="openVideoPreview(work)" />
            </div>
            <div class="main-award-card-title" :title="work.title || '未命名作品'">{{ work.title || '未命名作品' }}</div>
            <div class="main-award-card-creator" :title="work.creatorName || '未知'">{{ work.creatorName || '未知' }}</div>
            <div class="main-award-card-score">综合得分 {{ formatScore(work.judgeScore) }}</div>
          </div>
        </div>
      </section>

      <!-- 第二屏：时光雕刻家奖（2名） -->
      <section class="main-award-section">
        <div class="main-award-header">
          <h1 class="main-award-title">十年之约 · 我的D5的未来对话</h1>
          <p class="main-award-name">时光雕刻家奖获得者</p>
          <p class="main-award-tagline">用代码与光影，雕琢时光的形状。</p>
        </div>
        <div class="main-award-cards">
          <div v-for="(work, idx) in award2Works" :key="work.id" class="main-award-card">
            <div class="main-award-card-video">
              <WorkVideoPreview :work="work" variant="card" :autoplay="true" @preview="openVideoPreview(work)" />
            </div>
            <div class="main-award-card-title" :title="work.title || '未命名作品'">{{ work.title || '未命名作品' }}</div>
            <div class="main-award-card-creator" :title="work.creatorName || '未知'">{{ work.creatorName || '未知' }}</div>
            <div class="main-award-card-score">综合得分 {{ formatScore(work.judgeScore) }}</div>
          </div>
        </div>
      </section>

      <!-- 第三屏：未来可期奖（3名） -->
      <section class="main-award-section">
        <div class="main-award-header">
          <h1 class="main-award-title">十年之约 · 我的D5的未来对话</h1>
          <p class="main-award-name">未来可期奖获得者</p>
          <p class="main-award-tagline">从创意种子，到价值果实。</p>
        </div>
        <div class="main-award-cards">
          <div v-for="(work, idx) in award3Works" :key="work.id" class="main-award-card">
            <div class="main-award-card-video">
              <WorkVideoPreview :work="work" variant="card" :autoplay="true" @preview="openVideoPreview(work)" />
            </div>
            <div class="main-award-card-title" :title="work.title || '未命名作品'">{{ work.title || '未命名作品' }}</div>
            <div class="main-award-card-creator" :title="work.creatorName || '未知'">{{ work.creatorName || '未知' }}</div>
            <div class="main-award-card-score">综合得分 {{ formatScore(work.judgeScore) }}</div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="!loading" class="main-awards-pager">
      <button
        type="button"
        class="main-awards-pager-btn"
        title="上一页"
        :disabled="currentPage <= 0"
        aria-label="上一页"
        @click="goPrev"
      >
        <span class="main-awards-pager-icon" aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        class="main-awards-pager-btn"
        title="下一页"
        :disabled="currentPage >= TOTAL_PAGES - 1"
        aria-label="下一页"
        @click="goNext"
      >
        <span class="main-awards-pager-icon" aria-hidden="true">›</span>
      </button>
    </div>

    <WorkVideoModal :show="videoModalOpen" :work="previewWork" @close="closeVideoModal" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import WorkVideoPreview from '../components/WorkVideoPreview.vue';
import WorkVideoModal from '../components/WorkVideoModal.vue';
import { getWorksByJudgeRank } from '../api/works';
import { getScreenConfig } from '../api/screenConfig';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { checkAuth, isAdmin } = useAuth();
const loading = ref(true);
const videoModalOpen = ref(false);
const previewWork = ref(null);
const works = ref([]);
const refreshTimer = ref(null);
const scrollWrap = ref(null);
const currentPage = ref(0);
const TOTAL_PAGES = 3;
/** 滚轮翻页冷却（ms），一次操作只翻一页，避免连续滚轮触发多页 */
const WHEEL_COOLDOWN_MS = 1200;
let wheelCooldownUntil = 0;

/** 十年致敬奖：综合得分排名 1（1 名） */
const award1Works = computed(() => works.value.slice(0, 1));
/** 时光雕刻家奖：排名 2-3（2 名） */
const award2Works = computed(() => works.value.slice(1, 3));
/** 未来可期奖：排名 4-6（3 名） */
const award3Works = computed(() => works.value.slice(3, 6));

function formatScore(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}

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

function openVideoPreview(work) {
  if (!work?.fileUrl && !work?.file_url) return;
  previewWork.value = work;
  videoModalOpen.value = true;
}

function closeVideoModal() {
  previewWork.value = null;
  videoModalOpen.value = false;
}

async function loadTheme() {
  try {
    const res = await getScreenConfig();
    if (res.success && res.data?.theme) applyTheme(res.data.theme);
  } catch {}
}

async function load() {
  loading.value = true;
  try {
    const res = await getWorksByJudgeRank(6);
    if (res.success && Array.isArray(res.data?.items)) {
      works.value = res.data.items;
    } else {
      works.value = [];
    }
  } catch {
    works.value = [];
  } finally {
    loading.value = false;
  }
}

function updateCurrentPage() {
  const el = scrollWrap.value;
  if (!el) return;
  const vh = window.innerHeight;
  currentPage.value = Math.round(el.scrollTop / vh);
  currentPage.value = Math.max(0, Math.min(TOTAL_PAGES - 1, currentPage.value));
}

function goToPage(page) {
  const el = scrollWrap.value;
  if (!el) return;
  const vh = window.innerHeight;
  const target = Math.max(0, Math.min(TOTAL_PAGES - 1, page)) * vh;
  el.scrollTo({ top: target, behavior: 'smooth' });
}

function goPrev() {
  if (currentPage.value <= 0) return;
  goToPage(currentPage.value - 1);
}

function goNext() {
  if (currentPage.value >= TOTAL_PAGES - 1) return;
  goToPage(currentPage.value + 1);
}

function handleWheel(e) {
  const el = scrollWrap.value;
  if (!el || videoModalOpen.value) return;
  e.preventDefault();
  const now = Date.now();
  if (now < wheelCooldownUntil) return;
  const vh = window.innerHeight;
  const current = el.scrollTop;
  const page = Math.round(current / vh);
  let nextPage = e.deltaY > 0 ? page + 1 : page - 1;
  nextPage = Math.max(0, Math.min(TOTAL_PAGES - 1, nextPage));
  if (nextPage === page) return;
  wheelCooldownUntil = now + WHEEL_COOLDOWN_MS;
  el.scrollTo({ top: nextPage * vh, behavior: 'auto' });
}

onMounted(async () => {
  await checkAuth();
  if (!isAdmin.value) {
    router.replace('/');
    return;
  }
  document.body.classList.add('main-awards-page');
  await loadTheme();
  await load();
  refreshTimer.value = setInterval(load, 30000);
  await nextTick();
  const el = scrollWrap.value;
  if (el) {
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', updateCurrentPage);
    updateCurrentPage();
  }
});

onUnmounted(() => {
  const el = scrollWrap.value;
  if (el) {
    el.removeEventListener('wheel', handleWheel);
    el.removeEventListener('scroll', updateCurrentPage);
  }
  document.body.classList.remove('main-awards-page');
  if (refreshTimer.value) clearInterval(refreshTimer.value);
});
</script>

<style scoped>
.main-awards-page {
  height: 100vh;
  overflow: hidden;
  background: var(--gradient);
  color: white;
  position: relative;
}
.main-awards-scroll-wrap {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}
.main-awards-scroll-wrap::-webkit-scrollbar {
  width: 0;
  display: none;
}
.main-awards-scroll-wrap {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.main-awards-loading {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: white;
}
.main-awards-loading .spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: mainAwardsSpin 0.8s linear infinite;
}
@keyframes mainAwardsSpin {
  to { transform: rotate(360deg); }
}
.main-award-section {
  height: 100vh;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  box-sizing: border-box;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}
.main-award-header {
  text-align: center;
  margin-bottom: 2rem;
  flex-shrink: 0;
}
.main-award-title {
  font-size: clamp(1.25rem, 4vh, 2.5rem);
  font-weight: 800;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}
.main-award-name {
  font-size: clamp(1rem, 2.5vh, 1.5rem);
  opacity: 0.95;
  margin-bottom: 0.5rem;
}
.main-award-tagline {
  font-size: clamp(0.875rem, 1.8vh, 1rem);
  opacity: 0.85;
  font-style: italic;
  margin-bottom: 0;
}
.main-award-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: stretch;
  gap: 2rem;
  max-width: 1600px;
  width: 100%;
  padding: 0 1rem;
}
/* 第一屏：1 张卡片，放大展示 */
.main-award-section:first-of-type .main-award-cards {
  max-width: 900px;
}
.main-award-section:first-of-type .main-award-card {
  max-width: 560px;
  padding: 1.5rem;
  border-radius: 1.25rem;
}
.main-award-section:first-of-type .main-award-card-video {
  margin-bottom: 1rem;
  border-radius: 0.75rem;
}
.main-award-section:first-of-type .main-award-card-title {
  font-size: 1.375rem;
}
.main-award-section:first-of-type .main-award-card-creator,
.main-award-section:first-of-type .main-award-card-score {
  font-size: 1.0625rem;
}
/* 第二屏：2 张卡片，并排放大 */
.main-award-section:nth-of-type(2) .main-award-cards {
  max-width: 1200px;
}
.main-award-section:nth-of-type(2) .main-award-card {
  max-width: 520px;
  padding: 1.25rem;
  border-radius: 1.25rem;
}
.main-award-section:nth-of-type(2) .main-award-card-video {
  margin-bottom: 1rem;
  border-radius: 0.75rem;
}
.main-award-section:nth-of-type(2) .main-award-card-title {
  font-size: 1.25rem;
}
.main-award-card {
  background: white;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  max-width: 420px;
  display: flex;
  flex-direction: column;
}
.main-award-card-video {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #000;
  margin-bottom: 0.75rem;
}
.main-award-card-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  word-break: break-word;
}
.main-award-card-creator {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.main-award-card-score {
  font-size: 1rem;
  font-weight: 700;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 右下角上一页 / 下一页 */
.main-awards-pager {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 1000;
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.main-awards-pager-btn {
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--primary-color, #2563eb);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
}
.main-awards-pager-btn:hover:not(:disabled) {
  background: white;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.main-awards-pager-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.main-awards-pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.main-awards-pager-icon {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}
</style>
