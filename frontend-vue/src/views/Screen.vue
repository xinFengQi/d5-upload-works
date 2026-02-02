<template>
  <div class="screen-full">
    <router-link to="/" class="logo-exit" title="返回首页">
      <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
    </router-link>
    <div v-if="loading" id="app">加载中...</div>
    <div v-else-if="works.length === 0" id="app">暂无作品</div>
    <div v-else id="app">
      <h2>{{ currentWork?.title || '未命名' }}</h2>
      <video
        ref="videoRef"
        :src="currentWork?.fileUrl"
        autoplay
        muted
        playsinline
        @ended="next"
      ></video>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { getWorks } from '../api/works';

const loading = ref(true);
const works = ref([]);
const index = ref(0);
const videoRef = ref(null);

const currentWork = computed(() => works.value[index.value % works.value.length] || null);

function next() {
  index.value++;
}

watch(currentWork, (w) => {
  if (!w || !videoRef.value) return;
  videoRef.value.src = w.fileUrl;
  videoRef.value.load();
  videoRef.value.play().catch(() => next());
}, { immediate: true });

onMounted(async () => {
  try {
    const res = await getWorks({ page: 1, limit: 100 });
    if (res.success && Array.isArray(res.data?.items) && res.data.items.length > 0) {
      works.value = res.data.items;
    }
  } catch {
    works.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
body.screen-full { padding: 0; }
#app { padding: 2rem; }
</style>
