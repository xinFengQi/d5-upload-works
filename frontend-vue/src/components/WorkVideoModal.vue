<template>
  <div
    class="work-video-modal"
    :class="{ active: show }"
    @click.self="$emit('close')"
  >
    <div class="work-video-modal-content">
      <button
        type="button"
        class="work-video-modal-close"
        aria-label="关闭"
        @click="$emit('close')"
      >
        ×
      </button>
      <div class="work-video-modal-scroll">
        <video ref="videoRef" controls autoplay playsinline muted></video>
        <div v-if="work" class="work-video-modal-info">
          <h3 class="work-video-modal-title">{{ work.title || '未命名作品' }}</h3>
          <p v-if="work.description" class="work-video-modal-desc">{{ work.description }}</p>
          <div class="work-video-modal-meta">
            <span class="work-video-modal-author">作者：{{ work.creatorName || '未知' }}</span>
            <span class="work-video-modal-votes">{{ work.voteCount ?? 0 }} 票</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, ref, nextTick } from 'vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  /** 当前预览的作品，需包含 fileUrl, title, description?, creatorName?, voteCount? */
  work: { type: Object, default: null },
});

defineEmits(['close']);

const videoRef = ref(null);

function getWorkFileUrl(work) {
  if (!work) return '';
  return work.fileUrl || work.file_url || '';
}

function applyVideoSrc() {
  const el = videoRef.value;
  if (!el) return;
  const url = getWorkFileUrl(props.work);
  if (props.show && url) {
    el.src = url;
    el.load();
    el.play().catch(() => {});
  } else {
    el.pause();
    el.removeAttribute('src');
    el.load();
  }
}

watch(
  () => [props.show, props.work],
  async () => {
    if (props.show && getWorkFileUrl(props.work)) {
      await nextTick();
      applyVideoSrc();
    } else {
      applyVideoSrc();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.work-video-modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 2000;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(8px);
}
.work-video-modal.active {
  display: flex;
}
.work-video-modal-content {
  position: relative;
  max-width: min(720px, 92vw);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-right: 0.5rem;
}
/* 视频+信息区可滚动，避免描述过长把弹层撑得很高；右侧留白，滚动条不贴边 */
.work-video-modal-scroll {
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  align-items: center;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) rgba(255, 255, 255, 0.06);
}
.work-video-modal-scroll::-webkit-scrollbar {
  width: 6px;
}
.work-video-modal-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
}
.work-video-modal-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25);
  border-radius: 3px;
}
.work-video-modal-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
.work-video-modal-content video {
  width: 100%;
  max-height: 65vh;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  background: #000;
  display: block;
}
.work-video-modal-close {
  position: absolute;
  top: -2.5rem;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e293b;
  z-index: 1;
}
.work-video-modal-close:hover {
  background: #fff;
  transform: scale(1.08);
}
/* 下方信息区：深色背景下使用高对比浅色，布局收紧 */
.work-video-modal-info {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.6rem 0 0;
  text-align: left;
}
.work-video-modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 0.35rem;
  line-height: 1.35;
  word-break: break-word;
}
.work-video-modal-desc {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0 0 0.5rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.work-video-modal-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.8125rem;
}
.work-video-modal-author {
  font-weight: 500;
  color: #e2e8f0;
}
.work-video-modal-votes {
  font-weight: 600;
  color: #7dd3fc;
}
</style>
