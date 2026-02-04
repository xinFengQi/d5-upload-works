<template>
  <div class="score-page">
    <template v-if="!isJudgeReady">
      <div class="score-redirect">
        <div class="spinner"></div>
        <p>正在验证评委身份...</p>
      </div>
    </template>
    <template v-else-if="!canAccessScore">
      <div class="score-redirect">
        <p>仅评委或管理员可访问此页面</p>
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
          <h1 class="page-title">评委控制台</h1>
          <p class="page-subtitle">对作品进行评分与评价</p>
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
          <template v-else>
            <div class="works-cards score-works-cards">
              <div v-for="work in sortedWorks" :key="work.id" class="work-card score-work-card">
                <WorkVideoPreview :work="work" variant="card" @preview="openVideoPreview(work)" />
                <div class="work-card-content">
                  <div class="work-card-title" :title="work.title">{{ work.title || '未命名作品' }}</div>
                  <div class="work-card-meta">{{ work.creatorName || '未知' }} · {{ formatDate(work.createdAt) }}</div>
                  <div class="score-card-row">
                    <span class="work-card-votes">{{ work.voteCount ?? 0 }} 票</span>
                    <span class="score-card-judge">{{ formatJudgeScore(work) }}</span>
                    <span class="score-card-my">{{ work.myScore != null ? work.myScore + ' 分' : '未打分' }}</span>
                  </div>
                  <div class="score-card-category">
                    <span class="score-card-category-label">分类：</span>
                    <span class="score-card-category-value">{{ work.category || '未设置' }}</span>
                  </div>
                  <div class="work-card-actions score-card-actions">
                    <button v-if="isJudge" type="button" class="btn btn-primary" :disabled="!isScoreOpen" :title="!isScoreOpen ? scoreClosedTip : undefined" @click="openScoreModal(work)">{{ isScoreOpen ? '评分' : '未开放' }}</button>
                    <button v-if="isJudge" type="button" class="btn btn-category" @click="openCategoryModal(work)">修改分类</button>
                    <button type="button" class="btn btn-outline btn-sm" @click="showScores(work)">查看评分</button>
                  </div>
                </div>
              </div>
            </div>
            <table class="table score-works-table">
              <thead>
                <tr>
                  <th>预览</th>
                  <th>作品标题</th>
                  <th>创作者</th>
                  <th>分类</th>
                  <th>投票数</th>
                  <th>上传时间</th>
                  <th>评委平均分</th>
                  <th>我的打分</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="work in sortedWorks" :key="work.id">
                  <td>
                    <WorkVideoPreview :work="work" variant="cell" @preview="openVideoPreview(work)" />
                  </td>
                  <td><div class="work-title" :title="work.title">{{ work.title || '未命名作品' }}</div></td>
                  <td><div class="work-creator">{{ work.creatorName || '未知' }}</div></td>
                  <td><div class="work-category">{{ work.category || '未设置' }}</div></td>
                  <td><div class="work-votes">{{ work.voteCount ?? 0 }} 票</div></td>
                  <td><div class="work-date">{{ formatDate(work.createdAt) }}</div></td>
                  <td><div class="work-judge-score">{{ formatJudgeScore(work) }}</div></td>
                  <td><div class="work-my-score">{{ work.myScore != null ? work.myScore + ' 分' : '未打分' }}</div></td>
                  <td>
                    <div class="score-table-actions">
                      <button v-if="isJudge" type="button" class="btn btn-primary btn-sm" :disabled="!isScoreOpen" :title="!isScoreOpen ? scoreClosedTip : undefined" @click="openScoreModal(work)">{{ isScoreOpen ? '评分' : '未开放' }}</button>
                      <button v-if="isJudge" type="button" class="btn btn-category btn-sm" @click="openCategoryModal(work)">修改分类</button>
                      <button type="button" class="btn btn-outline btn-sm" @click="showScores(work)">查看评分</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>
      </main>
    </div>

    <WorkVideoModal :show="videoModalOpen" :work="previewWork" @close="closeVideoModal" />

    <!-- 修改分类弹框 -->
    <div class="modal category-modal" :class="{ active: categoryModal.show }" @click.self="closeCategoryModal">
      <div class="modal-content category-modal-content">
        <button type="button" class="modal-close category-modal-close" aria-label="关闭" @click="closeCategoryModal">×</button>
        <h3 class="modal-title category-modal-title">修改分类</h3>
        <p class="category-modal-work">「{{ categoryModal.work?.title || '未命名作品' }}」</p>
        <div class="category-modal-select-wrap">
          <label class="category-modal-label">选择分类</label>
          <select
            v-model="categoryModal.selectedCategory"
            class="category-modal-select"
          >
            <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="modal-actions category-modal-actions">
          <button type="button" class="btn btn-outline" @click="closeCategoryModal">取消</button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="categoryModal.saving"
            @click="confirmCategoryChange"
          >
            {{ categoryModal.saving ? '提交中...' : '确定' }}
          </button>
        </div>
      </div>
    </div>

    <div class="modal" :class="{ active: scoreModal.show }" @click.self="scoreModal.show = false">
      <div class="modal-content score-modal-content">
        <h3 class="modal-title">评委评分</h3>
        <p class="score-modal-work-title">「{{ scoreModal.title }}」</p>
        <p class="score-modal-hint">评委对该作品打分，1–100 分</p>
        <div class="score-input-wrap">
          <div class="score-input-box">
            <input
              v-model.number="scoreModal.score"
              type="number"
              class="score-input"
              min="1"
              max="100"
              placeholder="—"
              @input="clampScore"
            >
            <span class="score-input-unit">分</span>
          </div>
          <input
            v-model.number="scoreModal.score"
            type="range"
            class="score-slider"
            min="1"
            max="100"
            step="1"
            @input="clampScore"
          >
          <div class="score-quick">
            <span class="score-quick-label">快捷</span>
            <button
              v-for="n in [60, 70, 80, 90, 100]"
              :key="n"
              type="button"
              class="score-quick-btn"
              :class="{ active: scoreModal.score === n }"
              @click="scoreModal.score = n"
            >{{ n }}</button>
          </div>
        </div>
        <div class="modal-actions score-modal-actions">
          <button type="button" class="btn btn-outline" @click="scoreModal.show = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="scoreModal.saving || isScoreInvalid(scoreModal.score)" @click="submitScore">
            {{ scoreModal.saving ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 查看评分明细弹框 -->
    <div class="modal modal-scores" :class="{ active: scoresModal.show }" @click.self="scoresModal.show = false">
      <div class="modal-content modal-scores-content">
        <button type="button" class="modal-close" aria-label="关闭" @click="scoresModal.show = false">×</button>
        <h3 class="modal-title">评委评分 ({{ scoresModal.titleShort }})</h3>
        <div v-if="scoresModal.loading" class="loading"><div class="spinner"></div><p>加载中...</p></div>
        <div v-else-if="scoresModal.error" class="voters-empty"><p>{{ scoresModal.error }}</p></div>
        <div v-else-if="scoresModal.scores.length === 0" class="voters-empty"><div style="font-size:3rem;margin-bottom:1rem;">📋</div><p>暂无评委评分</p></div>
        <div v-else class="scores-list-wrap">
          <div class="voters-header">共 {{ scoresModal.scores.length }} 位评委评分</div>
          <div class="scores-list-scroll">
            <div v-for="(s, i) in scoresModal.scores" :key="i" class="score-item">
              <div class="voter-index">{{ i + 1 }}</div>
              <div class="score-info">
                <div class="score-judge">{{ s.judgeEmail }}</div>
                <div class="score-value">{{ s.score }} 分</div>
                <div class="voter-time">{{ formatDate(s.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tip-modal" :class="{ active: tipModal.show }" @click.self="closeTipModal">
      <div class="tip-modal-content">
        <div class="tip-modal-icon" :class="tipModal.type">{{ tipModal.icon }}</div>
        <h3 class="tip-modal-title">{{ tipModal.title }}</h3>
        <p class="tip-modal-message">{{ tipModal.message }}</p>
        <button type="button" class="tip-modal-btn" @click="closeTipModal">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import WorkVideoPreview from '../components/WorkVideoPreview.vue';
import WorkVideoModal from '../components/WorkVideoModal.vue';
import { getJudgeWorks, submitScore as apiSubmitScore, getCategories as apiGetCategories, updateWorkCategory, getWorkJudgeScores } from '../api/judge';
import { getScreenConfig } from '../api/screenConfig';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { user, isJudge, isAdmin, checkAuth, logout } = useAuth();
/** 允许进入作品评价页：评委或管理员 */
const canAccessScore = computed(() => isJudge.value || isAdmin.value);

const isJudgeReady = ref(false);
const works = ref([]);
const worksLoading = ref(true);
const categories = ref([]);
const scoreModal = ref({ show: false, workId: null, title: '', score: null, saving: false });
const categoryModal = reactive({
  show: false,
  work: null,
  selectedCategory: '',
  saving: false,
});
const scoresModal = reactive({ show: false, workId: null, titleShort: '', loading: false, error: '', scores: [] });
const previewWork = ref(null);
const videoModalOpen = ref(false);
const tipModal = reactive({ show: false, type: 'info', icon: 'ℹ️', title: '提示', message: '' });
function showTipModal(message, type = 'info', title = '提示') {
  tipModal.message = message;
  tipModal.type = type;
  tipModal.title = title;
  tipModal.icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  tipModal.show = true;
}
function closeTipModal() {
  tipModal.show = false;
}
/** 评分开放时间（时间戳 ms），null 表示不限制 */
const scoreOpenStart = ref(null);
const scoreOpenEnd = ref(null);
/** 当前是否在评分开放时间内 */
const isScoreOpen = computed(() => {
  const now = Date.now();
  const start = scoreOpenStart.value;
  const end = scoreOpenEnd.value;
  if (start == null && end == null) return true;
  if (start != null && now < start) return false;
  if (end != null && now > end) return false;
  return true;
});
/** 评分未开放时的提示文案 */
const scoreClosedTip = computed(() => {
  const now = Date.now();
  const start = scoreOpenStart.value;
  const end = scoreOpenEnd.value;
  if (start != null && now < start) return `评分将于 ${new Date(start).toLocaleString('zh-CN')} 开始`;
  if (end != null && now > end) return '评分已结束';
  return '';
});

const sortedWorks = computed(() => {
  return [...works.value].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
});

const categoryOptions = computed(() => {
  const list = Array.isArray(categories.value) ? categories.value : [];
  return list.map((v) => ({ value: v, label: v === '' ? '未设置' : v }));
});

function formatJudgeScore(work) {
  if (work.judgeScore != null && work.judgeCount != null && work.judgeCount > 0) {
    const avg = Number(work.judgeScore);
    if (!Number.isNaN(avg)) {
      const text = avg % 1 === 0 ? String(Math.round(avg)) : avg.toFixed(1);
      return work.judgeCount > 1 ? `${text} 分 (${work.judgeCount}人评)` : `${text} 分`;
    }
  }
  return '未评';
}

function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function loadWorks() {
  worksLoading.value = true;
  try {
    const res = await getJudgeWorks({ page: 1, limit: 1000 });
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

async function loadCategories() {
  try {
    const res = await apiGetCategories();
    if (res.success && Array.isArray(res.data?.list)) {
      categories.value = res.data.list;
    } else {
      categories.value = ['', '创意类', '技术类', '视觉类', '叙事类', '其他'];
    }
  } catch {
    categories.value = ['', '创意类', '技术类', '视觉类', '叙事类', '其他'];
  }
}

function openCategoryModal(work) {
  if (!work) return;
  categoryModal.work = work;
  categoryModal.selectedCategory = work.category ?? '';
  categoryModal.show = true;
  categoryModal.saving = false;
}

function closeCategoryModal() {
  categoryModal.show = false;
  categoryModal.work = null;
  categoryModal.selectedCategory = '';
}

async function confirmCategoryChange() {
  if (!categoryModal.work || categoryModal.saving) return;
  categoryModal.saving = true;
  try {
    const res = await updateWorkCategory(categoryModal.work.id, categoryModal.selectedCategory);
    if (res.success) {
      const w = works.value.find((x) => x.id === categoryModal.work.id);
      if (w) w.category = categoryModal.selectedCategory === '' ? null : categoryModal.selectedCategory;
      closeCategoryModal();
    } else {
      showTipModal(res.error?.message || '修改失败', 'error', '修改失败');
    }
  } catch {
    showTipModal('修改失败，请重试', 'error', '修改失败');
  } finally {
    categoryModal.saving = false;
  }
}

function openVideoPreview(work) {
  if (!work?.fileUrl) return;
  previewWork.value = work;
  videoModalOpen.value = true;
}

function closeVideoModal() {
  previewWork.value = null;
  videoModalOpen.value = false;
}

function showScores(work) {
  scoresModal.workId = work.id;
  scoresModal.titleShort = (work.title || '未命名').length > 30 ? (work.title || '未命名').slice(0, 30) + '...' : (work.title || '未命名');
  scoresModal.show = true;
  scoresModal.loading = true;
  scoresModal.error = '';
  scoresModal.scores = [];
  getWorkJudgeScores(work.id)
    .then((res) => {
      if (res.success && res.data?.scores) {
        scoresModal.scores = res.data.scores;
      } else {
        scoresModal.error = '加载失败，请重试';
      }
    })
    .catch(() => {
      scoresModal.error = '加载失败，请重试';
    })
    .finally(() => {
      scoresModal.loading = false;
    });
}

function openScoreModal(work) {
  if (!isScoreOpen.value) {
    showTipModal(scoreClosedTip.value || '当前不在评分开放时间内', 'info', '评分未开放');
    return;
  }
  scoreModal.value = {
    show: true,
    workId: work.id,
    title: work.title || '未命名作品',
    score: work.myScore != null ? work.myScore : null,
    saving: false,
  };
}

function isScoreInvalid(score) {
  if (score == null || score === '') return true;
  const n = Number(score);
  return Number.isNaN(n) || n < 1 || n > 100;
}

function clampScore() {
  const s = scoreModal.value.score;
  if (s == null || s === '') return;
  let n = Number(s);
  if (Number.isNaN(n)) {
    scoreModal.value.score = null;
    return;
  }
  n = Math.round(Math.max(1, Math.min(100, n)));
  scoreModal.value.score = n;
}

async function submitScore() {
  const { workId, title, score, saving } = scoreModal.value;
  if (saving || workId == null) return;
  if (!isScoreOpen.value) {
    showTipModal(scoreClosedTip.value || '当前不在评分开放时间内', 'info', '评分未开放');
    return;
  }
  let s = Number(score);
  if (Number.isNaN(s) || s < 1 || s > 100) {
    showTipModal('请输入 1–100 的整数', 'error', '输入错误');
    return;
  }
  s = Math.round(s);
  scoreModal.value.saving = true;
  try {
    const res = await apiSubmitScore(workId, s);
    if (res.success) {
      scoreModal.value.show = false;
      await loadWorks();
    } else {
      showTipModal(res.error?.message || '提交失败', 'error', '提交失败');
    }
  } catch {
    showTipModal('提交失败，请重试', 'error', '提交失败');
  } finally {
    scoreModal.value.saving = false;
  }
}

async function handleLogout() {
  await logout();
}

async function loadScreenConfigForScore() {
  try {
    const res = await getScreenConfig();
    if (res.success && res.data) {
      scoreOpenStart.value = res.data.scoreOpenStart != null ? Number(res.data.scoreOpenStart) : null;
      scoreOpenEnd.value = res.data.scoreOpenEnd != null ? Number(res.data.scoreOpenEnd) : null;
    }
  } catch {}
}

onMounted(async () => {
  await checkAuth();
  isJudgeReady.value = true;
  if (!canAccessScore.value) return;
  await Promise.all([loadWorks(), loadCategories(), loadScreenConfigForScore()]);
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

/* 评分页主内容区拉宽，与首页/管理页一致 */
.score-page .container {
  max-width: 1400px;
  padding: 2rem;
  margin-left: auto;
  margin-right: auto;
}
.score-page .works-table-container {
  width: 100%;
}

/* 小屏：卡片展示 */
.score-works-cards {
  display: none;
}
.score-works-table {
  display: table;
}
@media (max-width: 768px) {
  .score-page .works-table-container .score-works-table {
    display: none;
  }
  .score-page .score-works-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
}
@media (min-width: 769px) {
  .score-page .score-works-cards {
    display: none !important;
  }
}
.score-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}
.score-card-my {
  font-weight: 600;
  color: var(--primary-color);
}
.score-card-category {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}
.score-card-category-value {
  font-weight: 500;
  color: var(--text-primary);
}
.score-card-actions {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.score-card-actions .btn {
  flex: 1;
  min-width: 80px;
  justify-content: center;
}
.score-table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

/* 修改分类按钮：与评分按钮区分，更易识别 */
.btn-category {
  font-weight: 600;
  color: var(--primary-color);
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.35);
  border-radius: 10px;
  transition: color 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.btn-category:hover {
  color: var(--primary-dark);
  background: rgba(37, 99, 235, 0.14);
  border-color: var(--primary-light);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}
.btn-category:active {
  background: rgba(37, 99, 235, 0.2);
}

/* 修改分类弹框 */
.category-modal .modal-content {
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}
.category-modal-content {
  position: relative;
  padding: 1.5rem 1.75rem;
  max-width: 380px;
  width: 100%;
}
.category-modal-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, background 0.2s;
}
.category-modal-close:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}
.category-modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem;
}
.category-modal-work {
  font-size: 0.9375rem;
  color: var(--primary-color);
  font-weight: 600;
  margin: 0 0 1.25rem;
  word-break: break-word;
}
.category-modal-select-wrap {
  margin-bottom: 1.5rem;
}
.category-modal-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}
.category-modal-select {
  width: 100%;
  padding: 0.6rem 2.25rem 0.6rem 0.75rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M3 4.5 L6 7.5 L9 4.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.category-modal-select:hover {
  border-color: var(--primary-light);
}
.category-modal-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.category-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0;
}
.work-category {
  font-size: 0.875rem;
  color: var(--text-primary);
}

.work-judge-score {
  font-weight: 600;
  color: var(--text-primary);
}
.score-card-judge {
  font-weight: 600;
  color: var(--text-primary);
}
.work-my-score {
  font-weight: 600;
  color: var(--primary-color);
}
.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
}

/* 评分弹框 */
.score-modal-content {
  max-width: 400px;
  padding: 1.75rem;
}
.score-modal-content .modal-title {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}
.score-modal-work-title {
  font-size: 1rem;
  color: var(--primary-color);
  font-weight: 600;
  margin-bottom: 0.5rem;
  word-break: break-all;
}
.score-modal-hint {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1.25rem;
}
.score-input-wrap {
  margin-bottom: 1.5rem;
}
.score-input-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-bottom: 1rem;
}
.score-input {
  width: 5rem;
  height: 3rem;
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  color: var(--primary-color);
  background: var(--bg-secondary);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.score-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}
.score-input:hover {
  border-color: var(--primary-light);
}
.score-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}
.score-input-unit {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-secondary);
}
.score-slider {
  width: 100%;
  height: 8px;
  margin-bottom: 1rem;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-color);
  border-radius: 4px;
}
.score-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--gradient);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
  transition: transform 0.15s;
}
.score-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}
.score-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: var(--gradient);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
}
.score-quick {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.score-quick-label {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-right: 0.25rem;
}
.score-quick-btn {
  min-width: 2.5rem;
  height: 2rem;
  padding: 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.score-quick-btn:hover {
  color: var(--primary-color);
  border-color: var(--primary-light);
  background: var(--gradient-light);
}
.score-quick-btn.active {
  color: white;
  border-color: var(--primary-color);
  background: var(--gradient);
}
.score-modal-actions {
  justify-content: flex-end;
  gap: 0.75rem;
}

/* 查看评分明细弹框 */
.modal-scores .modal-content { max-width: 600px; }
.modal-scores .scores-list-wrap { display: flex; flex-direction: column; min-height: 0; }
.modal-scores .scores-list-scroll { max-height: min(400px, 60vh); overflow-y: auto; }
.modal-scores .score-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--border-color); }
.modal-scores .score-item:last-child { border-bottom: none; }
.modal-scores .score-info { flex: 1; min-width: 0; }
.modal-scores .score-judge { font-weight: 500; color: var(--text-primary); margin-bottom: 0.25rem; }
.modal-scores .score-value { font-weight: 700; color: var(--primary-color); font-size: 1.125rem; margin-bottom: 0.25rem; }

.tip-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center; padding: 2rem; }
.tip-modal.active { display: flex; }
.tip-modal-content { background: white; border-radius: 1rem; padding: 2rem; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; animation: tipSlideUp 0.3s ease-out; }
@keyframes tipSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.tip-modal-icon { font-size: 3rem; margin-bottom: 1rem; }
.tip-modal-icon.success { color: #10b981; }
.tip-modal-icon.error { color: #ef4444; }
.tip-modal-icon.info { color: var(--primary-color, #2563eb); }
.tip-modal-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #1f2937; }
.tip-modal-message { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
.tip-modal-btn { width: 100%; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; border: none; cursor: pointer; transition: all 0.2s ease; background: var(--gradient, linear-gradient(135deg, #1e40af 0%, #2563eb 100%)); color: white; }
.tip-modal-btn:hover { opacity: 0.95; transform: translateY(-1px); }
</style>
