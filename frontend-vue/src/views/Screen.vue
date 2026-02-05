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

    <div v-else class="screen-player">
      <video
        ref="videoRef"
        muted
        playsinline
        autoplay
        controls
        @ended="playNext"
        @error="onVideoError"
      ></video>
      <div v-if="currentWork" class="video-info">
        <div class="video-info-title">{{ (currentWork.title || '未命名作品').slice(0, 50) }}{{ (currentWork.title || '').length > 50 ? '...' : '' }}</div>
        <div class="video-info-meta">
          <span>{{ currentWork.creatorName || '未知' }}</span>
          <span class="video-info-votes"><span class="video-info-heart">❤️</span>{{ currentWork.voteCount ?? 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { getWorks } from '../api/works';
import { getVoteStats } from '../api/vote';

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 分钟

const loading = ref(true);
const initialized = ref(false);
const worksLatest = ref([]);
const playQueue = ref([]);
const currentWork = ref(null);
const videoRef = ref(null);

/** 播放下一个：从队列取；队列空则从 worksLatest 补充，不打断当前播放逻辑 */
function playNext() {
  if (playQueue.value.length === 0) {
    const list = worksLatest.value;
    if (list.length === 0) return;
    playQueue.value = [...list];
  }

  const work = playQueue.value.shift();
  if (!work || !videoRef.value) return;

  currentWork.value = work;
  videoRef.value.src = work.fileUrl;
  videoRef.value.load();

  const title = work.title || '未命名作品';
  console.log('[大屏展示] 开始播放:', title, '| 作品ID:', work.id);

  videoRef.value.play().catch(() => {
    setTimeout(playNext, 1000);
  });
}

function onVideoError() {
  setTimeout(playNext, 1000);
}

/** 拉取作品（含投票数）；仅首次会初始化队列并开始播放，轮询只更新 worksLatest */
async function loadData() {
  try {
    const worksRes = await getWorks({ page: 1, limit: 1000 });
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
      playQueue.value = [...withVotes];
      initialized.value = true;
      await nextTick();
      playNext();
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

.screen-player {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  box-sizing: border-box;
}
.screen-player video {
  width: 100%;
  max-width: 100%;
  max-height: calc(100vh - 5rem);
  object-fit: contain;
  background: #000;
}

/* 下方悬浮信息：与多屏展示风格一致 */
.video-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.6), transparent);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
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
  font-size: 0.8rem;
  opacity: 0.9;
}
.video-info-votes {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.video-info-heart {
  font-size: 0.75rem;
}
</style>
