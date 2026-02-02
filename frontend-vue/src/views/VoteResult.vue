<template>
  <div class="vote-result-page">
    <router-link to="/" class="logo-exit" title="返回首页">
      <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
    </router-link>

    <div class="screen-container">
      <div class="content-wrapper">
        <div class="screen-header">
          <h1 class="screen-title">2026年会作品投票结果</h1>
          <p class="screen-subtitle">Top 10 作品展示</p>
          <p style="font-size: 1rem; opacity: 0.8; margin-top: 0.5rem;">见证创作的力量</p>
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
          <div class="podium-section">
            <div
              v-for="(w, idx) in podiumOrder"
              :key="w.id"
              :class="['podium-item', ranks[idx]]"
            >
              <div :class="['podium-rank', ranks[idx]]">{{ rankLabels[idx] }}</div>
              <div class="podium-card">
                <div class="podium-video">
                  <video :src="w.fileUrl" autoplay loop muted></video>
                </div>
                <div class="podium-title">{{ w.title || '未命名作品' }}</div>
                <div class="podium-creator">{{ w.creatorName || '未知' }}</div>
                <div class="podium-votes">{{ w.voteCount ?? 0 }} 票</div>
              </div>
              <div class="podium-height"><span>{{ rankTexts[idx] }}</span></div>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getWorksTop } from '../api/works';
import { getScreenConfig } from '../api/screenConfig';

const loading = ref(true);
const error = ref('');
const works = ref([]);
const refreshTimer = ref(null);

const topThree = computed(() => works.value.slice(0, 3));
const displayOrder = [1, 0, 2];
const ranks = ['second', 'first', 'third'];
const rankLabels = ['🥈', '🥇', '🥉'];
const rankTexts = ['第2名', '第1名', '第3名'];
const podiumOrder = computed(() => displayOrder.map((i) => topThree.value[i]).filter(Boolean));
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

async function loadTheme() {
  try {
    const res = await getScreenConfig();
    if (res.success && res.data?.theme) applyTheme(res.data.theme);
  } catch {}
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await getWorksTop(10);
    if (!res.success || !res.data?.items) {
      error.value = res.error?.message || '加载失败';
      works.value = [];
      return;
    }
    works.value = res.data.items;
  } catch (e) {
    error.value = e.response?.data?.error?.message || '加载失败，请刷新重试';
    works.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
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
</style>
