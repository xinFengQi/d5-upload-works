<template>
  <div class="admin-page">
    <!-- 未登录时：直接跳转到登录页，并自动打开管理员登录弹框 -->
    <template v-if="!adminLoggedIn">
      <div class="admin-redirect">
        <div class="spinner"></div>
        <p>正在跳转到登录页...</p>
      </div>
    </template>

    <!-- 已登录：管理内容 -->
    <div v-else id="adminContent" class="container-wrapper">
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
        <div class="admin-tabs">
          <button
            type="button"
            :class="['tab-btn', { active: activeTab === 'works' }]"
            @click="activeTab = 'works'"
          >
            作品管理
          </button>
          <button
            type="button"
            :class="['tab-btn', { active: activeTab === 'config' }]"
            @click="activeTab = 'config'"
          >
            配置管理
          </button>
        </div>

        <!-- Tab: 作品管理 -->
        <div v-show="activeTab === 'works'" class="tab-panel">
          <div class="page-header">
            <h1 class="page-title">作品管理</h1>
            <p class="page-subtitle">管理所有上传的作品，可以查看和删除作品</p>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">总作品数</div>
              <div class="stat-value">{{ works.length }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">总投票数</div>
              <div class="stat-value">{{ totalVotes }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">参与用户</div>
              <div class="stat-value">{{ totalUsers }}</div>
            </div>
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
              <div class="works-cards">
                <div v-for="work in sortedWorks" :key="work.id" class="work-card">
                  <WorkVideoPreview :work="work" variant="card" @preview="openVideoPreview(work)" />
                  <div class="work-card-content">
                    <div class="work-card-title" :title="work.title">{{ work.title || '未命名作品' }}</div>
                    <div class="work-card-meta">{{ work.creatorName || '未知' }} · {{ formatDate(work.createdAt) }}</div>
                    <div class="work-card-votes">{{ work.voteCount ?? 0 }} 票</div>
                    <div class="work-card-actions">
                      <button type="button" class="btn btn-outline btn-sm" @click="showVoters(work)">查看投票</button>
                      <button type="button" class="btn btn-outline btn-sm" @click="showScores(work)">查看评分</button>
                      <button type="button" class="btn btn-danger" @click="showDelete(work)">删除</button>
                    </div>
                  </div>
                </div>
              </div>
              <table class="table" id="worksTable">
                <thead>
                  <tr>
                    <th>预览</th>
                    <th>作品标题</th>
                    <th>创作者</th>
                    <th>投票数</th>
                    <th>上传时间</th>
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
                    <td><div class="work-date">{{ formatDate(work.createdAt) }}</div></td>
                    <td>
                      <div class="work-actions">
                        <button type="button" class="btn btn-outline btn-sm" @click="showVoters(work)">查看投票</button>
                        <button type="button" class="btn btn-outline btn-sm" @click="showScores(work)">查看评分</button>
                        <button type="button" class="btn btn-danger" @click="showDelete(work)">删除</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>
        </div>

        <!-- Tab: 配置管理 -->
        <div v-show="activeTab === 'config'" class="tab-panel">
          <div class="page-header">
            <h1 class="page-title">配置管理</h1>
            <p class="page-subtitle">分屏与主题等系统配置</p>
          </div>

          <div class="config-card">
            <div class="config-content">
              <div class="config-header-inline">
                <h2 class="config-title">投票与评分开放时间</h2>
                <p class="config-subtitle">设置后可限制仅在时间段内开放投票/评分，留空表示不限制</p>
              </div>
              <div class="config-open-time-rows">
                <div class="config-open-time-row">
                  <span class="config-open-time-label">投票开放</span>
                  <div class="config-form-group">
                    <label class="config-label">开始时间</label>
                    <input v-model="voteOpenStartInput" type="datetime-local" class="config-input">
                  </div>
                  <div class="config-form-group">
                    <label class="config-label">结束时间</label>
                    <input v-model="voteOpenEndInput" type="datetime-local" class="config-input">
                  </div>
                </div>
                <div class="config-open-time-row">
                  <span class="config-open-time-label">评分开放</span>
                  <div class="config-form-group">
                    <label class="config-label">开始时间</label>
                    <input v-model="scoreOpenStartInput" type="datetime-local" class="config-input">
                  </div>
                  <div class="config-form-group">
                    <label class="config-label">结束时间</label>
                    <input v-model="scoreOpenEndInput" type="datetime-local" class="config-input">
                  </div>
                </div>
              </div>
              <div class="config-actions">
                <button type="button" class="btn btn-primary" @click="saveOpenTimeConfig">保存开放时间</button>
              </div>
            </div>
            <div v-if="openTimeMessage" class="config-message">{{ openTimeMessage }}</div>
          </div>

          <div class="config-card">
            <div class="config-content">
              <div class="config-header-inline">
                <h2 class="config-title">每人最多投票数</h2>
                <p class="config-subtitle">限制每个用户最多可投多少票（1–100）</p>
              </div>
              <div class="config-form-group">
                <label class="config-label">最多投票数</label>
                <input v-model.number="maxVotesPerUser" type="number" class="config-input" min="1" max="100" placeholder="1">
              </div>
              <div class="config-actions">
                <button type="button" class="btn btn-primary" @click="saveMaxVotes">保存</button>
              </div>
            </div>
            <div v-if="maxVotesMessage" class="config-message">{{ maxVotesMessage }}</div>
          </div>

          <div class="config-card">
            <div class="config-content">
              <div class="config-header-inline">
                <h2 class="config-title">评委设置</h2>
                <p class="config-subtitle">添加评委邮箱即保存，删除需二次确认</p>
              </div>
              <div class="config-form-group judges-add">
                <input v-model.trim="judgeEmailInput" type="email" class="config-input" placeholder="输入评委邮箱" @keydown.enter.prevent="addJudge">
                <button type="button" class="btn btn-primary" :disabled="!judgeEmailInput || judgesSaving" @click="addJudge">{{ judgesSaving ? '保存中...' : '添加' }}</button>
              </div>
              <div v-if="judges.length === 0" class="judges-empty">暂无评委，请添加邮箱</div>
              <ul v-else class="judges-list">
                <li v-for="(email, i) in judges" :key="i" class="judges-item">
                  <span class="judges-email">{{ email }}</span>
                  <button type="button" class="btn btn-judge-remove" :disabled="judgesSaving" @click="showJudgeDeleteConfirm(i, email)" title="删除评委">删除</button>
                </li>
              </ul>
              <p v-if="judges.length > 0" class="judges-count">共 {{ judges.length }} 位评委</p>
            </div>
            <div v-if="judgesMessage" class="config-message">{{ judgesMessage }}</div>
          </div>

          <div class="config-card">
            <div class="config-content">
              <div class="config-header-inline">
                <h2 class="config-title">分屏配置</h2>
                <p class="config-subtitle">配置多屏播放的分屏模式</p>
              </div>
              <div class="config-form-group">
                <label class="config-label">分屏模式</label>
                <select v-model="gridLayout" class="config-select">
                  <option value="2x2">2x2 (4屏)</option>
                  <option value="2x3">2x3 (6屏)</option>
                  <option value="3x2">3x2 (6屏)</option>
                  <option value="3x3">3x3 (9屏)</option>
                  <option value="4x4">4x4 (16屏)</option>
                </select>
              </div>
              <div class="config-actions">
                <button type="button" class="btn btn-primary" @click="saveScreenConfigBtn">保存配置</button>
                <a :href="multiScreenHref" target="_blank" rel="noopener" class="btn btn-outline config-link">打开多屏播放 ↗</a>
              </div>
            </div>
            <div v-if="configMessage" class="config-message">{{ configMessage }}</div>
          </div>

          <div class="config-card">
            <div class="config-content">
              <div class="config-header-inline">
                <h2 class="config-title">主题配置</h2>
                <p class="config-subtitle">自定义系统主题颜色</p>
              </div>
              <div class="theme-config-grid">
                <div v-for="item in themeFields" :key="item.key" class="theme-color-group">
                  <label class="theme-color-label">{{ item.label }}</label>
                  <div class="color-picker-wrapper">
                    <input v-model="theme[item.key]" type="color" class="color-picker" @input="syncThemeInput(item.key, $event)">
                    <input v-model="theme[item.key]" type="text" class="color-input" maxlength="7" @input="syncThemePicker(item.key)">
                  </div>
                </div>
              </div>
              <div class="config-actions">
                <button type="button" class="btn btn-primary" @click="saveTheme">保存主题</button>
                <button type="button" class="btn btn-outline" @click="resetTheme">重置默认</button>
              </div>
            </div>
            <div v-if="themeMessage" class="config-message">{{ themeMessage }}</div>
          </div>
        </div>
      </main>
    </div>

    <div class="toast" :class="[toast.type, { show: toast.show }]">
      <span class="toast-icon">{{ toast.icon }}</span>
      <span class="toast-message">{{ toast.message }}</span>
    </div>

    <WorkVideoModal :show="videoModalOpen" :work="previewWork" @close="closeVideoModal" />

    <div class="modal" :class="{ active: deleteModal.show }" @click.self="deleteModal.show = false">
      <div class="modal-content">
        <h3 class="modal-title">确认删除</h3>
        <p class="modal-message">确定要删除作品「{{ deleteModal.title }}」吗？此操作不可恢复。</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="deleteModal.show = false">取消</button>
          <button type="button" class="btn btn-danger" :disabled="deleteModal.loading" @click="confirmDelete">{{ deleteModal.loading ? '删除中...' : '删除' }}</button>
        </div>
      </div>
    </div>

    <div class="modal" :class="{ active: judgeDeleteModal.show }" @click.self="judgeDeleteModal.show = false">
      <div class="modal-content modal-content-sm">
        <h3 class="modal-title">确认删除评委</h3>
        <p class="modal-message">确定要删除评委「{{ judgeDeleteModal.email }}」吗？</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-outline" @click="judgeDeleteModal.show = false">取消</button>
          <button type="button" class="btn btn-danger" @click="confirmRemoveJudge">确定删除</button>
        </div>
      </div>
    </div>

    <div id="votersModal" class="modal" :class="{ active: votersModal.show }" @click.self="votersModal.show = false">
      <div class="modal-content modal-voters">
        <button type="button" class="modal-close" aria-label="关闭" @click="votersModal.show = false">×</button>
        <h3 class="modal-title">投票用户 ({{ votersModal.titleShort }})</h3>
        <div v-if="votersModal.loading" class="loading"><div class="spinner"></div><p>加载中...</p></div>
        <div v-else-if="votersModal.error" class="voters-empty"><p>{{ votersModal.error }}</p></div>
        <div v-else-if="votersModal.voters.length === 0" class="voters-empty"><div style="font-size:3rem;margin-bottom:1rem;">📭</div><p>暂无投票用户</p></div>
        <div v-else class="voters-list-wrap">
          <div class="voters-header">共 {{ votersModal.voters.length }} 人投票</div>
          <div class="voters-list-scroll">
            <div v-for="(v, i) in votersModal.voters" :key="i" class="voter-item">
              <div class="voter-index">{{ i + 1 }}</div>
              <div class="voter-info">
                <div class="voter-name">{{ v.userName || '未知用户' }}</div>
                <div class="voter-time">{{ formatDate(v.createdAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="scoresModal" class="modal" :class="{ active: scoresModal.show }" @click.self="scoresModal.show = false">
      <div class="modal-content modal-scores">
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import WorkVideoPreview from '../components/WorkVideoPreview.vue';
import WorkVideoModal from '../components/WorkVideoModal.vue';
import request from '../api/request';
import { getWorks, deleteWork } from '../api/works';
import { getVoteUsers } from '../api/vote';
import { getWorkJudgeScores } from '../api/judge';
import { getScreenConfig, saveScreenConfig as apiSaveScreenConfig } from '../api/screenConfig';

const router = useRouter();
const TOKEN_KEY = 'auth_token';

const activeTab = ref('works');
const adminLoggedIn = ref(false);
const works = ref([]);
const worksLoading = ref(true);
const gridLayout = ref('2x2');
const maxVotesPerUser = ref(1);
const maxVotesMessage = ref('');
const judges = ref([]);
const judgeEmailInput = ref('');
const judgesMessage = ref('');
const judgesSaving = ref(false);
const theme = reactive({
  primaryColor: '#2563eb',
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',
  secondaryColor: '#64748b',
});
const themeFields = [
  { key: 'primaryColor', label: '主色' },
  { key: 'primaryDark', label: '深色' },
  { key: 'primaryLight', label: '浅色' },
  { key: 'secondaryColor', label: '辅助色' },
];
const themeMessage = ref('');
const configMessage = ref('');
const voteOpenStartInput = ref('');
const voteOpenEndInput = ref('');
const scoreOpenStartInput = ref('');
const scoreOpenEndInput = ref('');
const openTimeMessage = ref('');
const toast = reactive({ show: false, type: 'success', icon: '✓', message: '' });
const deleteModal = reactive({ show: false, id: null, title: '', loading: false });
const votersModal = reactive({ show: false, workId: null, titleShort: '', loading: false, error: '', voters: [] });
const scoresModal = reactive({ show: false, workId: null, titleShort: '', loading: false, error: '', scores: [] });
const judgeDeleteModal = reactive({ show: false, index: null, email: '' });
const previewWork = ref(null);
const videoModalOpen = ref(false);

/** Hash 路由下新开多屏播放的完整 URL */
const multiScreenHref = computed(() =>
  typeof window !== 'undefined' ? window.location.origin + (window.location.pathname || '/') + '#/multi-screen' : '#/multi-screen'
);

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
}

function setToken(t) {
  if (t) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem('token', t);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
  }
}

const totalVotes = computed(() => works.value.reduce((s, w) => s + (w.voteCount || 0), 0));
const totalUsers = computed(() => {
  const set = new Set();
  works.value.forEach((w) => { if (w.userId) set.add(w.userId); });
  return set.size;
});
const sortedWorks = computed(() => [...works.value].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));

function formatDate(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function openVideoPreview(work) {
  const url = work?.fileUrl ?? work?.file_url;
  if (!url) return;
  previewWork.value = work;
  videoModalOpen.value = true;
}

function closeVideoModal() {
  previewWork.value = null;
  videoModalOpen.value = false;
}

function applyTheme(t) {
  if (!t) return;
  const root = document.documentElement;
  if (t.primaryColor) root.style.setProperty('--primary-color', t.primaryColor);
  if (t.primaryDark) root.style.setProperty('--primary-dark', t.primaryDark);
  if (t.primaryLight) root.style.setProperty('--primary-light', t.primaryLight);
  if (t.secondaryColor) root.style.setProperty('--secondary-color', t.secondaryColor);
  const pd = t.primaryDark || '#1e40af';
  const pc = t.primaryColor || '#2563eb';
  root.style.setProperty('--gradient', `linear-gradient(135deg, ${pd} 0%, ${pc} 100%)`);
}

function syncThemeInput(key, e) {
  const v = e.target?.value;
  if (v) theme[key] = v;
}

function syncThemePicker(key) {
  if (/^#[0-9A-Fa-f]{6}$/.test(theme[key])) return;
  themeMessage.value = '';
}

function showToast(message, type = 'success') {
  toast.message = message;
  toast.type = type;
  toast.icon = type === 'success' ? '✓' : '✕';
  toast.show = true;
  setTimeout(() => { toast.show = false; }, 3000);
}

async function loadWorksList() {
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

function tsToDatetimeLocal(ts) {
  if (ts == null || ts === '') return '';
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}
function datetimeLocalToTs(s) {
  if (s == null || String(s).trim() === '') return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

async function loadScreenConfigData() {
  try {
    const res = await getScreenConfig();
    if (res.success && res.data) {
      gridLayout.value = res.data.gridLayout || '2x2';
      maxVotesPerUser.value = res.data.maxVotesPerUser != null ? Number(res.data.maxVotesPerUser) : 1;
      judges.value = Array.isArray(res.data.judges) ? [...res.data.judges] : [];
      voteOpenStartInput.value = tsToDatetimeLocal(res.data.voteOpenStart);
      voteOpenEndInput.value = tsToDatetimeLocal(res.data.voteOpenEnd);
      scoreOpenStartInput.value = tsToDatetimeLocal(res.data.scoreOpenStart);
      scoreOpenEndInput.value = tsToDatetimeLocal(res.data.scoreOpenEnd);
      const t = res.data.theme;
      if (t) {
        if (t.primaryColor) theme.primaryColor = t.primaryColor;
        if (t.primaryDark) theme.primaryDark = t.primaryDark;
        if (t.primaryLight) theme.primaryLight = t.primaryLight;
        if (t.secondaryColor) theme.secondaryColor = t.secondaryColor;
        applyTheme(theme);
      }
    }
  } catch {}
}

function saveOpenTimeConfig() {
  const vs = datetimeLocalToTs(voteOpenStartInput.value);
  const ve = datetimeLocalToTs(voteOpenEndInput.value);
  const ss = datetimeLocalToTs(scoreOpenStartInput.value);
  const se = datetimeLocalToTs(scoreOpenEndInput.value);
  if (vs != null && ve != null && vs > ve) {
    showToast('投票开始时间不能晚于结束时间', 'error');
    return;
  }
  if (ss != null && se != null && ss > se) {
    showToast('评分开始时间不能晚于结束时间', 'error');
    return;
  }
  openTimeMessage.value = '';
  apiSaveScreenConfig({
    voteOpenStart: vs,
    voteOpenEnd: ve,
    scoreOpenStart: ss,
    scoreOpenEnd: se,
  })
    .then((res) => {
      if (res.success) {
        openTimeMessage.value = '已保存';
        showToast('开放时间已保存', 'success');
      } else {
        openTimeMessage.value = res.error?.message || '保存失败';
      }
    })
    .catch(() => {
      openTimeMessage.value = '保存失败，请重试';
    });
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).trim());
}

function saveMaxVotes() {
  const n = Number(maxVotesPerUser.value);
  if (Number.isNaN(n) || n < 1 || n > 100) {
    showToast('请输入 1–100 的整数', 'error');
    return;
  }
  maxVotesMessage.value = '';
  apiSaveScreenConfig({ maxVotesPerUser: n })
    .then((res) => {
      if (res.success) {
        maxVotesMessage.value = '已保存';
        showToast('每人最多投票数已保存', 'success');
      } else {
        maxVotesMessage.value = res.error?.message || '保存失败';
      }
    })
    .catch(() => {
      maxVotesMessage.value = '保存失败，请重试';
    });
}

function addJudge() {
  const email = judgeEmailInput.value.trim();
  if (!email) return;
  if (!isEmail(email)) {
    showToast('请输入有效邮箱', 'error');
    return;
  }
  if (judges.value.includes(email)) {
    showToast('该邮箱已在列表中', 'error');
    return;
  }
  judges.value = [...judges.value, email];
  judgeEmailInput.value = '';
  saveJudges();
}

function showJudgeDeleteConfirm(index, email) {
  judgeDeleteModal.index = index;
  judgeDeleteModal.email = email;
  judgeDeleteModal.show = true;
}

function confirmRemoveJudge() {
  const { index, email } = judgeDeleteModal;
  judgeDeleteModal.show = false;
  judgeDeleteModal.index = null;
  judgeDeleteModal.email = '';
  if (index == null) return;
  judges.value = judges.value.filter((_, i) => i !== index);
  saveJudges();
}

function saveJudges() {
  judgesMessage.value = '';
  judgesSaving.value = true;
  apiSaveScreenConfig({ judges: judges.value })
    .then((res) => {
      if (res.success) {
        judgesMessage.value = '已保存';
        showToast('评委列表已保存', 'success');
      } else {
        judgesMessage.value = res.error?.message || '保存失败';
      }
    })
    .catch(() => {
      judgesMessage.value = '保存失败，请重试';
    })
    .finally(() => {
      judgesSaving.value = false;
    });
}

function showDelete(work) {
  deleteModal.id = work.id;
  deleteModal.title = work.title || '未命名作品';
  deleteModal.show = true;
  deleteModal.loading = false;
}

async function confirmDelete() {
  if (!deleteModal.id) return;
  deleteModal.loading = true;
  try {
    const res = await deleteWork(deleteModal.id);
    if (res.success) {
      showToast('作品删除成功', 'success');
      deleteModal.show = false;
      deleteModal.id = null;
      await loadWorksList();
    } else {
      showToast(res.error?.message || '删除失败', 'error');
    }
  } catch {
    showToast('删除失败，请重试', 'error');
  } finally {
    deleteModal.loading = false;
  }
}

function showVoters(work) {
  votersModal.workId = work.id;
  votersModal.titleShort = (work.title || '未命名').length > 30 ? (work.title || '未命名').slice(0, 30) + '...' : (work.title || '未命名');
  votersModal.show = true;
  votersModal.loading = true;
  votersModal.error = '';
  votersModal.voters = [];
  getVoteUsers(work.id)
    .then((res) => {
      if (res.success && res.data?.voters) {
        votersModal.voters = res.data.voters;
      } else {
        votersModal.error = '加载失败，请重试';
      }
    })
    .catch(() => {
      votersModal.error = '加载失败，请重试';
    })
    .finally(() => {
      votersModal.loading = false;
    });
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

function saveTheme() {
  const t = { ...theme };
  if (!/^#[0-9A-Fa-f]{6}$/.test(t.primaryColor) || !/^#[0-9A-Fa-f]{6}$/.test(t.primaryDark) || !/^#[0-9A-Fa-f]{6}$/.test(t.primaryLight) || !/^#[0-9A-Fa-f]{6}$/.test(t.secondaryColor)) {
    showToast('颜色格式不正确，请使用十六进制格式（如 #2563eb）', 'error');
    return;
  }
  themeMessage.value = '';
  getScreenConfig()
    .then((configRes) => {
      const grid = configRes.success && configRes.data?.gridLayout ? configRes.data.gridLayout : gridLayout.value;
      return apiSaveScreenConfig({ gridLayout: grid, theme: t });
    })
    .then((res) => {
      if (res.success) {
        themeMessage.value = '主题配置保存成功';
        showToast('主题配置保存成功', 'success');
      } else {
        themeMessage.value = res.error?.message || '保存失败';
      }
    })
    .catch(() => {
      themeMessage.value = '保存失败，请重试';
    });
}

function resetTheme() {
  theme.primaryColor = '#2563eb';
  theme.primaryDark = '#1e40af';
  theme.primaryLight = '#3b82f6';
  theme.secondaryColor = '#64748b';
  applyTheme(theme);
  themeMessage.value = '已重置为默认，点击保存主题生效';
}

function saveScreenConfigBtn() {
  configMessage.value = '';
  apiSaveScreenConfig({ gridLayout: gridLayout.value })
    .then((res) => {
      if (res.success) {
        configMessage.value = '大屏配置保存成功';
        showToast('大屏配置保存成功', 'success');
      } else {
        configMessage.value = res.error?.message || '保存失败';
      }
    })
    .catch(() => {
      configMessage.value = '保存失败，请重试';
    });
}

function handleLogout() {
  request.post('/api/auth/logout').catch(() => {});
  setToken(null);
  adminLoggedIn.value = false;
  router.push('/');
}

onMounted(async () => {
  const t = getToken();
  if (t) {
    try {
      const res = await request.get('/api/auth/me');
      if (res.data?.success && res.data?.data) {
        const u = res.data.data;
        if (u.role === 'admin') {
          adminLoggedIn.value = true;
          await loadScreenConfigData();
          await loadWorksList();
          return;
        }
      }
    } catch {}
    setToken(null);
  }
  router.replace({ name: 'Login', query: { admin: '1' } });
});
</script>

<style scoped>
.admin-redirect {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: var(--text-secondary);
}

.admin-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 1.5rem;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover {
  color: var(--primary-color);
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.tab-panel {
  animation: fadeIn 0.2s ease;
  width: 100%;
}
/* 配置管理 tab：配置卡片与内容区占满容器宽度，与作品列表一致 */
.admin-page .tab-panel .config-card {
  width: 100%;
  max-width: none;
}
.admin-page .tab-panel .config-content {
  width: 100%;
  max-width: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.work-actions {
  display: flex;
  gap: 0.5rem;
}

.work-actions .btn-sm {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.config-input {
  min-width: 200px;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 1rem;
}
@media (max-width: 768px) {
  .admin-page .config-input {
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }
}
.config-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.config-open-time-rows {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1rem;
}
.config-open-time-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
}
.config-open-time-label {
  flex: 0 0 auto;
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--text-primary);
  min-width: 5rem;
  padding-bottom: 0.25rem;
}
.config-open-time-row .config-form-group {
  flex: 1;
  min-width: 180px;
}
@media (max-width: 768px) {
  .config-open-time-row .config-form-group {
    min-width: 0;
    width: 100%;
  }
}

.judges-add {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.judges-add .config-input {
  flex: 1;
  min-width: 0;
}
.judges-empty {
  color: var(--text-secondary);
  font-size: 0.9375rem;
  margin: 0.5rem 0 1rem;
}
.judges-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.judges-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  box-sizing: border-box;
}
.judges-email {
  font-size: 0.9375rem;
  color: var(--text-primary);
  word-break: break-all;
}
.judges-count {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}
.btn-judge-remove {
  flex-shrink: 0;
  padding: 0.35rem 0.65rem;
  font-size: 0.8125rem;
  color: var(--danger-color, #ef4444);
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}
.btn-judge-remove:hover:not(:disabled) {
  color: #fff;
  background: var(--danger-color, #ef4444);
  border-color: var(--danger-color, #ef4444);
}
.btn-judge-remove:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-content-sm {
  max-width: 420px;
}
.modal-content-sm .modal-title {
  margin-bottom: 0.5rem;
}
.modal-content-sm .modal-message {
  margin-bottom: 1.25rem;
  font-size: 0.9375rem;
}
.modal-content-sm .modal-actions {
  justify-content: flex-end;
}

#adminContent { display: block; }

/* 作品列表区域加宽，表格占满容器 */
.admin-page .works-table-container {
  width: 100%;
}
.admin-page .works-table-container .table {
  width: 100%;
}
.admin-page .works-table-container .table .work-title {
  max-width: none;
}

/* 预览列可点击播放：与 Score 一致，使用 WorkVideoPreview + WorkVideoModal */
.admin-page .works-table-container .table tbody tr td:first-child {
  vertical-align: middle;
  padding: 0.5rem;
}
.admin-page .works-table-container .table tbody tr td:first-child :deep(.work-video-preview-wrap) {
  display: inline-block;
  cursor: pointer;
}

.modal#deleteModal { z-index: 3000; }
.modal#votersModal .modal-content { max-width: 600px; }
.modal-voters .voters-list-wrap { display: flex; flex-direction: column; min-height: 0; }
.modal-voters .voters-list-scroll { max-height: min(400px, 60vh); overflow-y: auto; }
.modal#scoresModal .modal-content { max-width: 600px; }
.modal-scores .scores-list-wrap { display: flex; flex-direction: column; min-height: 0; }
.modal-scores .scores-list-scroll { max-height: min(400px, 60vh); overflow-y: auto; }
.score-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--border-color); }
.score-item:last-child { border-bottom: none; }
.score-info { flex: 1; min-width: 0; }
.score-judge { font-weight: 500; color: var(--text-primary); margin-bottom: 0.25rem; }
.score-value { font-weight: 700; color: var(--primary-color); font-size: 1.125rem; margin-bottom: 0.25rem; }

</style>
