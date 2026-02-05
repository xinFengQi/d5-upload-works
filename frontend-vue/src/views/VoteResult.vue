<template>
  <div class="vote-result-page">
    <router-link to="/" class="logo-exit" title="返回首页">
      <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
    </router-link>

    <div class="screen-container">
      <div class="content-wrapper">
        <div class="screen-header">
          <h1 class="screen-title">十年之约 · 我和D5的未来对话</h1>
          <p class="screen-subtitle">{{ awardName }}获得者</p>
          <p class="screen-tagline">人心所向，即是时光的方向。</p>
        </div>

        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p style="margin-top: 1rem;">加载中...</p>
        </div>

        <div v-else-if="error" class="loading">
          <p>{{ error }}</p>
        </div>

        <div v-else-if="works.length === 0" class="loading">
          <p>暂无作品</p>
        </div>

        <template v-else>
          <div :class="['podium-section', 'count-' + podiumCount]">
            <div
              v-for="(item, idx) in podiumItems"
              :key="item.work.id"
              :class="['podium-item', item.rankClass]"
            >
              <div :class="['podium-rank', item.rankClass]">{{ item.rankLabel }}</div>
              <div class="podium-card">
                <div class="podium-video">
                  <WorkVideoPreview :work="item.work" variant="card" :autoplay="true" @preview="openVideoPreview(item.work)" />
                </div>
                <div class="podium-title">{{ item.work.title || '未命名作品' }}</div>
                <div class="podium-creator">{{ item.work.creatorName || '未知' }}</div>
                <div class="podium-votes">{{ item.work.voteCount ?? 0 }} 票</div>
              </div>
              <div class="podium-height"><span>{{ item.rankText }}</span></div>
            </div>
          </div>

          <div v-if="listWorks.length > 0" class="list-section">
            <h2 class="list-title">第 4-10 名</h2>
            <div class="list-items">
              <div v-for="(w, i) in listWorks" :key="w.id" class="list-item">
                <div class="list-rank">{{ i + 4 }}</div>
                <div class="list-info">
                  <div class="list-title-text">{{ w.title || '未命名作品' }}</div>
                  <div class="list-creator">{{ w.creatorName || '未知' }}</div>
                </div>
                <div class="list-votes">{{ w.voteCount ?? 0 }} 票</div>
              </div>
            </div>
          </div>
        </template>

        <button
          v-if="!loading && !error && works.length > 0"
          type="button"
          class="vote-result-detail-btn"
          title="奖励详情"
          @click="openRewardDetail(getAwardByTitle(awardName))"
        >
          <span class="vote-result-detail-icon">🎁</span>
        </button>
      </div>
    </div>

    <WorkVideoModal :show="videoModalOpen" :work="previewWork" @close="closeVideoModal" />

    <div class="reward-detail-modal" :class="{ active: rewardDetailModal.show }" @click.self="closeRewardDetail">
      <div class="reward-detail-content">
        <button type="button" class="reward-detail-close" aria-label="关闭" @click="closeRewardDetail">×</button>
        <template v-if="rewardDetailModal.award">
          <h2 class="reward-detail-title">{{ rewardDetailModal.award.title }}</h2>
          <div v-if="rewardDetailModal.award.images?.length" class="reward-detail-images">
            <img
              v-for="(url, i) in rewardDetailModal.award.images"
              :key="i"
              :src="url"
              :alt="`奖励图片 ${i + 1}`"
              class="reward-detail-img"
              loading="lazy"
            >
          </div>
          <p v-if="rewardDetailModal.award.description" class="reward-detail-desc">{{ rewardDetailModal.award.description }}</p>
          <p v-else-if="!rewardDetailModal.award.images?.length" class="reward-detail-empty">暂无奖励说明，请在管理后台配置</p>
        </template>
        <p v-else class="reward-detail-empty">未找到该奖项配置</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkVideoPreview from '../components/WorkVideoPreview.vue';
import WorkVideoModal from '../components/WorkVideoModal.vue';
import { getWorksByAward } from '../api/works';
import { getScreenConfig } from '../api/screenConfig';
import { useAuth } from '../composables/useAuth';

const route = useRoute();
const router = useRouter();
const { checkAuth, isAdmin } = useAuth();
const loading = ref(true);
const videoModalOpen = ref(false);
const previewWork = ref(null);
const error = ref('');
const works = ref([]);
const awardName = ref('时光共鸣奖');
const awardLimit = ref(3);
const refreshTimer = ref(null);
const awards = ref([]);
const rewardDetailModal = ref({ show: false, award: null });

/** 当前奖项类型（来自路由 query.type，默认特别奖项/时光共鸣奖） */
const awardType = computed(() => (route.query.type || 'popular').toString().toLowerCase().trim() || 'popular');

const topThree = computed(() => works.value.slice(0, 3));
const podiumCount = computed(() => Math.min(3, topThree.value.length));

/** 颁奖台展示项：根据 1/2/3 个奖项生成顺序与排名文案 */
const podiumItems = computed(() => {
  const list = topThree.value;
  const n = list.length;
  if (n === 0) return [];
  const rankMeta = [
    { class: 'first', label: '🥇', text: '第1名' },
    { class: 'second', label: '🥈', text: '第2名' },
    { class: 'third', label: '🥉', text: '第3名' },
  ];
  if (n === 1) {
    return [{ work: list[0], rankClass: rankMeta[0].class, rankLabel: rankMeta[0].label, rankText: rankMeta[0].text }];
  }
  if (n === 2) {
    return [
      { work: list[1], rankClass: rankMeta[1].class, rankLabel: rankMeta[1].label, rankText: rankMeta[1].text },
      { work: list[0], rankClass: rankMeta[0].class, rankLabel: rankMeta[0].label, rankText: rankMeta[0].text },
    ];
  }
  return [
    { work: list[1], rankClass: rankMeta[1].class, rankLabel: rankMeta[1].label, rankText: rankMeta[1].text },
    { work: list[0], rankClass: rankMeta[0].class, rankLabel: rankMeta[0].label, rankText: rankMeta[0].text },
    { work: list[2], rankClass: rankMeta[2].class, rankLabel: rankMeta[2].label, rankText: rankMeta[2].text },
  ];
});

const listWorks = computed(() => works.value.slice(3, 10));

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

function getAwardByTitle(title) {
  const list = awards.value;
  if (!Array.isArray(list)) return null;
  return list.find((a) => a && String(a.title) === title) || null;
}

function openRewardDetail(award) {
  rewardDetailModal.value = { show: true, award };
}

function closeRewardDetail() {
  rewardDetailModal.value = { show: false, award: null };
}

async function loadTheme() {
  try {
    const res = await getScreenConfig();
    if (res.success && res.data) {
      if (res.data.theme) applyTheme(res.data.theme);
      if (Array.isArray(res.data.awards)) awards.value = res.data.awards;
    }
  } catch {}
}

async function load() {
  loading.value = true;
  error.value = '';
  const type = awardType.value;
  try {
    const res = await getWorksByAward(type, type === 'popular' ? 3 : 10);
    if (!res.success || !res.data?.items) {
      error.value = res.error?.message || '加载失败';
      works.value = [];
      return;
    }
    works.value = res.data.items;
    awardName.value = res.data.awardName || '时光共鸣奖';
    awardLimit.value = res.data.items.length;
  } catch (e) {
    error.value = e.response?.data?.error?.message || '加载失败，请刷新重试';
    works.value = [];
  } finally {
    loading.value = false;
  }
}

watch(awardType, () => { load(); });

onMounted(async () => {
  await checkAuth();
  if (!isAdmin.value) {
    router.replace('/');
    return;
  }
  document.body.classList.add('vote-result-page');
  await loadTheme();
  await load();
  refreshTimer.value = setInterval(load, 30000);
});

onUnmounted(() => {
  document.body.classList.remove('vote-result-page');
  if (refreshTimer.value) clearInterval(refreshTimer.value);
});
</script>

<style scoped>
/* 与 vote-result-page.ts 一致：根节点占满并继承渐变，避免 body class 未及时应用时白底 */
.vote-result-page {
  min-height: 100vh;
  background: var(--gradient);
  color: white;
}

.vote-result-detail-btn {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  font-size: 0.9375rem;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 2rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.vote-result-detail-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  border-color: rgba(255, 255, 255, 0.8);
  transform: scale(1.03);
}
.vote-result-detail-icon {
  font-size: 1.125rem;
  line-height: 1;
}


.reward-detail-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
}
.reward-detail-modal.active {
  opacity: 1;
  visibility: visible;
}
.reward-detail-content {
  position: relative;
  width: 70vw;
  height: 70vh;
  max-width: 90vw;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 1rem;
  padding: 1.5rem 2rem 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  color: var(--text-primary, #1e293b);
}
.reward-detail-content::-webkit-scrollbar {
  display: none;
}
.reward-detail-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 2rem;
  height: 2rem;
  padding: 0;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text-secondary, #64748b);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: color 0.2s, background 0.2s;
  z-index: 1;
}
.reward-detail-close:hover {
  color: var(--text-primary, #1e293b);
  background: var(--bg-secondary, #f1f5f9);
}
.reward-detail-title {
  margin: 0 0 1.25rem;
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--text-primary, #1e293b);
  text-align: center;
  padding-right: 2.5rem;
  flex-shrink: 0;
}
.reward-detail-images {
  display: flex;
  flex-wrap: nowrap;
  gap: 1rem;
  justify-content: center;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 0.5rem;
  margin-bottom: 1.25rem;
  flex-shrink: 0;
}
.reward-detail-images::-webkit-scrollbar {
  display: none;
}
.reward-detail-img {
  height: 350px;
  width: auto;
  max-width: 480px;
  object-fit: contain;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color, #e2e8f0);
}
.reward-detail-desc {
  margin: 0;
  font-size: 1.875rem;
  line-height: 1.7;
  color: var(--text-secondary, #475569);
  white-space: pre-wrap;
  word-break: break-word;
  text-align: center;
  text-transform: uppercase;
  flex: 1;
  min-height: 0;
}
.reward-detail-empty {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-secondary, #64748b);
  text-align: center;
  text-transform: uppercase;
}
</style>
