<template>
  <div class="screen-full">
    <router-link to="/" class="logo-exit" title="返回首页">
      <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
    </router-link>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="items.length === 0" class="empty-state">
      <div style="font-size: 5rem; margin-bottom: 1rem;">📺</div>
      <h2>暂无作品</h2>
      <p style="opacity: 0.8; margin-top: 0.5rem;">请先上传作品</p>
    </div>

    <div
      v-else
      ref="gridRef"
      class="grid-container"
      :class="gridClass"
      :style="gridStyle"
    >
      <div v-for="(_, cellIndex) in totalCells" :key="cellIndex" class="video-cell">
        <video muted playsinline></video>
        <div class="video-info"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { getScreenConfig } from '../api/screenConfig';
import { getWorks } from '../api/works';

const layoutMap = { '2x2': 'grid-2x2', '2x3': 'grid-2x3', '3x2': 'grid-3x2', '3x3': 'grid-3x3', '4x4': 'grid-4x4' };

const loading = ref(true);
const config = ref({ gridLayout: '2x2' });
const items = ref([]);
const gridRef = ref(null);

const parts = computed(() => (config.value.gridLayout || '2x2').split('x').map(Number));
const rows = computed(() => parts.value[0] || 2);
const cols = computed(() => parts.value[1] || 2);
const totalCells = computed(() => rows.value * cols.value);
const gridClass = computed(() => layoutMap[config.value.gridLayout] || 'grid-2x2');
const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`,
  gridTemplateRows: `repeat(${rows.value}, 1fr)`,
}));

onMounted(async () => {
  try {
    const [configRes, worksRes] = await Promise.all([
      getScreenConfig(),
      getWorks({ page: 1, limit: 1000 }),
    ]);
    if (configRes.success && configRes.data) {
      config.value = configRes.data;
    }
    if (worksRes.success && Array.isArray(worksRes.data?.items)) {
      items.value = worksRes.data.items;
    }
  } catch {
    items.value = [];
  } finally {
    loading.value = false;
  }
});

watch(
  () => [items.value.length, totalCells.value],
  () => {
    if (items.value.length === 0 || !gridRef.value) return;
    const total = totalCells.value;
    const videos = gridRef.value.querySelectorAll('.video-cell video');
    const infos = gridRef.value.querySelectorAll('.video-info');
    for (let i = 0; i < total && i < videos.length; i++) {
      const queue = items.value.filter((_, j) => j % total === i);
      const video = videos[i];
      const info = infos[i];
      if (!video || !queue.length) continue;
      let idx = 0;
      function playNext() {
        if (queue.length === 0) return;
        const w = queue[idx % queue.length];
        video.src = w.fileUrl;
        if (info) info.textContent = (w.title || '未命名') + ' · ' + (w.creatorName || '');
        video.onended = () => {
          idx++;
          playNext();
        };
        video.play().catch(() => playNext());
      }
      playNext();
    }
  },
  { flush: 'post' }
);
</script>

<style scoped>
.screen-full .loading { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 2000; color: white; }
.screen-full .empty-state { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 2000; color: white; }
.screen-full .spinner { border-color: rgba(255,255,255,0.3); border-top-color: white; }
</style>
