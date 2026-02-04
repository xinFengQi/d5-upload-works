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
            <div class="score-filters">
              <label class="score-filter-item">
                <input v-model="filterMyUnscored" type="checkbox" class="score-filter-checkbox">
                <span class="score-filter-label">仅显示我未评分的</span>
              </label>
              <label class="score-filter-item">
                <input v-model="filterAllUnscored" type="checkbox" class="score-filter-checkbox">
                <span class="score-filter-label">仅显示总的未评分的</span>
              </label>
            </div>
          </div>
          <div v-if="worksLoading" class="loading">
            <div class="spinner"></div>
            <p>加载中...</p>
          </div>
          <div v-else-if="works.length === 0" class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>暂无作品</p>
          </div>
          <div v-else-if="sortedWorks.length === 0" class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <p>当前筛选下暂无作品</p>
            <p class="empty-state-hint">可取消勾选上方筛选条件查看全部</p>
          </div>
          <template v-else>
            <div class="works-cards score-works-cards">
              <div v-for="work in sortedWorks" :key="work.id" class="work-card score-work-card">
                <WorkVideoPreview :work="work" variant="card" @preview="openVideoPreview(work)" />
                <div class="work-card-content">
                  <div class="work-card-title" :title="work.title">{{ work.title || '未命名作品' }}</div>
                  <div class="work-card-meta">{{ work.creatorName || '未知' }}</div>
                  <div class="score-card-row">
                    <span class="work-card-votes">{{ work.voteCount ?? 0 }} 票</span>
                    <span class="score-card-judge">总分 {{ formatScoreCell(work.judgeScore) }}　创意 {{ formatScoreCell(work.judgeCreativityScore) }}　艺术 {{ formatScoreCell(work.judgeArtScore) }}</span>
                    <span class="score-card-my">{{ formatMyScore(work) }}</span>
                  </div>
                  <div class="work-card-actions score-card-actions">
                    <button v-if="isJudge" type="button" class="btn btn-primary" :disabled="!isScoreOpen" :title="!isScoreOpen ? scoreClosedTip : undefined" @click="openScoreModal(work)">{{ isScoreOpen ? '评分' : '未开放' }}</button>
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
                  <th>投票数</th>
                  <th>总分平均分</th>
                  <th>创意与概念平均分</th>
                  <th>艺术与观感平均分</th>
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
                  <td><div class="work-votes">{{ work.voteCount ?? 0 }} 票</div></td>
                  <td><div class="work-judge-score">{{ formatScoreCell(work.judgeScore) }}</div></td>
                  <td><div class="work-judge-score">{{ formatScoreCell(work.judgeCreativityScore) }}</div></td>
                  <td><div class="work-judge-score">{{ formatScoreCell(work.judgeArtScore) }}</div></td>
                  <td><div class="work-my-score">{{ formatMyScore(work) }}</div></td>
                  <td>
                    <div class="score-table-actions">
                      <button v-if="isJudge" type="button" class="btn btn-primary btn-sm" :disabled="!isScoreOpen" :title="!isScoreOpen ? scoreClosedTip : undefined" @click="openScoreModal(work)">{{ isScoreOpen ? '评分' : '未开放' }}</button>
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

    <div class="modal" :class="{ active: scoreModal.show }" @click.self="scoreModal.show = false">
      <div class="modal-content score-modal-content score-modal-dual">
        <h3 class="modal-title">专业评审评分（满分100分）</h3>
        <p class="score-modal-work-title" :title="scoreModal.title">「{{ scoreModal.title }}」</p>
        <p class="score-modal-hint">创意与概念、艺术与观感各 0–50 分，多名评委取平均。</p>
        <div class="score-rubric">创意与概念：优秀40–50 良好30–40 一般20–30 待提升0–20　艺术与观感：同上</div>
        <div class="score-dual-inputs">
          <div class="score-dim-wrap">
            <label class="score-dim-label">创意与概念（0–50）</label>
            <div class="score-input-box">
              <input
                v-model.number="scoreModal.creativityScore"
                type="number"
                class="score-input"
                min="0"
                max="50"
                placeholder="0"
                @input="clampDualScore"
              >
              <span class="score-input-unit">分</span>
            </div>
            <input v-model.number="scoreModal.creativityScore" type="range" class="score-slider" min="0" max="50" step="1" @input="clampDualScore">
          </div>
          <div class="score-dim-wrap">
            <label class="score-dim-label">艺术与观感（0–50）</label>
            <div class="score-input-box">
              <input
                v-model.number="scoreModal.artScore"
                type="number"
                class="score-input"
                min="0"
                max="50"
                placeholder="0"
                @input="clampDualScore"
              >
              <span class="score-input-unit">分</span>
            </div>
            <input v-model.number="scoreModal.artScore" type="range" class="score-slider" min="0" max="50" step="1" @input="clampDualScore">
          </div>
          <div class="score-total-row">总分：<strong>{{ (scoreModal.creativityScore ?? 0) + (scoreModal.artScore ?? 0) }}</strong> 分</div>
        </div>
        <div class="modal-actions score-modal-actions">
          <button type="button" class="btn btn-outline" @click="scoreModal.show = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="scoreModal.saving || isDualScoreInvalid()" @click="submitScore">
            {{ scoreModal.saving ? '提交中...' : '提交' }}
          </button>
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
import { getJudgeWorks, submitScore as apiSubmitScore } from '../api/judge';
import { getScreenConfig } from '../api/screenConfig';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { user, isJudge, isAdmin, checkAuth, logout } = useAuth();
/** 允许进入作品评价页：评委或管理员 */
const canAccessScore = computed(() => isJudge.value || isAdmin.value);

const isJudgeReady = ref(false);
const works = ref([]);
const worksLoading = ref(true);
/** 仅显示我未评分的 */
const filterMyUnscored = ref(false);
/** 仅显示总的未评分的（没有任何评委打过分） */
const filterAllUnscored = ref(false);
const scoreModal = ref({ show: false, workId: null, title: '', creativityScore: null, artScore: null, saving: false });
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

/** 根据两个筛选条件过滤后的作品列表 */
const filteredWorks = computed(() => {
  let list = works.value;
  if (filterMyUnscored.value) list = list.filter((w) => w.myScore == null);
  if (filterAllUnscored.value) list = list.filter((w) => (w.judgeCount ?? 0) === 0);
  return list;
});
const sortedWorks = computed(() => {
  return [...filteredWorks.value].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
});

function formatScoreCell(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(1);
}
function formatMyScore(work) {
  if (work.myScore != null) {
    if (work.myCreativityScore != null && work.myArtScore != null) {
      return `创意${work.myCreativityScore} + 艺术${work.myArtScore}（总分${work.myScore}）`;
    }
    return `${work.myScore} 分`;
  }
  return '未打分';
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

function openVideoPreview(work) {
  if (!work?.fileUrl) return;
  previewWork.value = work;
  videoModalOpen.value = true;
}

function closeVideoModal() {
  previewWork.value = null;
  videoModalOpen.value = false;
}

function openScoreModal(work) {
  if (!isScoreOpen.value) {
    showTipModal(scoreClosedTip.value || '当前不在评分开放时间内', 'info', '评分未开放');
    return;
  }
  const c = work.myCreativityScore != null ? work.myCreativityScore : (work.myScore != null ? Math.round(work.myScore / 2) : null);
  const a = work.myArtScore != null ? work.myArtScore : (work.myScore != null ? work.myScore - Math.round(work.myScore / 2) : null);
  scoreModal.value = {
    show: true,
    workId: work.id,
    title: work.title || '未命名作品',
    creativityScore: c,
    artScore: a,
    saving: false,
  };
}

function isDualScoreInvalid() {
  const c = scoreModal.value.creativityScore;
  const a = scoreModal.value.artScore;
  if (c == null || c === '' || a == null || a === '') return true;
  const cn = Number(c);
  const an = Number(a);
  return Number.isNaN(cn) || cn < 0 || cn > 50 || Number.isNaN(an) || an < 0 || an > 50;
}

function clampDualScore() {
  const c = scoreModal.value.creativityScore;
  const a = scoreModal.value.artScore;
  if (c != null && c !== '') {
    let n = Number(c);
    if (!Number.isNaN(n)) scoreModal.value.creativityScore = Math.round(Math.max(0, Math.min(50, n)));
  }
  if (a != null && a !== '') {
    let n = Number(a);
    if (!Number.isNaN(n)) scoreModal.value.artScore = Math.round(Math.max(0, Math.min(50, n)));
  }
}

async function submitScore() {
  const { workId, creativityScore, artScore, saving } = scoreModal.value;
  if (saving || workId == null) return;
  if (!isScoreOpen.value) {
    showTipModal(scoreClosedTip.value || '当前不在评分开放时间内', 'info', '评分未开放');
    return;
  }
  const c = Number(creativityScore);
  const a = Number(artScore);
  if (Number.isNaN(c) || c < 0 || c > 50 || Number.isNaN(a) || a < 0 || a > 50) {
    showTipModal('创意与概念、艺术与观感均须为 0–50 的整数', 'error', '输入错误');
    return;
  }
  scoreModal.value.saving = true;
  try {
    const res = await apiSubmitScore(workId, Math.round(c), Math.round(a));
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
  await Promise.all([loadWorks(), loadScreenConfigForScore()]);
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

/* 作品列表筛选：我未评分 / 总的未评分 */
.score-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.75rem;
  align-items: center;
}
.score-filter-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--bg-primary, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.score-filter-item:hover {
  border-color: var(--primary-color, #2563eb);
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}
.score-filter-checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--primary-color, #2563eb);
  cursor: pointer;
}
.score-filter-label {
  font-size: 0.9375rem;
  color: var(--text-primary, #1f2937);
}

/* 移动端：标题与筛选垂直排布，避免挤压断行 */
@media (max-width: 768px) {
  .score-page .works-table-container .table-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem;
  }
  .score-page .works-table-container .table-title {
    margin: 0;
    white-space: nowrap;
    font-size: 1.125rem;
  }
  .score-page .score-filters {
    margin-top: 0;
    gap: 0.5rem;
  }
  .score-page .score-filter-item {
    padding: 0.5rem 0.625rem;
    flex: 1;
    min-width: 0;
  }
  .score-page .score-filter-label {
    font-size: 0.875rem;
  }
}
.empty-state-hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #6b7280);
}

/* 小屏：卡片展示 */
.score-works-cards {
  display: none;
}
.score-works-table {
  display: table;
}
@media (max-width: 1100px) {
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
@media (min-width: 1101px) {
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

/* 评分弹框（双维度）：限制高度、可滚动，内容更紧凑 */
.score-modal-content {
  max-width: 400px;
  padding: 1.75rem;
}
.score-modal-content.score-modal-dual {
  max-width: 520px;
  max-height: 88vh;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  -webkit-overflow-scrolling: touch;
}
.score-modal-content .modal-title {
  font-size: 1.125rem;
  margin-bottom: 0.2rem;
  color: var(--text-primary);
}
.score-modal-work-title {
  font-size: 0.9375rem;
  color: var(--primary-color);
  font-weight: 600;
  margin-bottom: 0.4rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.score-modal-hint {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}
.score-rubric {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  line-height: 1.4;
}
.score-dual-inputs {
  margin-bottom: 1rem;
}
.score-dim-wrap {
  margin-bottom: 1rem;
}
.score-dim-wrap:last-of-type {
  margin-bottom: 0.5rem;
}
.score-dim-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
}
.score-total-row {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}
.score-input-wrap {
  margin-bottom: 1.5rem;
}
.score-modal-dual .score-input-box {
  margin-bottom: 0.5rem;
}
.score-input-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-bottom: 1rem;
}
.score-modal-dual .score-input {
  width: 4rem;
  height: 2.5rem;
  font-size: 1.5rem;
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
.score-modal-dual .score-slider {
  margin-bottom: 0.5rem;
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
