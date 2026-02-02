/**
 * 登录页面路由处理
 */

import type { Env } from '../types/env';
import { generateToken } from '../utils/crypto';
import { KVService } from '../services/kv';
import { DingTalkService } from '../services/dingtalk';
import { isDevelopment } from '../utils/env';

export async function handleLoginPage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const isMock = isDevelopment(env, request);
  const kvService = new KVService(env.MY_KV);

  // 生成 state 并存储（用于防止 CSRF 攻击）
  const state = generateToken();
  await kvService.set(`auth:state:${state}`, { createdAt: Date.now() }, 600); // 10分钟过期

  // 获取钉钉登录 URL
  const dingtalkService = new DingTalkService(env);
  const dingtalkAuthUrl = dingtalkService.getAuthUrl(state);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 - D5 Works</title>
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
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: var(--gradient);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .login-container {
      background: white;
      border-radius: 1.5rem;
      padding: 3rem;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }

    .logo-section {
      margin-bottom: 2rem;
    }

    .logo-img {
      height: 60px;
      width: auto;
      margin-bottom: 1rem;
    }

    .login-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .login-subtitle {
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }

    .login-buttons {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .btn {
      width: 100%;
      padding: 0.875rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: var(--gradient);
      color: white;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.5);
    }

    .btn-outline {
      background: transparent;
      color: var(--primary-color);
      border: 2px solid var(--primary-color);
    }

    .btn-outline:hover {
      background: #f3f4f6;
    }

    .btn-icon {
      font-size: 1.25rem;
    }

    /* 模拟登录模态框 */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .modal.active {
      display: flex;
    }

    .modal-content {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      position: relative;
    }

    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 2rem;
      height: 2rem;
      border: none;
      background: transparent;
      font-size: 1.5rem;
      color: #6b7280;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      transition: all 0.2s ease;
      line-height: 1;
    }

    .modal-close:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .modal-header {
      margin-bottom: 1.5rem;
      padding-right: 2rem;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .modal-subtitle {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: #1f2937;
      text-align: left;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 0.5rem;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .form-input.error {
      border-color: #ef4444;
    }

    .form-input.error:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .error-message {
      display: none;
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 0.5rem;
      color: #dc2626;
      font-size: 0.875rem;
      animation: slideDown 0.3s ease-out;
    }

    .error-message.show {
      display: block;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .form-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-secondary {
      flex: 1;
      background: transparent;
      color: #6b7280;
      border: 2px solid #e5e7eb;
      font-weight: 500;
    }

    .btn-secondary:hover {
      background: #f9fafb;
      border-color: #d1d5db;
      color: #374151;
    }

    .quick-names {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .quick-name-btn {
      padding: 0.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      background: white;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .quick-name-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
      background: #f9fafb;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo-section">
      <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render" class="logo-img">
      <h1 class="login-title">欢迎登录</h1>
      <p class="login-subtitle">登录后即可上传作品并参与投票</p>
    </div>

    <div class="login-buttons">
      <a href="${dingtalkAuthUrl}" class="btn btn-primary">
        <span class="btn-icon">📱</span>
        <span>钉钉登录</span>
      </a>
      ${isMock ? `
      <button class="btn btn-outline" onclick="showMockLogin()">
        <span class="btn-icon">🔧</span>
        <span>模拟登录（开发环境）</span>
      </button>
      ` : ''}
      <button class="btn btn-outline" onclick="showAdminLogin()">
        <span class="btn-icon">👤</span>
        <span>管理员登录</span>
      </button>
    </div>
  </div>

  <!-- 管理员登录模态框 -->
  <div class="modal" id="adminLoginModal">
    <div class="modal-content">
      <button class="modal-close" onclick="closeAdminLogin()" type="button" aria-label="关闭">×</button>
      <div class="modal-header">
        <h2 class="modal-title">管理员登录</h2>
        <p class="modal-subtitle">请输入管理员密码</p>
      </div>
      
      <form id="adminLoginForm" onsubmit="handleAdminLogin(event)">
        <div class="form-group">
          <label class="form-label">管理员密码</label>
          <input 
            type="password" 
            class="form-input" 
            id="adminPassword" 
            placeholder="请输入管理员密码"
            required
          >
          <div class="error-message" id="adminError"></div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" style="width: 100%;">登录</button>
        </div>
      </form>
    </div>
  </div>

  <!-- 模拟登录模态框 -->
  <div class="modal" id="mockLoginModal">
    <div class="modal-content">
      <button class="modal-close" onclick="closeMockLogin()" type="button" aria-label="关闭">×</button>
      <div class="modal-header">
        <h2 class="modal-title">模拟登录</h2>
        <p class="modal-subtitle">开发环境 - 无需真实钉钉账号</p>
      </div>
      
      <form id="mockLoginForm" onsubmit="handleMockLogin(event)">
        <div class="form-group">
          <label class="form-label">用户名（可选）</label>
          <input 
            type="text" 
            class="form-input" 
            id="userName" 
            placeholder="留空将使用随机名称"
          >
          <div class="quick-names">
            <button type="button" class="quick-name-btn" onclick="setQuickName('张三')">张三</button>
            <button type="button" class="quick-name-btn" onclick="setQuickName('李四')">李四</button>
            <button type="button" class="quick-name-btn" onclick="setQuickName('王五')">王五</button>
            <button type="button" class="quick-name-btn" onclick="setQuickName('测试用户')">测试用户</button>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" style="width: 100%;">登录</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const state = '${state}';

    function showMockLogin() {
      document.getElementById('mockLoginModal').classList.add('active');
    }

    function closeMockLogin() {
      document.getElementById('mockLoginModal').classList.remove('active');
    }

    function setQuickName(name) {
      document.getElementById('userName').value = name;
    }

    function handleMockLogin(event) {
      event.preventDefault();
      const userName = document.getElementById('userName').value.trim();
      
      // 重定向到回调，携带模拟的 code
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set('code', 'mock_code_' + Date.now());
      callbackUrl.searchParams.set('state', state);
      if (userName) {
        callbackUrl.searchParams.set('mock_user', userName);
      }
      
      window.location.href = callbackUrl.toString();
    }

    // 点击模态框外部关闭
    document.getElementById('mockLoginModal').addEventListener('click', function(e) {
      if (e.target.id === 'mockLoginModal') {
        closeMockLogin();
      }
    });

    document.getElementById('adminLoginModal').addEventListener('click', function(e) {
      if (e.target.id === 'adminLoginModal') {
        closeAdminLogin();
      }
    });

    function showAdminLogin() {
      document.getElementById('adminLoginModal').classList.add('active');
    }

    function closeAdminLogin() {
      document.getElementById('adminLoginModal').classList.remove('active');
      document.getElementById('adminPassword').value = '';
      hideAdminError();
    }

    function showAdminError(message) {
      const errorEl = document.getElementById('adminError');
      const inputEl = document.getElementById('adminPassword');
      errorEl.textContent = message;
      errorEl.classList.add('show');
      inputEl.classList.add('error');
    }

    function hideAdminError() {
      const errorEl = document.getElementById('adminError');
      const inputEl = document.getElementById('adminPassword');
      errorEl.classList.remove('show');
      inputEl.classList.remove('error');
    }

    async function handleAdminLogin(event) {
      event.preventDefault();
      hideAdminError();
      
      const password = document.getElementById('adminPassword').value;
      
      if (!password) {
        showAdminError('请输入管理员密码');
        return;
      }
      
      try {
        const response = await fetch('/auth/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password }),
        });

        const data = await response.json();
        
        if (data.success) {
          // 保存 token
          localStorage.setItem('auth_token', data.data.token);
          // 跳转到首页
          window.location.href = '/';
        } else {
          showAdminError(data.error?.message || '密码错误，请重试');
        }
      } catch (error) {
        console.error('Admin login error:', error);
        showAdminError('登录失败，请重试');
      }
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

    // 页面加载时应用主题
    window.addEventListener('load', () => {
      loadAndApplyTheme();
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
