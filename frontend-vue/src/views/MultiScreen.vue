<template>
  <div class="screen-full">
    <router-link to="/" class="logo-exit" title="返回首页">
      <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
    </router-link>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="!initialized && worksLatest.length === 0" class="empty-state">
      <div class="empty-state-icon">📺</div>
      <h2>暂无作品</h2>
      <p class="empty-state-hint">请先上传作品</p>
    </div>

    <div
      v-else
      ref="gridRef"
      class="grid-container"
      :class="gridClass"
    >
      <div
        v-for="(_, cellIndex) in totalCells"
        :key="cellIndex"
        class="video-cell"
        :class="{ playing: playingCells.has(cellIndex) }"
      >
        <video muted playsinline></video>
        <div class="video-info" :ref="(el) => setInfoRef(cellIndex, el)"></div>
      </div>
    </div>
    <button
      v-if="initialized && totalCells > 0"
      type="button"
      class="sound-toggle"
      :class="{ muted: soundMuted }"
      :title="soundMuted ? '点击开启声音' : '点击静音'"
      :aria-label="soundMuted ? '开启声音' : '静音'"
      @click="toggleSound"
    >
      <span v-if="soundMuted" class="sound-icon">🔇</span>
      <span v-else class="sound-icon">🔊</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { getScreenConfig } from '../api/screenConfig';
import { getWorks } from '../api/works';
import { getVoteStats } from '../api/vote';

const layoutMap = {
  '2x2': 'grid-2x2',
  '2x3': 'grid-2x3',
  '3x2': 'grid-3x2',
  '3x3': 'grid-3x3',
  '4x4': 'grid-4x4',
};

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 分钟
const STORAGE_KEY_SOUND = 'multi_screen_sound_muted';

const loading = ref(true);
const initialized = ref(false);
const config = ref({ gridLayout: '2x2' });
const worksLatest = ref([]);
const cellQueues = ref([]);
const playingCells = ref(new Set());
const gridRef = ref(null);
const infoRefs = ref({});
/** 是否静音：默认 true 以满足自动播放策略，用户可点击按钮开启声音 */
const soundMuted = ref(true);

function toggleSound() {
  soundMuted.value = !soundMuted.value;
  try {
    localStorage.setItem(STORAGE_KEY_SOUND, soundMuted.value ? '1' : '0');
  } catch {}
  applyMutedToAllVideos();
}

function applyMutedToAllVideos() {
  if (!gridRef.value) return;
  const videos = gridRef.value.querySelectorAll('.video-cell video');
  videos.forEach((v) => { v.muted = soundMuted.value; });
}

const parts = computed(() => (config.value.gridLayout || '2x2').split('x').map(Number));
const rows = computed(() => parts.value[0] || 2);
const cols = computed(() => parts.value[1] || 2);
const totalCells = computed(() => rows.value * cols.value);
const gridClass = computed(() => layoutMap[config.value.gridLayout] || 'grid-2x2');

function setInfoRef(cellIndex, el) {
  if (el) infoRefs.value[cellIndex] = el;
}

function truncateText(text, maxLen) {
  if (!text) return '';
  return text.length <= maxLen ? text : text.slice(0, maxLen) + '...';
}

function getGridSize() {
  return totalCells.value;
}

/** 为每个单元格分配队列：作品 i 放入单元格 i % gridSize */
function buildCellQueues() {
  const size = getGridSize();
  const list = worksLatest.value;
  const queues = [];
  for (let i = 0; i < size; i++) {
    queues.push(list.filter((_, j) => j % size === i));
  }
  cellQueues.value = queues;
}

/** 在指定单元格播放下一个；队列空时从 worksLatest 补充，不打断其他格 */
function playNextInCell(cellIndex) {
  const size = getGridSize();
  let queue = cellQueues.value[cellIndex];
  if (!queue) cellQueues.value[cellIndex] = [];
  queue = cellQueues.value[cellIndex];

  if (queue.length === 0) {
    const list = worksLatest.value;
    if (list.length === 0) return;
    for (let i = 0; i < list.length; i++) {
      if (i % size === cellIndex) queue.push(list[i]);
    }
    if (queue.length === 0) return;
  }

  const work = queue.shift();
  if (!work) return;

  if (!gridRef.value) return;
  const cells = gridRef.value.querySelectorAll('.video-cell');
  const cell = cells[cellIndex];
  const video = cell?.querySelector('video');
  const infoEl = infoRefs.value[cellIndex];

  if (!video) return;

  video.src = work.fileUrl;
  video.muted = soundMuted.value;
  video.load();

  const title = work.title || '未命名作品';
  console.log('[多屏展示] 单元格', cellIndex, '开始播放:', title, '| 作品ID:', work.id);

  if (infoEl) {
    infoEl.innerHTML = `
      <div class="video-info-title">${truncateText(work.title || '未命名作品', 30)}</div>
      <div class="video-info-meta">
        <span>${work.creatorName || '未知'}</span>
        <span class="video-info-votes"><span class="video-info-heart">❤️</span>${work.voteCount ?? 0}</span>
      </div>
    `;
  }

  playingCells.value = new Set([...playingCells.value, cellIndex]);

  video.onended = () => {
    playingCells.value = new Set([...playingCells.value].filter((i) => i !== cellIndex));
    playNextInCell(cellIndex);
  };
  video.onerror = () => {
    playingCells.value = new Set([...playingCells.value].filter((i) => i !== cellIndex));
    setTimeout(() => playNextInCell(cellIndex), 1000);
  };

  video.play().catch(() => {
    setTimeout(() => playNextInCell(cellIndex), 1000);
  });
}

/** 拉取配置 + 作品（含投票数）；仅首次会初始化网格与队列，轮询只更新 worksLatest */
async function loadData() {
  try {
    const [configRes, worksRes] = await Promise.all([
      getScreenConfig(),
      getWorks({ page: 1, limit: 1000 }),
    ]);
    if (configRes.success && configRes.data) {
      config.value = configRes.data;
    }
    const items = worksRes.success && Array.isArray(worksRes.data?.items) ? worksRes.data.items : [];
    if (items.length === 0) {
      if (!initialized.value) {
        loading.value = false;
        worksLatest.value = [];
      }
      return;
    }

    const withVotes = await Promise.all(
      items.map(async (w) => {
        try {
          const res = await getVoteStats(w.id);
          return { ...w, voteCount: res?.success && res?.data ? (res.data.count ?? 0) : 0 };
        } catch {
          return { ...w, voteCount: 0 };
        }
      })
    );
    worksLatest.value = withVotes;

    if (!initialized.value) {
      loading.value = false;
      buildCellQueues();
      initialized.value = true;
      await nextTick();
      for (let i = 0; i < getGridSize(); i++) {
        playNextInCell(i);
      }
    }
  } catch {
    if (!initialized.value) {
      loading.value = false;
      worksLatest.value = [];
    }
  }
}

let pollTimer = null;
onMounted(() => {
  try {
    const v = localStorage.getItem(STORAGE_KEY_SOUND);
    soundMuted.value = v !== '0' && v !== 'false';
  } catch {}
  loadData();
  pollTimer = setInterval(loadData, POLL_INTERVAL_MS);
});
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.screen-full {
  width: 100vw;
  height: 100vh;
  background: #000;
  color: white;
  overflow: hidden;
  position: relative;
}

.logo-exit {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 2000;
  opacity: 0.3;
  transition: opacity 0.3s ease;
  cursor: pointer;
}
.logo-exit:hover {
  opacity: 1;
}
.logo-exit img {
  height: 50px;
  width: auto;
}

.loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2000;
  color: white;
}
.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2000;
  color: white;
}
.empty-state-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}
.empty-state-hint {
  opacity: 0.8;
  margin-top: 0.5rem;
}

.grid-container {
  width: 100vw;
  height: 100vh;
  display: grid;
  gap: 0.25rem;
  padding: 0.25rem;
}
.grid-2x2 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(2, 1fr); }
.grid-2x3 { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); }
.grid-3x2 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); }
.grid-3x3 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
.grid-4x4 { grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }

.video-cell {
  position: relative;
  background: #000;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.3s ease;
}
.video-cell.playing {
  border-color: rgba(37, 99, 235, 0.4);
  box-shadow: 0 0 15px rgba(37, 99, 235, 0.3);
}
.video-cell video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 下方悬浮信息：参考 multi-screen-page.ts */
.video-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.6), transparent);
  padding: 0.75rem 0.5rem;
  font-size: 0.75rem;
  color: white;
  z-index: 10;
}
.video-info-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.video-info-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.7rem;
  opacity: 0.9;
}
.video-info-votes {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.video-info-heart {
  font-size: 0.65rem;
}

.sound-toggle {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 2000;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
}
.sound-toggle:hover {
  background: rgba(0, 0, 0, 0.85);
  transform: scale(1.05);
}
.sound-toggle .sound-icon {
  font-size: 1.5rem;
}
.sound-toggle.muted .sound-icon {
  opacity: 0.8;
}
</style>