<template>
  <div class="score-page">
    <template v-if="!isJudgeReady">
      <div class="score-redirect">
        <div class="spinner"></div>
        <p>正在验证评委身份...</p>
      </div>
    </template>
    <template v-else-if="!isJudge">
      <div class="score-redirect">
        <p>您不是评委，无法访问此页面</p>
        <router-link to="/" class="btn btn-primary" style="margin-top: 1rem;">返回首页</router-link>
      </div>
    </template>
    <div v-else class="container-wrapper">
      <nav class="navbar navbar-gradient">
        <div class="nav-container">
          <router-link to="/" class="nav-brand nav-brand-logo-only">
            <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
          </router-link>
          <div class="nav-actions">
            <router-link to="/" class="btn btn-outline">返回首页</router-link>
            <button type="button" class="btn btn-outline" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </nav>

      <main class="container">
        <div class="page-header">
          <h1 class="page-title">评分列表</h1>
          <p class="page-subtitle">对所有作品进行评分（1–100 分）</p>
        </div>

        <div class="works-table-container">
          <div class="table-header">
            <h2 class="table-title">作品列表</h2>
          </div>
          <div v-if="worksLoading" class="loading">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="works.length === 0" class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>暂无作品</p>
          </div>
          <div v-else>
            <table class="table">
              <thead>
                <tr>
                  <th>预览</th>
                  <th>作品标题</th>
                  <th>创作者</th>
                  <th>投票数</th>
                  <th>上传时间</th>
                  <th>我的评分</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="work in sortedWorks" :key="work.id">
                  <td><video class="work-video-preview" :src="work.fileUrl" muted></video></td>
                  <td><div class="work-title" :title="work.title">{{ work.title || '未命名作品' }}</div></td>
                  <td><div class="work-creator">{{ work.creatorName || '未知' }}</div></td>
                  <td><div class="work-votes">{{ work.voteCount ?? 0 }} 票</div></td>
                  <td><div class="work-date">{{ formatDate(work.createdAt) }}</div></td>
                  <td><div class="work-my-score">{{ work.myScore != null ? work.myScore + ' 分' : '未评分' }}</div></td>
                  <td>
                    <button type="button" class="btn btn-primary btn-sm" @click="openScoreModal(work)">
                      {{ work.myScore != null ? '修改' : '评分' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <div class="modal" :class="{ active: scoreModal.show }" @click.self="scoreModal.show = false">
      <div class="modal-content modal-content-sm">
        <h3 class="modal-title">评分</h3>
        <p class="modal-message">为「{{ scoreModal.title }}」打分（1–100 分）</p>
        <div class="score-input-group">
          <input v-model.number="scoreModal.score" type="number" class="config-input" min="1" max="100" placeholder="1-100">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" @click="scoreModal.show = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="scoreModal.saving" @click="submitScore">{{ scoreModal.saving ? '提交中...' : '提交' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../api/request';
import { getWorks } from '../api/works';
import { getMyScores, submitScore as apiSubmitScore } from '../api/judge';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { user, isJudge, checkAuth, logout } = useAuth();

const isJudgeReady = ref(false);
const works = ref([]);
const worksLoading = ref(true);
const scoreMap = ref({});
const scoreModal = ref({ show: false, workId: null, title: '', score: null, saving: false });

const sortedWorks = computed(() => {
  const list = works.value.map((w) => ({
    ...w,
    myScore: scoreMap.value[w.id] != null ? scoreMap.value[w.id] : null,
  }));
  return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
});

function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function loadWorks() {
  worksLoading.value = true;
  try {
    const res = await getWorks({ page: 1, limit: 1000 });
    if (res.success && Array.isArray(res.data?.items)) {
      works.value = res.data.items;
    } else {
      works.value = [];
    }
  } catch {
    works.value = [];
  } finally {
    worksLoading.value = false;
  }
}

async function loadMyScores() {
  try {
    const res = await getMyScores();
    if (res.success && Array.isArray(res.data?.scores)) {
      const map = {};
      res.data.scores.forEach((s) => { map[s.workId] = s.score; });
      scoreMap.value = map;
    }
  } catch {
    scoreMap.value = {};
  }
}

function openScoreModal(work) {
  scoreModal.value = {
    show: true,
    workId: work.id,
    title: work.title || '未命名作品',
    score: work.myScore != null ? work.myScore : null,
    saving: false,
  };
}

async function submitScore() {
  const { workId, title, score, saving } = scoreModal.value;
  if (saving || workId == null) return;
  let s = Number(score);
  if (Number.isNaN(s) || s < 1 || s > 100) {
    alert('请输入 1–100 的整数');
    return;
  }
  s = Math.round(s);
  scoreModal.value.saving = true;
  try {
    const res = await apiSubmitScore(workId, s);
    if (res.success) {
      scoreMap.value = { ...scoreMap.value, [workId]: s };
      scoreModal.value.show = false;
    } else {
      alert(res.error?.message || '提交失败');
    }
  } catch {
    alert('提交失败，请重试');
  } finally {
    scoreModal.value.saving = false;
  }
}

async function handleLogout() {
  await logout();
}

onMounted(async () => {
  await checkAuth();
  isJudgeReady.value = true;
  if (!isJudge.value) return;
  await loadWorks();
  await loadMyScores();
});
</script>

<style scoped>
.score-page {
  min-height: 100vh;
  background: var(--bg-secondary, #f9fafb);
}
.score-redirect {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
}
.container-wrapper {
  display: block;
}
.work-my-score {
  font-weight: 600;
  color: var(--primary-color);
}
.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
}
.score-input-group {
  margin-bottom: 1.25rem;
}
.score-input-group .config-input {
  width: 100%;
  max-width: 120px;
  font-size: 1.125rem;
  text-align: center;
}
.modal-content-sm {
  max-width: 420px;
}
.modal-content-sm .modal-title {
  margin-bottom: 0.5rem;
}
.modal-content-sm .modal-message {
  margin-bottom: 1rem;
  font-size: 0.9375rem;
}
.modal-content-sm .modal-actions {
  justify-content: flex-end;
}
</style>
