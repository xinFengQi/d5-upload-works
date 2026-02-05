<template>
  <div>
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/" class="logo">
          <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render" class="logo-img">
        </router-link>
        <div>
          <router-link to="/" class="btn btn-outline">返回首页</router-link>
        </div>
      </div>
    </nav>

    <div class="container">
      <div class="upload-card">
        <h1 class="page-title">上传作品</h1>
        <p class="page-subtitle">释放你的想象力，分享你的创作</p>
        <p class="page-tagline">进入心流之境，体验创作自由</p>

        <form @submit.prevent="onSubmit">
          <div class="form-group">
            <label class="form-label">作品标题 <span class="text-muted">(最多200字)</span></label>
            <input
              v-model="title"
              type="text"
              class="form-input"
              placeholder="请输入作品标题"
              maxlength="200"
              required
              @input="title = (title || '').slice(0, 200)"
            >
            <div class="form-hint">剩余 {{ 200 - title.length }} 字</div>
          </div>

          <div class="form-group">
            <label class="form-label">作品描述 <span class="text-muted">(最多500字)</span></label>
            <textarea
              v-model="description"
              class="form-input form-textarea"
              placeholder="请输入作品描述（选填）"
              maxlength="500"
              rows="4"
              @input="description = (description || '').slice(0, 500)"
            ></textarea>
            <div class="form-hint">剩余 {{ 500 - description.length }} 字</div>
          </div>

          <div class="form-group">
            <label class="form-label">创作者名称</label>
            <input
              type="text"
              class="form-input"
              :value="user?.name || ''"
              placeholder="自动显示您的钉钉昵称"
              readonly
              style="background: var(--bg-secondary);"
            >
          </div>

          <div class="form-group">
            <label class="form-label">上传视频</label>
            <div
              class="upload-area"
              :class="{ dragover: isDragging }"
              @click="triggerFileInput"
              @dragover.prevent="isDragging = true"
              @dragleave="isDragging = false"
              @drop.prevent="onDrop"
            >
              <div class="upload-icon">📁</div>
              <div class="upload-text">点击选择文件或拖拽文件到此处</div>
              <div class="upload-hint">支持格式：mp4, mov, avi | 最大 1GB</div>
              <input
                ref="fileInputRef"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/avi"
                style="display: none"
                @change="onFileChange"
              >
            </div>
            <div v-if="selectedFile" class="file-info active">
              <div class="file-name" :title="selectedFile.name">{{ selectedFile.name }}</div>
              <div class="file-size">文件大小：{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary submit-btn" :disabled="uploading">
            上传作品
          </button>
        </form>

      </div>
    </div>

    <!-- 上传中弹框（带进度条） -->
    <Teleport to="body">
      <Transition name="upload-modal-fade">
        <div v-show="uploading" class="upload-modal-overlay">
          <div class="upload-modal">
            <div class="upload-modal-icon">📤</div>
            <h3 class="upload-modal-title">{{ uploadPhase === 'saving' ? '正在保存作品信息...' : '正在上传' }}</h3>
            <p class="upload-modal-filename">{{ selectedFile?.name || '' }}</p>
            <div class="upload-progress-wrap">
              <div class="upload-progress-bar">
                <div class="upload-progress-fill" :style="{ width: uploadProgress + '%' }"></div>
              </div>
              <span class="upload-progress-text">{{ uploadProgress }}%</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="toast-modal" :class="{ active: toast.show }" @click.self="toast.show = false">
      <div class="toast-content">
        <div class="toast-icon" :class="toast.type">{{ toast.icon }}</div>
        <h3 class="toast-title">{{ toast.title }}</h3>
        <p class="toast-message">{{ toast.message }}</p>
        <button type="button" class="toast-button" @click="closeToast">{{ toast.btnText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import OSS from 'ali-oss';
import { useAuth } from '../composables/useAuth';
import { getStsCredentials, completeUpload, uploadWork } from '../api/upload';
import { checkWorkTitle } from '../api/works';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];

const router = useRouter();
const { user, token, checkAuth } = useAuth();

const title = ref('');
const description = ref('');
const selectedFile = ref(null);
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadPhase = ref('uploading'); // 'uploading' | 'saving'
const isDragging = ref(false);
const fileInputRef = ref(null);
const toast = reactive({
  show: false,
  type: 'success',
  icon: '✅',
  title: '',
  message: '',
  btnText: '确定',
});

function triggerFileInput() {
  fileInputRef.value?.click();
}

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showError('不支持的文件格式，请上传 mp4、mov 或 avi 格式的视频');
    return false;
  }
  if (file.size > MAX_FILE_SIZE) {
    showError('文件大小超过 1GB，请选择较小的文件');
    return false;
  }
  return true;
}

function onFileChange(e) {
  const file = e.target.files?.[0];
  if (file && validateFile(file)) selectedFile.value = file;
}

function onDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files?.[0];
  if (file && validateFile(file)) selectedFile.value = file;
}

function showError(message) {
  toast.type = 'error';
  toast.icon = '❌';
  toast.title = '上传失败';
  toast.message = message;
  toast.btnText = '确定';
  toast.show = true;
}

function showSuccess(message) {
  toast.type = 'success';
  toast.icon = '✅';
  toast.title = '上传成功';
  toast.message = message;
  toast.btnText = '确定';
  toast.show = true;
  const t = setTimeout(() => {
    router.push('/');
    clearTimeout(t);
  }, 3000);
}

function closeToast() {
  toast.show = false;
  if (toast.type === 'success') router.push('/');
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

/** 解析视频 Content-Type：优先 file.type，否则按扩展名，避免分片上传后 OSS 存成 application/octet-stream */
function resolveVideoContentType(file, ext) {
  const t = (file?.type || '').trim().toLowerCase();
  if (t && ALLOWED_TYPES.includes(t)) return t;
  const mimeByExt = { mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo' };
  return mimeByExt[ext] || 'video/mp4';
}

/**
 * 直传结果：success 时 data 为完成接口返回值；失败时 reason 为原因，fallback 表示是否可回退到经后端上传
 * @param {(percent: number) => void} onProgress - 0–100，上传与保存阶段会调用
 */
async function submitWithDirectUpload(file, t2, desc, onProgress) {
  const setProgress = (p) => {
    const n = Math.min(100, Math.max(0, Math.round(p)));
    uploadProgress.value = n;
    if (onProgress) onProgress(n);
  };
  let stsRes;
  try {
    stsRes = await getStsCredentials();
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || '获取直传凭证请求异常';
    console.error('[STS 直传失败] 获取凭证请求异常：', msg, err.response?.data ?? err);
    return { success: false, reason: msg, fallback: true };
  }
  if (!stsRes.success || !stsRes.data) {
    const reason = stsRes.error?.message || stsRes.error?.code || '无法获取直传凭证';
    console.warn('[STS 直传失败] 凭证不可用，将改为经服务器上传。原因：', reason);
    return { success: false, reason, fallback: true };
  }
  if (!user.value?.userid) {
    console.warn('[STS 直传失败] 用户信息未加载，将改为经服务器上传');
    return { success: false, reason: '用户信息未加载', fallback: true };
  }
  const { region, bucket, accessKeyId, accessKeySecret, stsToken } = stsRes.data;
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const objectKey = `works/${user.value.userid}/${Date.now()}_${randomId()}.${ext}`;
  // 确保 OSS 存正确的 Content-Type，否则大文件分片上传会变成 application/octet-stream，浏览器无法按视频播放
  const contentType = resolveVideoContentType(file, ext);
  const client = new OSS({
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    stsToken,
  });
  const size = file.size;
  try {
    if (size > 5 * 1024 * 1024) {
      // 分片上传：必须传 mime，否则 OSS 默认为 application/octet-stream，大视频无法播放
      await client.multipartUpload(objectKey, file, {
        partSize: 5 * 1024 * 1024,
        progress: (p) => setProgress((p ?? 0) * 90),
        mime: contentType,
      });
    } else {
      setProgress(45);
      await client.put(objectKey, file, { headers: { 'Content-Type': contentType } });
      setProgress(90);
    }
  } catch (err) {
    const msg = err.message || err.code || '上传到 OSS 失败';
    console.error('[STS 直传失败] 上传到 OSS 失败：', msg, err);
    return { success: false, reason: `OSS 上传失败：${msg}`, fallback: false };
  }
  // OSS 外网域名为 bucket.oss-cn-xxx.aliyuncs.com，region 需带 oss- 前缀
  setProgress(90);
  uploadPhase.value = 'saving';
  const ossRegion = region.startsWith('oss-') ? region : `oss-${region}`;
  const fileUrl = `https://${bucket}.${ossRegion}.aliyuncs.com/${objectKey}`;
  let completeRes;
  try {
    completeRes = await completeUpload({
      title: t2,
      description: desc || undefined,
      fileUrl,
      fileName: objectKey,
      fileSize: size,
      fileType: contentType,
    });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || '上报作品信息失败';
    console.error('[STS 直传失败] 上报作品信息失败：', msg, err.response?.data ?? err);
    return { success: false, reason: `保存作品失败：${msg}`, fallback: false };
  }
  if (!completeRes.success) {
    const reason = completeRes.error?.message || completeRes.error?.code || '保存作品失败';
    console.error('[STS 直传失败] 保存作品接口返回失败：', reason, completeRes.error);
    return { success: false, reason, fallback: false };
  }
  setProgress(100);
  return { success: true, data: completeRes };
}

async function onSubmit() {
  const t = token.value;
  if (!t) {
    showError('请先登录');
    return;
  }
  const t2 = title.value.trim();
  if (!t2) {
    showError('请输入作品标题');
    return;
  }
  const file = selectedFile.value;
  if (!file) {
    showError('请选择要上传的视频文件');
    return;
  }
  // 先异步校验标题是否重复，再上传文件，避免上传成功后才发现标题重复
  let titleCheck;
  try {
    titleCheck = await checkWorkTitle(t2);
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || '校验标题失败，请重试';
    showError(msg);
    return;
  }
  if (!titleCheck?.success || titleCheck?.data?.available !== true) {
    showError(titleCheck?.error?.message || `作品标题"${t2}"已存在，请使用其他标题`);
    return;
  }
  uploading.value = true;
  uploadProgress.value = 0;
  uploadPhase.value = 'uploading';
  try {
    const desc = description.value.trim() || undefined;
    const directResult = await submitWithDirectUpload(file, t2, desc);
    let res;
    let usedFallback = false;
    if (directResult.success) {
      res = directResult.data;
    } else if (directResult.fallback) {
      console.warn('[STS 直传] 已改为经服务器上传。失败原因：', directResult.reason);
      usedFallback = true;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', t2);
      if (desc) fd.append('description', desc);
      res = await uploadWork(fd, {
        onUploadProgress: (e) => {
          if (e.total && e.total > 0) {
            uploadProgress.value = Math.min(100, Math.round((e.loaded / e.total) * 100));
          }
        },
      });
    } else {
      showError(`直传失败：${directResult.reason}`);
      return;
    }
    if (res.success) {
      showSuccess(usedFallback
        ? '上传成功！（直传不可用，本次经服务器中转。原因见控制台）'
        : '上传成功！3秒后自动跳转到投票页面');
      title.value = '';
      description.value = '';
      selectedFile.value = null;
    } else {
      const msg = res.error?.message || '上传失败，请重试';
      const debug = res.error?.details?.debug;
      showError(debug ? `${msg}\n\n调试信息：\n${JSON.stringify(debug, null, 2)}` : msg);
    }
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message || '上传失败，请检查网络连接后重试';
    console.error('[上传失败]', msg, err.response?.data ?? err);
    showError(msg);
  } finally {
    uploading.value = false;
  }
}

onMounted(async () => {
  const tokenFromUrl = new URLSearchParams(window.location.search).get('token');
  if (tokenFromUrl) {
    const { setToken } = useAuth();
    setToken(tokenFromUrl);
    const hashPath = router.currentRoute.value.fullPath || '/';
    window.history.replaceState({}, document.title, window.location.pathname + '#' + hashPath);
  }
  const u = await checkAuth();
  if (!u) router.push({ name: 'Login' });
});
</script>

<style scoped>
.form-textarea {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}
.toast-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 2000; align-items: center; justify-content: center; padding: 2rem; }
.toast-modal.active { display: flex; }
.toast-content { background: white; border-radius: 1rem; padding: 2rem; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.toast-icon { font-size: 3rem; margin-bottom: 1rem; }
.toast-icon.success { color: #10b981; }
.toast-icon.error { color: #ef4444; }
.toast-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #1f2937; }
.toast-message { color: #6b7280; font-size: 0.875rem; margin-bottom: 1.5rem; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto; font-family: 'Courier New', monospace; background: rgba(0,0,0,0.02); padding: 0.75rem; border-radius: 0.375rem; line-height: 1.6; }
.toast-button { width: 100%; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; border: none; cursor: pointer; transition: all 0.3s ease; background: var(--gradient); color: white; }
.toast-button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

/* 上传中弹框 */
.upload-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
}
.upload-modal-fade-enter-active,
.upload-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.upload-modal-fade-enter-from,
.upload-modal-fade-leave-to {
  opacity: 0;
}
.upload-modal {
  background: var(--bg-secondary, #1e293b);
  border-radius: 1rem;
  padding: 1.75rem;
  min-width: 320px;
  max-width: 90vw;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  text-align: center;
}
.upload-modal-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}
.upload-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
  margin: 0 0 0.5rem 0;
}
.upload-modal-filename {
  font-size: 0.8125rem;
  color: var(--text-secondary, #94a3b8);
  margin: 0 0 1.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upload-progress-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.upload-progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  overflow: hidden;
}
.upload-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.2s ease;
}
.upload-progress-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #f1f5f9);
  min-width: 2.5rem;
}
</style>
