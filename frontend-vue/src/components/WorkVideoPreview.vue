<template>
  <div
    class="work-video-preview-wrap"
    :class="{ 'work-video-preview-cell': variant === 'cell' }"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <video
      class="work-video-preview-video"
      :src="work?.fileUrl || work?.file_url"
      muted
      preload="metadata"
      playsinline
    ></video>
    <div class="work-video-preview-overlay">
      <span class="work-video-preview-play">▶</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  /** 作品数据，需包含 fileUrl */
  work: {
    type: Object,
    default: () => ({}),
  },
  /** 展示形态：card 卡片大图，cell 表格小格 */
  variant: {
    type: String,
    default: 'card',
    validator: (v) => ['card', 'cell'].includes(v),
  },
});

const emit = defineEmits(['preview']);

function handleClick() {
  emit('preview', props.work);
}
</script>

<style scoped>
.work-video-preview-wrap {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  border-radius: 0.5rem;
  background: #000;
}
/* 让点击落在 overlay/外层，由 wrap 的 @click 统一处理，避免被 video 吞掉 */
.work-video-preview-video {
  pointer-events: none;
  width: 100%;
  display: block;
  object-fit: cover;
  background: #000;
}
.work-video-preview-overlay {
  pointer-events: auto;
}
.work-video-preview-wrap:hover .work-video-preview-overlay,
.work-video-preview-wrap:hover .work-video-preview-play {
  opacity: 1;
}
.work-video-preview-wrap:not(.work-video-preview-cell) .work-video-preview-video {
  aspect-ratio: 16 / 9;
}
.work-video-preview-cell {
  display: inline-block;
  width: 120px;
  height: 68px;
}
.work-video-preview-cell .work-video-preview-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.work-video-preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
}
.work-video-preview-play {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  padding-left: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.work-video-preview-cell .work-video-preview-play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 32px;
  height: 32px;
  font-size: 0.875rem;
  padding-left: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
