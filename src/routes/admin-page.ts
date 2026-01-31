/**
 * 管理员管理页面
 */

import type { Env } from '../types/env';
import { KVService } from '../services/kv';
import type { UserSession, DingTalkUser } from '../types/user';
import type { Work } from '../types/work';

export async function handleAdminPage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // 返回管理员页面（包含登录和管理界面，由前端JavaScript控制显示）
    // 前端会检查localStorage中的token并验证身份
    return new Response(getCombinedAdminPageHTML(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Admin page error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function getCombinedAdminPageHTML(): string {
  // 直接返回包含登录表单和管理界面的完整页面
  // 前端JavaScript会根据token状态控制显示
  return getAdminPageHTML();
}

function getLoginPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理员登录 - D5 Works</title>
  <link rel="icon" type="image/png" href="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

    .logo-img {
      height: 60px;
      width: auto;
      margin-bottom: 1rem;
    }

    .login-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .login-subtitle {
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
      text-align: left;
    }

    .form-label {
      display: block;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: #1f2937;
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
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-input.error {
      border-color: #ef4444;
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
    }

    .error-message.show {
      display: block;
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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.5);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render" class="logo-img">
    <h1 class="login-title">管理员登录</h1>
    <p class="login-subtitle">请输入管理员密码以访问管理页面</p>
    
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
      
      <button type="submit" class="btn" id="loginBtn">登录</button>
    </form>
  </div>

  <script>
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
      const loginBtn = document.getElementById('loginBtn');
      
      if (!password) {
        showAdminError('请输入管理员密码');
        return;
      }
      
      loginBtn.disabled = true;
      loginBtn.textContent = '登录中...';
      
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
          // 刷新页面以加载管理页面
          window.location.reload();
        } else {
          showAdminError(data.error?.message || '密码错误，请重试');
          loginBtn.disabled = false;
          loginBtn.textContent = '登录';
        }
      } catch (error) {
        console.error('Admin login error:', error);
        showAdminError('登录失败，请重试');
        loginBtn.disabled = false;
        loginBtn.textContent = '登录';
      }
    }

    // 检查是否已有 token
    const token = localStorage.getItem('auth_token');
    if (token) {
      // 尝试使用现有 token 访问管理页面
      fetch('/admin', {
        headers: {
          'Authorization': \`Bearer \${token}\`,
        },
      }).then(response => {
        if (response.ok) {
          window.location.reload();
        } else {
          localStorage.removeItem('auth_token');
        }
      });
    }
  </script>
</body>
</html>`;
}

function getAdminPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>作品管理 - D5 Works</title>
  <link rel="icon" type="image/png" href="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary-color: #667eea;
      --secondary-color: #764ba2;
      --bg-primary: #f9fafb;
      --bg-secondary: #ffffff;
      --text-primary: #1f2937;
      --text-secondary: #6b7280;
      --border-color: #e5e7eb;
      --danger-color: #ef4444;
      --success-color: #10b981;
      --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .navbar {
      background: var(--gradient);
      color: white;
      padding: 1rem 2rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-decoration: none;
      color: white;
    }

    .nav-brand img {
      height: 40px;
      width: auto;
    }

    .nav-title {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-outline {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .btn-outline:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .page-subtitle {
      color: var(--text-secondary);
      font-size: 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 800;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .config-card {
      background: var(--bg-secondary);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
    }

    .config-header-inline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .config-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
    }

    .config-subtitle {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin: 0;
      white-space: nowrap;
    }

    .config-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .config-form-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .config-label {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 0.9375rem;
      white-space: nowrap;
    }

    .config-select {
      min-width: 180px;
      padding: 0.75rem 1rem;
      border: 2px solid var(--border-color);
      border-radius: 0.5rem;
      font-size: 0.9375rem;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .config-select:hover {
      border-color: var(--primary-color);
    }

    .config-select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .config-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .config-link {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .link-icon {
      font-size: 0.875rem;
    }

    .config-message {
      margin-top: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      text-align: center;
      font-size: 0.875rem;
      display: none;
    }

    .works-table-container {
      background: var(--bg-secondary);
      border-radius: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      border: 1px solid var(--border-color);
      overflow: hidden;
    }

    .table-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .table-title {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th,
    .table td {
      padding: 1rem 1.5rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .table th {
      background: var(--bg-primary);
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .table tbody tr:hover {
      background: var(--bg-primary);
    }

    .table tbody tr:last-child td {
      border-bottom: none;
    }

    .work-video-preview {
      width: 120px;
      height: 68px;
      border-radius: 0.5rem;
      object-fit: cover;
      background: #000;
    }

    .work-title {
      font-weight: 600;
      color: var(--text-primary);
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .work-creator {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .work-votes {
      font-weight: 700;
      color: var(--primary-color);
    }

    .work-date {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .btn-danger {
      background: var(--danger-color);
      color: white;
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }

    .btn-danger:hover {
      background: #dc2626;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .spinner {
      border: 3px solid var(--border-color);
      border-top: 3px solid var(--primary-color);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary);
    }

    .empty-state-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    /* Toast 通知 */
    .toast {
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: var(--bg-secondary);
      border-radius: 0.5rem;
      padding: 1rem 1.5rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      display: none;
      align-items: center;
      gap: 0.75rem;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
    }

    .toast.show {
      display: flex;
    }

    .toast.success {
      border-left: 4px solid var(--success-color);
    }

    .toast.error {
      border-left: 4px solid var(--danger-color);
    }

    .toast-icon {
      font-size: 1.5rem;
    }

    .toast-message {
      flex: 1;
      font-weight: 500;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* 确认删除模态框 */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 3000;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .modal.active {
      display: flex;
    }

    .modal-content {
      background: var(--bg-secondary);
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
      background: none;
      border: none;
      font-size: 2rem;
      line-height: 1;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition: all 0.2s ease;
      z-index: 10;
    }

    .modal-close:hover {
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      padding-right: 2.5rem;
    }

    .modal-message {
      color: var(--text-secondary);
      margin-bottom: 1.5rem;
    }

    .modal-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .btn-secondary {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .btn-secondary:hover {
      background: #f3f4f6;
    }

    .btn-outline {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .btn-outline:hover {
      background: #f3f4f6;
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .voters-header {
      padding: 0.75rem 1rem;
      background: var(--bg-primary);
      border-bottom: 2px solid var(--border-color);
      font-size: 0.875rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .voter-item {
      padding: 1rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: background 0.2s ease;
    }

    .voter-item:last-child {
      border-bottom: none;
    }

    .voter-item:hover {
      background: var(--bg-primary);
    }

    .voter-index {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: var(--gradient);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .voter-info {
      flex: 1;
      min-width: 0;
    }

    .voter-name {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 1rem;
      margin-bottom: 0.25rem;
      word-break: break-word;
    }

    .voter-time {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .voters-empty {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="nav-container">
      <a href="/" class="nav-brand">
        <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
        <span class="nav-title">作品管理</span>
      </a>
      <div class="nav-actions">
        <a href="/" class="btn btn-outline">返回首页</a>
        <button class="btn btn-outline" onclick="handleLogout()">退出登录</button>
      </div>
    </div>
  </nav>

  <!-- 登录表单（默认显示） -->
  <div id="loginOverlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem;">
    <div class="login-container" style="background: white; border-radius: 1.5rem; padding: 3rem; max-width: 450px; width: 100%; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); text-align: center;">
      <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render" style="height: 60px; width: auto; margin-bottom: 1rem;">
      <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">管理员登录</h1>
      <p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 2rem;">请输入管理员密码以访问管理页面</p>
      
      <form id="adminLoginForm" onsubmit="handleAdminLogin(event)" style="text-align: left;">
        <div style="margin-bottom: 1.5rem;">
          <label style="display: block; font-weight: 500; margin-bottom: 0.5rem; color: #1f2937;">管理员密码</label>
          <input 
            type="password" 
            id="adminPassword" 
            placeholder="请输入管理员密码"
            required
            style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem; transition: all 0.3s ease; box-sizing: border-box;"
          >
          <div id="adminError" style="display: none; margin-top: 0.5rem; padding: 0.75rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; color: #dc2626; font-size: 0.875rem;"></div>
        </div>
        
        <button type="submit" class="btn" id="loginBtn" style="width: 100%; padding: 0.875rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; border: none; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">登录</button>
      </form>
    </div>
  </div>

  <div class="container" id="adminContent" style="display: none;">
    <div class="page-header">
      <h1 class="page-title">作品管理</h1>
      <p class="page-subtitle">管理所有上传的作品，可以查看和删除作品</p>
    </div>

    <div class="stats-grid" id="statsGrid">
      <div class="stat-card">
        <div class="stat-label">总作品数</div>
        <div class="stat-value" id="totalWorks">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总投票数</div>
        <div class="stat-value" id="totalVotes">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">参与用户</div>
        <div class="stat-value" id="totalUsers">-</div>
      </div>
    </div>

    <!-- 大屏配置卡片 -->
    <div class="config-card">
      <div class="config-content">
        <div class="config-header-inline">
          <h2 class="config-title">大屏播放配置</h2>
          <p class="config-subtitle">配置多屏播放的分屏模式</p>
        </div>
        <div class="config-form-group">
          <label class="config-label">分屏模式</label>
          <select id="gridLayoutSelect" class="config-select">
            <option value="2x2">2x2 (4屏)</option>
            <option value="2x3">2x3 (6屏)</option>
            <option value="3x2">3x2 (6屏)</option>
            <option value="3x3">3x3 (9屏)</option>
            <option value="4x4">4x4 (16屏)</option>
          </select>
        </div>
        <div class="config-actions">
          <button class="btn" onclick="saveScreenConfig()">保存配置</button>
          <a href="/multi-screen" target="_blank" class="btn btn-outline config-link">
            <span>打开多屏播放</span>
            <span class="link-icon">↗</span>
          </a>
        </div>
      </div>
      <div id="configMessage" class="config-message"></div>
    </div>

    <div class="works-table-container">
      <div class="table-header">
        <h2 class="table-title">作品列表</h2>
      </div>
      <div id="worksTable">
        <div class="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast 通知 -->
  <div class="toast" id="toast">
    <span class="toast-icon" id="toastIcon">✓</span>
    <span class="toast-message" id="toastMessage"></span>
  </div>

  <!-- 确认删除模态框 -->
  <div class="modal" id="deleteModal">
    <div class="modal-content">
      <h3 class="modal-title">确认删除</h3>
      <p class="modal-message" id="deleteMessage">确定要删除这个作品吗？此操作不可恢复。</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeDeleteModal()">取消</button>
        <button class="btn btn-danger" id="confirmDeleteBtn" onclick="confirmDelete()">删除</button>
      </div>
    </div>
  </div>

  <!-- 投票用户列表模态框 -->
  <div class="modal" id="votersModal">
    <div class="modal-content" style="max-width: 600px; position: relative;">
      <button class="modal-close" onclick="closeVotersModal()" type="button" aria-label="关闭">×</button>
      <h3 class="modal-title" id="votersModalTitle">投票用户</h3>
      <div id="votersList" style="max-height: 400px; overflow-y: auto;">
        <div class="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentDeleteWorkId = null;
    let allWorks = [];

    // 获取认证 token
    function getAuthToken() {
      return localStorage.getItem('auth_token');
    }

    // 显示 Toast 通知
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      const toastIcon = document.getElementById('toastIcon');
      const toastMessage = document.getElementById('toastMessage');
      
      toast.className = \`toast \${type}\`;
      toastMessage.textContent = message;
      toastIcon.textContent = type === 'success' ? '✓' : '✕';
      
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    // 加载作品列表
    async function loadWorks() {
      try {
        const token = getAuthToken();
        if (!token) {
          window.location.reload();
          return;
        }

        const response = await fetch('/api/works?limit=1000', {
          headers: {
            'Authorization': \`Bearer \${token}\`,
          },
        });

        const data = await response.json();

        if (data.success && data.data.items) {
          allWorks = data.data.items;
          displayWorks(allWorks);
          updateStats(allWorks);
        } else {
          document.getElementById('worksTable').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>暂无作品</p></div>';
        }
      } catch (error) {
        console.error('Load works error:', error);
        document.getElementById('worksTable').innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>加载失败，请刷新重试</p></div>';
      }
    }

    // 获取投票数
    async function getVoteCount(workId) {
      try {
        const token = getAuthToken();
        const response = await fetch(\`/api/vote/stats?workId=\${workId}\`, {
          headers: {
            'Authorization': \`Bearer \${token}\`,
          },
        });

        if (!response.ok) {
          console.error(\`Failed to get vote count for work \${workId}: HTTP \${response.status}\`);
          return 0;
        }

        const data = await response.json();
        if (!data.success) {
          console.error('Failed to get vote count for work ' + workId + ':', data.error);
          return 0;
        }

        const count = data.data?.count || 0;
        return count;
      } catch (error) {
        console.error('Error getting vote count for work ' + workId + ':', error);
        return 0;
      }
    }

    // 显示作品列表
    async function displayWorks(works) {
      const tableContainer = document.getElementById('worksTable');
      
      if (works.length === 0) {
        tableContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>暂无作品</p></div>';
        return;
      }

      // 获取所有作品的投票数
      const worksWithVotes = await Promise.all(
        works.map(async (work) => {
          const voteCount = await getVoteCount(work.id);
          return { ...work, voteCount };
        })
      );

      // 按创建时间倒序排序
      worksWithVotes.sort((a, b) => b.createdAt - a.createdAt);

      const tableHTML = \`
        <table class="table">
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
            \${worksWithVotes.map(work => \`
              <tr>
                <td>
                  <video class="work-video-preview" src="\${work.fileUrl}" muted></video>
                </td>
                <td>
                  <div class="work-title" title="\${work.title}">\${work.title || '未命名作品'}</div>
                </td>
                <td>
                  <div class="work-creator">\${work.creatorName || '未知'}</div>
                </td>
                <td>
                  <div class="work-votes">\${work.voteCount || 0} 票</div>
                </td>
                <td>
                  <div class="work-date">\${formatDate(work.createdAt)}</div>
                </td>
                <td>
                  <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline" onclick="showVotersModal('\${work.id}', '\${work.title}')" style="background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.375rem 0.75rem; font-size: 0.875rem;">查看投票</button>
                    <button class="btn btn-danger" onclick="showDeleteModal('\${work.id}', '\${work.title}')">删除</button>
                  </div>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;

      tableContainer.innerHTML = tableHTML;
    }

    // 更新统计信息
    async function updateStats(works) {
      document.getElementById('totalWorks').textContent = works.length;

      // 计算总投票数
      let totalVotes = 0;
      for (const work of works) {
        const voteCount = await getVoteCount(work.id);
        totalVotes += voteCount;
      }
      document.getElementById('totalVotes').textContent = totalVotes;

      // 计算参与用户数（去重）
      const userIds = new Set(works.map(work => work.userId));
      document.getElementById('totalUsers').textContent = userIds.size;
    }

    // 格式化日期
    function formatDate(timestamp) {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // 显示删除确认模态框
    function showDeleteModal(workId, workTitle) {
      currentDeleteWorkId = workId;
      document.getElementById('deleteMessage').textContent = \`确定要删除作品"\${workTitle}"吗？此操作不可恢复。\`;
      document.getElementById('deleteModal').classList.add('active');
    }

    // 关闭删除确认模态框
    function closeDeleteModal() {
      currentDeleteWorkId = null;
      document.getElementById('deleteModal').classList.remove('active');
    }

    // 确认删除
    async function confirmDelete() {
      if (!currentDeleteWorkId) return;

      const token = getAuthToken();
      if (!token) {
        showToast('未登录，请重新登录', 'error');
        window.location.reload();
        return;
      }

      const confirmBtn = document.getElementById('confirmDeleteBtn');
      confirmBtn.disabled = true;
      confirmBtn.textContent = '删除中...';

      try {
        const response = await fetch(\`/api/works/\${currentDeleteWorkId}\`, {
          method: 'DELETE',
          headers: {
            'Authorization': \`Bearer \${token}\`,
          },
        });

        const data = await response.json();

        if (data.success) {
          showToast('作品删除成功', 'success');
          closeDeleteModal();
          // 重新加载作品列表
          loadWorks();
        } else {
          showToast(data.error?.message || '删除失败', 'error');
          confirmBtn.disabled = false;
          confirmBtn.textContent = '删除';
        }
      } catch (error) {
        console.error('Delete work error:', error);
        showToast('删除失败，请重试', 'error');
        confirmBtn.disabled = false;
        confirmBtn.textContent = '删除';
      }
    }

    // 显示投票用户列表
    async function showVotersModal(workId, workTitle) {
      // 简化标题显示，如果标题太长则截断
      const displayTitle = workTitle.length > 30 ? workTitle.substring(0, 30) + '...' : workTitle;
      document.getElementById('votersModalTitle').textContent = \`投票用户 (\${displayTitle})\`;
      document.getElementById('votersModal').classList.add('active');
      
      const votersList = document.getElementById('votersList');
      votersList.innerHTML = '<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';

      try {
        const token = getAuthToken();
        const response = await fetch(\`/api/vote/users?workId=\${workId}\`, {
          headers: {
            'Authorization': \`Bearer \${token}\`,
          },
        });

        const data = await response.json();

        if (data.success && data.data.voters) {
          const voters = data.data.voters;
          
          if (voters.length === 0) {
            votersList.innerHTML = '<div class="voters-empty"><div style="font-size: 3rem; margin-bottom: 1rem;">📭</div><p>暂无投票用户</p></div>';
          } else {
            votersList.innerHTML = \`
              <div class="voters-header">
                <span>共 \${voters.length} 人投票</span>
              </div>
              \${voters.map((voter, index) => \`
                <div class="voter-item">
                  <div class="voter-index">\${index + 1}</div>
                  <div class="voter-info">
                    <div class="voter-name">\${voter.userName || '未知用户'}</div>
                    <div class="voter-time">\${formatDate(voter.createdAt)}</div>
                  </div>
                </div>
              \`).join('')}
            \`;
          }
        } else {
          votersList.innerHTML = '<div class="voters-empty"><p>加载失败，请重试</p></div>';
        }
      } catch (error) {
        console.error('Load voters error:', error);
        votersList.innerHTML = '<div class="voters-empty"><p>加载失败，请重试</p></div>';
      }
    }

    // 关闭投票用户列表模态框
    function closeVotersModal() {
      document.getElementById('votersModal').classList.remove('active');
    }

    // 退出登录
    async function handleLogout() {
      const token = getAuthToken();
      if (token) {
        try {
          await fetch('/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${token}\`,
            },
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    }

    // 点击模态框外部关闭
    document.getElementById('deleteModal').addEventListener('click', function(e) {
      if (e.target.id === 'deleteModal') {
        closeDeleteModal();
      }
    });

    document.getElementById('votersModal').addEventListener('click', function(e) {
      if (e.target.id === 'votersModal') {
        closeVotersModal();
      }
    });

    // 显示/隐藏错误信息
    function showAdminError(message) {
      const errorEl = document.getElementById('adminError');
      const inputEl = document.getElementById('adminPassword');
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      inputEl.style.borderColor = '#ef4444';
    }

    function hideAdminError() {
      const errorEl = document.getElementById('adminError');
      const inputEl = document.getElementById('adminPassword');
      errorEl.style.display = 'none';
      inputEl.style.borderColor = '#e5e7eb';
    }

    // 管理员登录处理
    async function handleAdminLogin(event) {
      event.preventDefault();
      hideAdminError();
      
      const password = document.getElementById('adminPassword').value;
      const loginBtn = document.getElementById('loginBtn');
      
      if (!password) {
        showAdminError('请输入管理员密码');
        return;
      }
      
      loginBtn.disabled = true;
      loginBtn.textContent = '登录中...';
      
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
          // 隐藏登录表单，显示管理界面
          document.getElementById('loginOverlay').style.display = 'none';
          document.getElementById('adminContent').style.display = 'block';
          // 加载作品列表
          loadWorks();
        } else {
          // 显示详细的错误信息（包含调试信息）
          let errorMessage = data.error?.message || '密码错误，请重试';
          if (data.error?.details?.debug) {
            const debug = data.error.details.debug;
            errorMessage += '\\n\\n调试信息：';
            errorMessage += '\\n环境变量已配置: ' + (debug.hasAdminPassword ? '是' : '否');
            errorMessage += '\\n环境变量密码长度: ' + (debug.adminPasswordLength || 0);
            errorMessage += '\\n输入密码长度: ' + (debug.inputPasswordLength || 0);
            if (!debug.hasAdminPassword) {
              errorMessage += '\\n\\n⚠️ 环境变量 ADMIN_PASSWORD 未配置！';
              errorMessage += '\\n请在 Cloudflare Dashboard 中配置，或使用命令：';
              errorMessage += '\\nnpx wrangler secret put ADMIN_PASSWORD';
            }
          }
          showAdminError(errorMessage);
          loginBtn.disabled = false;
          loginBtn.textContent = '登录';
        }
      } catch (error) {
        console.error('Admin login error:', error);
        showAdminError('登录失败，请重试');
        loginBtn.disabled = false;
        loginBtn.textContent = '登录';
      }
    }

    // 加载屏幕配置
    async function loadScreenConfig() {
      try {
        const response = await fetch('/api/screen-config');
        const data = await response.json();
        
        if (data.success && data.data) {
          const select = document.getElementById('gridLayoutSelect');
          if (select) {
            select.value = data.data.gridLayout || '2x2';
          }
        }
      } catch (error) {
        console.error('Load screen config error:', error);
      }
    }

    // 保存屏幕配置
    async function saveScreenConfig() {
      try {
        const token = getAuthToken();
        if (!token) {
          showToast('未登录，请重新登录', 'error');
          window.location.reload();
          return;
        }

        const select = document.getElementById('gridLayoutSelect');
        const gridLayout = select.value;

        const response = await fetch('/api/screen-config', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gridLayout }),
        });

        const data = await response.json();
        
        if (data.success) {
          showToast('配置保存成功', 'success');
          const messageEl = document.getElementById('configMessage');
          if (messageEl) {
            messageEl.textContent = '✓ 配置已保存';
            messageEl.className = 'config-message';
            messageEl.style.display = 'block';
            messageEl.style.background = '#d1fae5';
            messageEl.style.color = '#065f46';
            messageEl.style.border = '1px solid #6ee7b7';
            setTimeout(() => {
              messageEl.style.display = 'none';
            }, 3000);
          }
        } else {
          showToast(data.error?.message || '保存失败', 'error');
        }
      } catch (error) {
        console.error('Save screen config error:', error);
        showToast('保存失败，请重试', 'error');
      }
    }

    // 页面加载时检查身份（优化：先检查 token 是否存在，避免不必要的请求）
    window.addEventListener('load', async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // 没有token，直接显示登录表单，不发送请求
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('adminContent').style.display = 'none';
        return;
      }
      
      // 有 token，验证是否是管理员
      // 先隐藏登录表单，避免闪烁
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('adminContent').style.display = 'block';
      
      try {
        const response = await fetch('/auth/me', {
          headers: {
            'Authorization': \`Bearer \${token}\`,
          },
        });
        
        const data = await response.json();
        
        if (data.success && data.data.role === 'admin') {
          // 是管理员，保持显示管理界面
          document.getElementById('loginOverlay').style.display = 'none';
          document.getElementById('adminContent').style.display = 'block';
          // 加载作品列表
          loadWorks();
          // 加载屏幕配置
          loadScreenConfig();
        } else {
          // 不是管理员，显示登录表单
          document.getElementById('loginOverlay').style.display = 'flex';
          document.getElementById('adminContent').style.display = 'none';
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('adminContent').style.display = 'none';
      }
    });
  </script>
</body>
</html>`;
}
