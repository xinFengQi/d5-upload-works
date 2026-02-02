/**
 * 上传页面路由处理
 */

import type { Env } from '../types/env';

export async function handleUploadPage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>上传作品 - 2026年会作品投票</title>
  <link rel="icon" type="image/png" href="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      /* 主题色 - 专业蓝色系 */
      --primary-color: #2563eb;
      --primary-dark: #1e40af;
      --primary-light: #3b82f6;
      --secondary-color: #64748b;
      
      /* 背景色 */
      --bg-primary: #ffffff;
      --bg-secondary: #f9fafb;
      
      /* 文字色 */
      --text-primary: #1f2937;
      --text-secondary: #6b7280;
      
      /* 边框和分割线 */
      --border-color: #e5e7eb;
      
      /* 功能色 */
      --danger-color: #ef4444;
      --success-color: #10b981;
      
      /* 渐变 - 使用主题色 */
      --gradient: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%);
      
      /* 阴影 */
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      color: var(--text-primary);
      background: var(--bg-secondary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .navbar {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 1.5rem;
      box-shadow: var(--shadow);
    }

    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      display: flex;
      align-items: center;
      text-decoration: none;
    }

    .logo-img {
      height: 40px;
      width: auto;
      transition: transform 0.3s ease;
    }

    .logo:hover .logo-img {
      transform: scale(1.05);
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      text-decoration: none;
      display: inline-block;
      font-size: 0.875rem;
    }

    .btn-primary {
      background: var(--gradient);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-outline {
      background: transparent;
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .btn-outline:hover {
      background: var(--bg-secondary);
    }

    .container {
      max-width: 800px;
      margin: 1.5rem auto;
      padding: 1.5rem;
    }

    .upload-card {
      background: var(--bg-primary);
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: var(--shadow-lg);
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .page-subtitle {
      color: var(--text-secondary);
      font-size: 0.9375rem;
      margin-bottom: 0.25rem;
    }

    .page-tagline {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      font-style: italic;
      margin-bottom: 1.5rem;
      opacity: 0.8;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
    }

    .form-input {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      transition: all 0.3s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .form-hint {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: 0.25rem;
    }

    .upload-area {
      border: 2px dashed var(--border-color);
      border-radius: 0.75rem;
      padding: 2rem 1.5rem;
      text-align: center;
      background: var(--bg-secondary);
      transition: all 0.3s ease;
      cursor: pointer;
      margin-bottom: 1.25rem;
      min-height: 180px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .upload-area:hover,
    .upload-area.dragover {
      border-color: var(--primary-color);
      background: rgba(99, 102, 241, 0.05);
    }

    .upload-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
      color: var(--primary-color);
    }

    .upload-text {
      font-size: 1rem;
      margin-bottom: 0.375rem;
      font-weight: 500;
    }

    .upload-hint {
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }

    #fileInput {
      display: none;
    }

    .file-info {
      display: none;
      padding: 0.875rem;
      background: var(--bg-secondary);
      border-radius: 0.5rem;
      margin-top: 0.75rem;
    }

    .file-info.active {
      display: block;
    }

    .file-name {
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .file-size {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .submit-btn {
      width: 100%;
      padding: 0.875rem;
      font-size: 1rem;
      margin-top: 1rem;
    }

    .loading {
      display: none;
      text-align: center;
      padding: 2rem;
    }

    .loading.active {
      display: block;
    }

    .spinner {
      border: 3px solid var(--border-color);
      border-top: 3px solid var(--primary-color);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* 提示弹框 */
    .toast-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2000;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .toast-modal.active {
      display: flex;
    }

    .toast-content {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .toast-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .toast-icon.success {
      color: #10b981;
    }

    .toast-icon.error {
      color: #ef4444;
    }

    .toast-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #1f2937;
    }

    .toast-message {
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      background: rgba(0, 0, 0, 0.02);
      padding: 0.75rem;
      border-radius: 0.375rem;
      line-height: 1.6;
    }

    .toast-button {
      width: 100%;
      padding: 0.75rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      background: var(--gradient);
      color: white;
    }

    .toast-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
    }

    /* 响应式优化 */
    @media (max-width: 768px) {
      .container {
        margin: 1rem auto;
        padding: 1rem;
      }

      .upload-card {
        padding: 1.25rem;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .page-subtitle {
        font-size: 0.875rem;
      }

      .page-tagline {
        font-size: 0.75rem;
        margin-bottom: 1.25rem;
      }

      .upload-area {
        padding: 1.5rem 1rem;
        min-height: 150px;
      }

      .upload-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .upload-text {
        font-size: 0.9375rem;
      }

      .upload-hint {
        font-size: 0.75rem;
      }

      .form-group {
        margin-bottom: 1rem;
      }

      .navbar {
        padding: 0.625rem 1rem;
      }
    }

    @media (max-width: 480px) {
      .container {
        margin: 0.75rem auto;
        padding: 0.75rem;
      }

      .upload-card {
        padding: 1rem;
      }

      .upload-area {
        padding: 1.25rem 0.75rem;
        min-height: 130px;
      }
    }

    /* 确保页面内容在一屏内 */
    @media (min-height: 800px) {
      .container {
        margin-top: 1rem;
        margin-bottom: 1rem;
      }
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="nav-container">
      <a href="/" class="logo">
        <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render" class="logo-img">
      </a>
      <div>
        <a href="/" class="btn btn-outline">返回首页</a>
      </div>
    </div>
  </nav>

  <div class="container">
    <div class="upload-card">
      <h1 class="page-title">上传作品</h1>
      <p class="page-subtitle">释放你的想象力，分享你的创作</p>
      <p class="page-tagline">进入心流之境，体验创作自由</p>


      <form id="uploadForm">
        <div class="form-group">
          <label class="form-label">作品标题 <span style="color: var(--text-secondary);">(最多200字)</span></label>
          <input 
            type="text" 
            class="form-input" 
            id="workTitle" 
            placeholder="请输入作品标题"
            maxlength="200"
            required
          >
          <div class="form-hint">剩余 <span id="titleCount">200</span> 字</div>
        </div>

        <div class="form-group">
          <label class="form-label">创作者名称</label>
          <input 
            type="text" 
            class="form-input" 
            id="creatorName" 
            placeholder="自动显示您的钉钉昵称"
            readonly
            style="background: var(--bg-secondary);"
          >
        </div>

        <div class="form-group">
          <label class="form-label">上传视频</label>
          <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
            <div class="upload-icon">📁</div>
            <div class="upload-text">点击选择文件或拖拽文件到此处</div>
            <div class="upload-hint">支持格式：mp4, mov, avi | 最大 100MB</div>
            <input type="file" id="fileInput" accept="video/mp4,video/quicktime,video/x-msvideo">
          </div>
          <div class="file-info" id="fileInfo">
            <div class="file-name" id="fileName"></div>
            <div class="file-size" id="fileSize"></div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary submit-btn" id="submitBtn">
          上传作品
        </button>
      </form>

      <div class="loading" id="loading">
        <div class="spinner"></div>
        <p style="margin-top: 1rem; color: var(--text-secondary);">上传中...</p>
      </div>
    </div>
  </div>

  <script>
    let selectedFile = null;
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

    // 检查登录状态
    async function checkAuth() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login';
        return null;
      }

      try {
        const response = await fetch('/auth/me', {
          headers: {
            'Authorization': \`Bearer \${token}\`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            return data.data;
          }
        }
        
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return null;
      } catch (error) {
        console.error('认证检查失败:', error);
        window.location.href = '/login';
        return null;
      }
    }

    // 标题字数统计
    document.getElementById('workTitle').addEventListener('input', (e) => {
      const count = 200 - e.target.value.length;
      document.getElementById('titleCount').textContent = count;
    });

    // 文件选择
    document.getElementById('fileInput').addEventListener('change', (e) => {
      handleFileSelect(e.target.files[0]);
    });

    // 拖拽上传
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      handleFileSelect(e.dataTransfer.files[0]);
    });

    function handleFileSelect(file) {
      if (!file) return;

      // 验证文件类型
      if (!ALLOWED_TYPES.includes(file.type)) {
        showError('不支持的文件格式，请上传 mp4、mov 或 avi 格式的视频');
        return;
      }

      // 验证文件大小
      if (file.size > MAX_FILE_SIZE) {
        showError(\`文件大小超过 100MB，请选择较小的文件\`);
        return;
      }

      selectedFile = file;
      document.getElementById('fileInfo').classList.add('active');
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileSize').textContent = \`文件大小：\${(file.size / 1024 / 1024).toFixed(2)} MB\`;
    }

    // 表单提交
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const title = document.getElementById('workTitle').value.trim();
      if (!title) {
        showError('请输入作品标题');
        return;
      }

      if (!selectedFile) {
        showError('请选择要上传的视频文件');
        return;
      }

      // 显示加载状态
      document.getElementById('loading').classList.add('active');
      document.getElementById('submitBtn').disabled = true;

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${token}\`
          },
          body: formData
        });

        const data = await response.json();
        
        if (data.success) {
          showSuccess('上传成功！3秒后自动跳转到投票页面');
        } else {
          // 显示错误信息和调试信息
          const errorMessage = data.error?.message || '上传失败，请重试';
          const debugInfo = data.error?.details?.debug;
          
          if (debugInfo) {
            // 构建详细的错误信息
            let detailedMessage = errorMessage + '\\n\\n调试信息：\\n';
            detailedMessage += '状态码: ' + (debugInfo.status || 'N/A') + '\\n';
            detailedMessage += '状态文本: ' + (debugInfo.statusText || 'N/A') + '\\n';
            detailedMessage += '错误详情: ' + (debugInfo.error || 'N/A') + '\\n';
            detailedMessage += '请求URL: ' + (debugInfo.url || 'N/A') + '\\n';
            detailedMessage += '资源路径: ' + (debugInfo.resource || 'N/A') + '\\n';
            detailedMessage += 'Bucket: ' + (debugInfo.bucket || 'N/A') + '\\n';
            detailedMessage += 'Region: ' + (debugInfo.region || 'N/A') + '\\n';
            detailedMessage += 'Endpoint: ' + (debugInfo.endpoint || 'N/A') + '\\n';
            detailedMessage += '文件类型: ' + (debugInfo.contentType || 'N/A') + '\\n';
            detailedMessage += '文件大小: ' + (debugInfo.fileSize ? (debugInfo.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A') + '\\n';
            detailedMessage += '文件名: ' + (debugInfo.fileName || 'N/A') + '\\n';
            detailedMessage += 'AccessKey配置: ' + (debugInfo.hasAccessKey ? '已配置' : '未配置') + '\\n';
            detailedMessage += 'Secret配置: ' + (debugInfo.hasSecret ? '已配置' : '未配置') + '\\n';
            if (debugInfo.accessKeyIdPrefix) {
              detailedMessage += 'AccessKey ID前缀: ' + debugInfo.accessKeyIdPrefix + '\\n';
            }
            
            showError(detailedMessage);
          } else {
            showError(errorMessage);
          }
        }
      } catch (error) {
        console.error('上传失败:', error);
        showError('上传失败，请检查网络连接后重试');
      } finally {
        document.getElementById('loading').classList.remove('active');
        document.getElementById('submitBtn').disabled = false;
      }
    });

    function showError(message) {
      const modal = document.getElementById('toastModal');
      const icon = document.getElementById('toastIcon');
      const title = document.getElementById('toastTitle');
      const msg = document.getElementById('toastMessage');
      const button = document.getElementById('toastButton');
      
      icon.className = 'toast-icon error';
      icon.textContent = '❌';
      title.textContent = '上传失败';
      msg.textContent = message;
      button.textContent = '确定';
      button.onclick = () => {
        modal.classList.remove('active');
      };
      
      modal.classList.add('active');
    }

    function hideError() {
      document.getElementById('toastModal').classList.remove('active');
    }

    function showSuccess(message) {
      const modal = document.getElementById('toastModal');
      const icon = document.getElementById('toastIcon');
      const title = document.getElementById('toastTitle');
      const msg = document.getElementById('toastMessage');
      const button = document.getElementById('toastButton');
      
      icon.className = 'toast-icon success';
      icon.textContent = '✅';
      title.textContent = '上传成功';
      msg.textContent = message;
      button.textContent = '确定';
      button.onclick = () => {
        modal.classList.remove('active');
        window.location.href = '/';
      };
      
      modal.classList.add('active');
      
      // 3秒后自动跳转
      setTimeout(() => {
        if (modal.classList.contains('active')) {
          window.location.href = '/';
        }
      }, 3000);
    }

    function hideSuccess() {
      document.getElementById('toastModal').classList.remove('active');
    }

    // 加载并应用主题配置
    async function loadAndApplyTheme() {
      try {
        const response = await fetch('/api/screen-config');
        const data = await response.json();
        
        if (data.success && data.data && data.data.theme) {
          const theme = data.data.theme;
          const root = document.documentElement;
          
          if (theme.primaryColor) {
            root.style.setProperty('--primary-color', theme.primaryColor);
          }
          if (theme.primaryDark) {
            root.style.setProperty('--primary-dark', theme.primaryDark);
          }
          if (theme.primaryLight) {
            root.style.setProperty('--primary-light', theme.primaryLight);
          }
          if (theme.secondaryColor) {
            root.style.setProperty('--secondary-color', theme.secondaryColor);
          }
          
          // 更新渐变
          const primaryDark = theme.primaryDark || '#1e40af';
          const primaryColor = theme.primaryColor || '#2563eb';
          root.style.setProperty('--gradient', \`linear-gradient(135deg, \${primaryDark} 0%, \${primaryColor} 100%)\`);
        }
      } catch (error) {
        console.error('Load theme error:', error);
      }
    }

    // 页面加载时检查登录状态
    window.addEventListener('load', async () => {
      // 先加载主题配置
      await loadAndApplyTheme();
      const user = await checkAuth();
      if (user) {
        document.getElementById('creatorName').value = user.name || '未知';
      }

      // 检查 URL 中是否有 token
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) {
        localStorage.setItem('auth_token', token);
        window.history.replaceState({}, document.title, window.location.pathname);
        const user = await checkAuth();
        if (user) {
          document.getElementById('creatorName').value = user.name || '未知';
        }
      }
    });

    // 点击弹框外部关闭（在 DOM 加载完成后执行）
    window.addEventListener('DOMContentLoaded', () => {
      const toastModal = document.getElementById('toastModal');
      if (toastModal) {
        toastModal.addEventListener('click', function(e) {
          if (e.target.id === 'toastModal') {
            toastModal.classList.remove('active');
          }
        });
      }
    });
  </script>

  <!-- 提示弹框 -->
  <div class="toast-modal" id="toastModal">
    <div class="toast-content">
      <div class="toast-icon" id="toastIcon"></div>
      <h3 class="toast-title" id="toastTitle"></h3>
      <p class="toast-message" id="toastMessage"></p>
      <button class="toast-button" id="toastButton">确定</button>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
