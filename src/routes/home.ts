/**
 * 首页路由处理 - 投票浏览页面（瀑布流布局）
 * 融入 D5 Render 品牌理念：心流、创作自由、消除阻滞感
 */

import type { Env } from '../types/env';

export async function handleHomeRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2026年会作品投票 - D5 Works</title>
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
      --warning-color: #f59e0b;
      --info-color: #3b82f6;
      
      /* 渐变 - 使用主题色 */
      --gradient: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%);
      --gradient-light: linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%);
      
      /* 阴影 */
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-glow: 0 0 20px rgba(37, 99, 235, 0.3);
    }

    html {
      width: 100%;
      overflow-x: hidden;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      color: var(--text-primary);
      background: var(--bg-secondary);
      line-height: 1.6;
      overflow-x: hidden;
      width: 100%;
      margin: 0;
      padding: 0;
    }

    /* 背景动画效果 - 体现"心流"概念 */
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--gradient-light);
      opacity: 0.5;
      z-index: -1;
      animation: flow 20s ease-in-out infinite;
    }

    @keyframes flow {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
      50% { transform: translateY(-20px) scale(1.05); opacity: 0.5; }
    }

    /* 导航栏 */
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-color);
      z-index: 1000;
      padding: 1rem 2rem;
      box-shadow: var(--shadow);
      transition: all 0.3s ease;
    }

    .nav-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }

    @media (min-width: 1600px) {
      .nav-container {
        max-width: 1600px;
      }
    }

    @media (max-width: 992px) {
      .navbar {
        padding: 0.75rem 1rem;
      }
      .nav-container {
        flex-wrap: nowrap;
        gap: 1rem;
      }
      .nav-actions {
        display: none !important;
      }
      .menu-toggle {
        display: flex !important;
      }
    }

    @media (max-width: 480px) {
      .navbar {
        padding: 0.75rem 0.5rem;
      }
      .btn {
        padding: 0.625rem 1rem;
        font-size: 0.8125rem;
      }
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

    .nav-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    /* 菜单按钮（小屏幕显示） */
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      font-size: 1.5rem;
      color: var(--text-primary);
      transition: all 0.3s ease;
      width: 2.5rem;
      height: 2.5rem;
      align-items: center;
      justify-content: center;
      border-radius: 0.5rem;
      flex-shrink: 0;
    }

    .menu-toggle:hover {
      background: var(--bg-secondary);
      transform: scale(1.05);
    }

    .menu-toggle.active {
      background: var(--bg-secondary);
    }

    /* 侧边菜单遮罩 */
    .menu-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1999;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .menu-overlay.active {
      display: block;
      opacity: 1;
    }

    /* 侧边菜单 */
    .side-menu {
      position: fixed;
      top: 0;
      right: -100%;
      width: 300px;
      max-width: 85vw;
      height: 100vh;
      background: var(--bg-primary);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
      z-index: 2000;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
    }

    .side-menu.active {
      right: 0;
    }

    .side-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .side-menu-title {
      font-size: 1.25rem;
      font-weight: 700;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .side-menu-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.25rem;
      transition: all 0.2s ease;
    }

    .side-menu-close:hover {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .side-menu-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
      overflow-y: auto;
    }

    .side-menu-actions .btn {
      width: 100%;
      justify-content: center;
      text-align: center;
    }

    .side-menu-actions .user-menu {
      width: 100%;
    }

    .side-menu-actions .user-menu button {
      width: 100%;
    }

    .side-menu-actions .user-dropdown {
      position: static;
      width: 100%;
      box-shadow: none;
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      margin-top: 0.5rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      text-decoration: none;
      display: inline-block;
      font-size: 0.875rem;
      position: relative;
      overflow: hidden;
    }

    .btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .btn:hover::before {
      width: 300px;
      height: 300px;
    }

    .btn-primary {
      background: var(--gradient);
      color: white;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.5);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-outline {
      background: transparent;
      color: var(--text-primary);
      border: 1.5px solid var(--border-color);
    }

    .btn-outline:hover {
      background: var(--bg-secondary);
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .user-menu {
      position: relative;
    }

    .user-dropdown {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      background: var(--bg-primary);
      border-radius: 0.5rem;
      box-shadow: var(--shadow-lg);
      min-width: 150px;
      z-index: 1000;
      overflow: hidden;
    }

    .dropdown-item {
      width: 100%;
      padding: 0.75rem 1rem;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-primary);
      transition: background 0.2s ease;
    }

    .dropdown-item:hover {
      background: var(--bg-secondary);
    }

    /* 主要内容区域 */
    .main-content {
      margin-top: 80px;
      padding: 3rem 2rem;
      max-width: 1400px;
      margin-left: auto;
      margin-right: auto;
      width: 100%;
      box-sizing: border-box;
    }

    .page-header {
      text-align: center;
      margin-bottom: 4rem;
      padding: 3rem 0;
      position: relative;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 768px) {
      .page-header {
        margin-bottom: 2.5rem;
        padding: 2rem 0;
      }
    }

    @media (max-width: 576px) {
      .page-header {
        margin-bottom: 2rem;
        padding: 1.5rem 0;
      }
    }

    .page-header::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 200px;
      height: 200px;
      background: var(--gradient);
      border-radius: 50%;
      opacity: 0.1;
      filter: blur(60px);
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.2); }
    }

    @keyframes floatIcon {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .page-title {
      font-size: 3.5rem;
      font-weight: 900;
      margin-bottom: 1rem;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -1px;
      position: relative;
      z-index: 1;
      animation: fadeInUp 0.8s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .page-subtitle {
      font-size: 1.5rem;
      color: var(--text-secondary);
      font-weight: 400;
      position: relative;
      z-index: 1;
      animation: fadeInUp 0.8s ease-out 0.2s both;
    }

    .page-tagline {
      font-size: 1rem;
      color: var(--text-secondary);
      margin-top: 1rem;
      font-style: italic;
      position: relative;
      z-index: 1;
      animation: fadeInUp 0.8s ease-out 0.4s both;
    }

    /* 瀑布流布局 - 横排顺序 */
    .masonry-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      padding: 0;
      animation: fadeIn 1s ease-out;
      width: 100%;
      margin: 0 auto;
      box-sizing: border-box;
      grid-auto-flow: row;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .masonry-item {
      width: 100%;
      animation: slideIn 0.6s ease-out;
      animation-fill-mode: both;
    }

    .masonry-item:nth-child(1) { animation-delay: 0.1s; }
    .masonry-item:nth-child(2) { animation-delay: 0.2s; }
    .masonry-item:nth-child(3) { animation-delay: 0.3s; }
    .masonry-item:nth-child(4) { animation-delay: 0.4s; }
    .masonry-item:nth-child(n+5) { animation-delay: 0.5s; }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* 响应式列数 */
    @media (min-width: 1600px) {
      .main-content {
        max-width: 1600px;
        padding: 3rem 3rem;
      }
      .masonry-grid {
        gap: 2.5rem;
      }
    }

    @media (max-width: 1400px) {
      .main-content {
        padding: 3rem 2rem;
      }
      .masonry-grid {
        gap: 1.75rem;
      }
    }

    @media (max-width: 1200px) {
      .main-content {
        padding: 2.5rem 1.5rem;
      }
      .masonry-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
      }
    }

    @media (max-width: 992px) {
      .main-content {
        padding: 2rem 1.5rem;
      }
      .masonry-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 1.25rem;
      }
    }

    @media (max-width: 768px) {
      .main-content {
        padding: 2rem 1rem;
      }
      .masonry-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }
      .page-title {
        font-size: 2.5rem;
      }
      .page-subtitle {
        font-size: 1.25rem;
      }
      .work-content {
        padding: 1.25rem;
      }
      .work-title {
        font-size: 1.125rem;
      }
    }

    @media (max-width: 576px) {
      .main-content {
        padding: 1.5rem 0.75rem;
      }
      .masonry-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
        padding: 0 0.5rem;
      }
      .page-header {
        padding: 2rem 0;
        margin-bottom: 2rem;
      }
      .page-title {
        font-size: 2rem;
      }
      .page-subtitle {
        font-size: 1.125rem;
      }
    }

    @media (max-width: 480px) {
      .main-content {
        padding: 1.5rem 0.5rem;
      }
      .masonry-grid {
        padding: 0 0.25rem;
      }
    }

    /* 作品卡片 - 体现"即时反馈"理念 */
    .work-card {
      background: var(--bg-primary);
      border-radius: 1.5rem;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
      border: 1px solid rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
    }

    .work-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--gradient);
      opacity: 0;
      transition: opacity 0.4s ease;
      z-index: 0;
      pointer-events: none;
    }

    .work-card:hover {
      transform: translateY(-12px);
      box-shadow: 0 20px 40px rgba(37, 99, 235, 0.15), 
                  0 8px 16px rgba(0, 0, 0, 0.1),
                  0 0 0 1px rgba(37, 99, 235, 0.1);
    }

    .work-card:hover::before {
      opacity: 0.03;
    }

    .work-video-container {
      position: relative;
      width: 100%;
      padding-top: 56.25%; /* 16:9 比例 */
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      overflow: hidden;
      border-radius: 1.5rem 1.5rem 0 0;
    }

    .work-video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      background: #000;
    }

    .work-card:hover .work-video {
      transform: scale(1.08);
    }

    .work-video-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        to bottom, 
        rgba(0, 0, 0, 0) 0%, 
        rgba(0, 0, 0, 0.3) 50%,
        rgba(0, 0, 0, 0.6) 100%
      );
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.4s ease;
      z-index: 1;
    }

    .work-card:hover .work-video-overlay {
      opacity: 1;
    }

    .play-icon {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.98);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: var(--primary-color);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4),
                  0 0 0 4px rgba(255, 255, 255, 0.2);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      line-height: 1;
      text-align: center;
      padding-left: 0.15em;
    }

    .work-card:hover .play-icon {
      transform: scale(1.15);
      box-shadow: 0 12px 32px rgba(37, 99, 235, 0.5),
                  0 0 0 6px rgba(255, 255, 255, 0.3);
    }

    .work-content {
      padding: 1.75rem;
      position: relative;
      z-index: 1;
      background: var(--bg-primary);
    }

    .work-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.6;
      min-height: 3.2em;
    }

    .work-creator {
      font-size: 0.9375rem;
      color: var(--text-secondary);
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-weight: 500;
    }

    .work-creator::before {
      content: '👤';
      font-size: 1.125rem;
      opacity: 0.8;
    }

    .work-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .work-votes {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-size: 1rem;
      color: var(--text-primary);
      font-weight: 700;
      padding: 0.5rem 1rem;
      background: var(--bg-secondary);
      border-radius: 2rem;
    }

    .work-votes::before {
      content: '❤️';
      font-size: 1.25rem;
      animation: heartbeat 2s ease-in-out infinite;
      filter: drop-shadow(0 2px 4px rgba(239, 68, 68, 0.3));
    }

    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .vote-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 2rem;
      font-size: 0.9375rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: var(--gradient);
      color: white;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }

    .vote-btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .vote-btn:hover:not(:disabled)::before {
      width: 300px;
      height: 300px;
    }

    .vote-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
    }

    .vote-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .vote-btn:disabled,
    .vote-btn.voted {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: not-allowed;
      box-shadow: none;
      opacity: 0.7;
    }

    .vote-btn.own-work {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: not-allowed;
      box-shadow: none;
      opacity: 0.7;
    }

    /* 加载状态 */
    .loading {
      text-align: center;
      padding: 4rem 2rem;
      display: none;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .loading.active {
      display: block;
    }

    .spinner {
      border: 3px solid var(--border-color);
      border-top: 3px solid var(--primary-color);
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 6rem 2rem;
      color: var(--text-secondary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      margin: 0 auto;
    }

    @media (max-width: 768px) {
      .empty-state {
        padding: 4rem 1.5rem;
      }
    }

    @media (max-width: 576px) {
      .empty-state {
        padding: 3rem 1rem;
      }
    }

    .empty-state-icon {
      font-size: 5rem;
      margin: 0 auto 1.5rem;
      animation: floatIcon 3s ease-in-out infinite;
      display: block;
      text-align: center;
      line-height: 1;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      margin: 0 auto 0.5rem;
      color: var(--text-primary);
      text-align: center;
      width: 100%;
    }

    .empty-state p {
      text-align: center;
      color: var(--text-secondary);
      margin: 0 auto;
      width: 100%;
    }

    /* 视频播放模态框 */
    .video-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 2000;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      backdrop-filter: blur(10px);
      animation: fadeIn 0.3s ease;
    }

    .video-modal.active {
      display: flex;
    }

    .video-modal-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      width: 100%;
      animation: scaleIn 0.3s ease;
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .video-modal video {
      width: 100%;
      height: auto;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .video-modal-close {
      position: absolute;
      top: -3rem;
      right: 0;
      background: rgba(255, 255, 255, 0.9);
      border: none;
      width: 45px;
      height: 45px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-primary);
      transition: all 0.3s ease;
    }

    .video-modal-close:hover {
      background: white;
      transform: scale(1.1);
    }

    /* 浮动上传按钮 - 体现"创作自由" */
    .fab {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--gradient);
      color: white;
      border: none;
      font-size: 1.75rem;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s ease-in-out infinite;
    }

    .fab:hover {
      transform: scale(1.15) rotate(90deg);
      box-shadow: 0 12px 32px rgba(37, 99, 235, 0.6);
    }

    @media (max-width: 768px) {
      .page-title {
        font-size: 2.5rem;
      }

      .page-subtitle {
        font-size: 1.25rem;
      }

      .fab {
        bottom: 1.5rem;
        right: 1.5rem;
        width: 56px;
        height: 56px;
        font-size: 1.5rem;
      }
    }

    @media (max-width: 576px) {
      .fab {
        bottom: 1rem;
        right: 1rem;
        width: 52px;
        height: 52px;
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <!-- 导航栏 -->
  <nav class="navbar">
    <div class="nav-container">
      <a href="/" class="logo">
        <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render" class="logo-img">
      </a>
      <div class="nav-actions">
        <div class="user-menu" id="userMenu" style="display: none;">
          <button class="btn btn-outline" id="userNameBtn" onclick="toggleUserMenu()"></button>
          <div class="user-dropdown" id="userDropdown" style="display: none;">
            <button class="dropdown-item" onclick="logout()">退出登录</button>
          </div>
        </div>
        <button class="btn btn-outline" id="authBtn" onclick="window.location.href='/login'">登录</button>
        <a href="/upload" class="btn btn-primary">上传作品</a>
        <a href="/vote-result" class="btn btn-outline">投票结果</a>
        <a href="/screen" class="btn btn-outline">大屏展示</a>
        <a href="/multi-screen" class="btn btn-outline">多屏播放</a>
        <a href="/admin" class="btn btn-outline" id="adminLink" style="display: none;" onclick="handleAdminClick(event)">管理</a>
      </div>
      <button class="menu-toggle" id="menuToggle" onclick="toggleSideMenu()" aria-label="打开菜单">☰</button>
    </div>
  </nav>

  <!-- 侧边菜单遮罩 -->
  <div class="menu-overlay" id="menuOverlay" onclick="closeSideMenu()"></div>

  <!-- 侧边菜单 -->
  <div class="side-menu" id="sideMenu">
    <div class="side-menu-header">
      <h2 class="side-menu-title">菜单</h2>
      <button class="side-menu-close" onclick="closeSideMenu()" aria-label="关闭菜单">×</button>
    </div>
    <div class="side-menu-actions">
      <div class="user-menu" id="sideUserMenu" style="display: none;">
        <button class="btn btn-outline" id="sideUserNameBtn" onclick="toggleSideUserMenu()"></button>
        <div class="user-dropdown" id="sideUserDropdown" style="display: none;">
          <button class="dropdown-item" onclick="logout()">退出登录</button>
        </div>
      </div>
      <button class="btn btn-outline" id="sideAuthBtn" onclick="window.location.href='/login'; closeSideMenu();">登录</button>
      <a href="/upload" class="btn btn-primary" onclick="closeSideMenu()">上传作品</a>
      <a href="/vote-result" class="btn btn-outline" onclick="closeSideMenu()">投票结果</a>
      <a href="/screen" class="btn btn-outline" onclick="closeSideMenu()">大屏展示</a>
      <a href="/multi-screen" class="btn btn-outline" onclick="closeSideMenu()">多屏播放</a>
      <a href="/admin" class="btn btn-outline" id="sideAdminLink" style="display: none;" onclick="handleAdminClick(event); closeSideMenu();">管理</a>
    </div>
  </div>

  <!-- 主要内容 -->
  <div class="main-content">
    <div class="page-header">
      <h1 class="page-title">2026年会作品投票</h1>
      <p class="page-subtitle">释放你的想象力，分享你的创作</p>
      <p class="page-tagline">进入心流之境，体验创作自由</p>
    </div>

    <!-- 加载状态 -->
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <p style="margin-top: 1rem; color: var(--text-secondary);">加载中...</p>
    </div>

    <!-- 作品瀑布流 -->
    <div class="masonry-grid" id="worksGrid">
      <!-- 作品卡片将通过 JavaScript 动态加载 -->
    </div>

    <!-- 空状态 -->
    <div class="empty-state" id="emptyState" style="display: none;">
      <div class="empty-state-icon">🎬</div>
      <h3>暂无作品</h3>
      <p>成为第一个释放想象力的人吧！</p>
    </div>
  </div>

  <!-- 视频播放模态框 -->
  <div class="video-modal" id="videoModal">
    <div class="video-modal-content">
      <button class="video-modal-close" onclick="closeVideoModal()">×</button>
      <video id="modalVideo" controls autoplay></video>
    </div>
  </div>

  <!-- 浮动上传按钮 -->
  <button class="fab" onclick="window.location.href='/upload'" title="上传作品">+</button>

  <script>
    let currentUser = null;
    let userVoteCount = 0;
    const MAX_VOTES = 10;

    // 处理管理按钮点击（优化：已登录时直接跳转，避免先显示登录页面）
    async function handleAdminClick(event) {
      event.preventDefault();
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // 没有 token，跳转到登录页面
        window.location.href = '/login';
        return;
      }
      
      // 有 token，先验证是否是管理员（使用缓存的用户信息，避免重复请求）
      if (currentUser && currentUser.role === 'admin') {
        // 已经是管理员，直接跳转
        window.location.href = '/admin';
        return;
      }
      
      // 没有缓存或缓存不完整，验证 token
      try {
        const response = await fetch('/auth/me', {
          headers: {
            'Authorization': \`Bearer \${token}\`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.role === 'admin') {
            // 是管理员，直接跳转到管理页面
            window.location.href = '/admin';
          } else {
            // 不是管理员，跳转到登录页面
            window.location.href = '/login';
          }
        } else {
          // token 无效，跳转到登录页面
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('验证管理员身份失败:', error);
        window.location.href = '/login';
      }
    }

    // 检查认证状态（不自动跳转，只更新UI）
    async function checkAuth() {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        // 没有token，显示登录按钮，隐藏用户菜单
        document.getElementById('authBtn').style.display = 'inline-flex';
        document.getElementById('userMenu').style.display = 'none';
        document.getElementById('sideAuthBtn').style.display = 'inline-flex';
        document.getElementById('sideUserMenu').style.display = 'none';
        document.getElementById('adminLink').style.display = 'none';
        document.getElementById('sideAdminLink').style.display = 'none';
        // 仍然加载作品列表（允许未登录用户浏览）
        loadWorks();
        return;
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
            currentUser = data.data;
            // 显示用户菜单，隐藏登录按钮
            document.getElementById('authBtn').style.display = 'none';
            document.getElementById('userMenu').style.display = 'block';
            document.getElementById('userNameBtn').textContent = currentUser.name || '已登录';
            
            // 同步侧边菜单
            document.getElementById('sideAuthBtn').style.display = 'none';
            document.getElementById('sideUserMenu').style.display = 'block';
            document.getElementById('sideUserNameBtn').textContent = currentUser.name || '已登录';
            
            // 如果是管理员，显示管理入口
            if (currentUser.role === 'admin') {
              const adminLink = document.getElementById('adminLink');
              if (adminLink) {
                adminLink.style.display = 'inline-flex';
              }
              const sideAdminLink = document.getElementById('sideAdminLink');
              if (sideAdminLink) {
                sideAdminLink.style.display = 'inline-flex';
              }
            }
            
            loadWorks();
          } else {
            // token无效，清除并显示登录按钮
            localStorage.removeItem('auth_token');
            document.getElementById('authBtn').style.display = 'inline-flex';
            document.getElementById('userMenu').style.display = 'none';
            document.getElementById('sideAuthBtn').style.display = 'inline-flex';
            document.getElementById('sideUserMenu').style.display = 'none';
            loadWorks();
          }
        } else {
          // token无效，清除并显示登录按钮
          localStorage.removeItem('auth_token');
          document.getElementById('authBtn').style.display = 'inline-flex';
          document.getElementById('userMenu').style.display = 'none';
          document.getElementById('sideAuthBtn').style.display = 'inline-flex';
          document.getElementById('sideUserMenu').style.display = 'none';
          loadWorks();
        }
      } catch (error) {
        console.error('认证检查失败:', error);
        // 出错时也清除token并显示登录按钮
        localStorage.removeItem('auth_token');
        document.getElementById('authBtn').style.display = 'inline-flex';
        document.getElementById('userMenu').style.display = 'none';
        document.getElementById('sideAuthBtn').style.display = 'inline-flex';
        document.getElementById('sideUserMenu').style.display = 'none';
        loadWorks();
      }
    }

    // 加载作品列表（允许未登录用户浏览）
    async function loadWorks() {
      const token = localStorage.getItem('auth_token');

      document.getElementById('loading').classList.add('active');
      document.getElementById('emptyState').style.display = 'none';

      try {
        // 获取作品列表（不需要认证）
        const headers = token ? {
          'Authorization': \`Bearer \${token}\`
        } : {};
        
        const worksResponse = await fetch('/api/works?page=1&limit=100', {
          headers: headers
        });

        if (worksResponse.ok) {
          const worksData = await worksResponse.json();
          if (worksData.success && worksData.data.items) {
            const works = worksData.data.items;
            
            if (works.length === 0) {
              document.getElementById('emptyState').style.display = 'block';
              document.getElementById('worksGrid').innerHTML = '';
            } else {
              // 获取每个作品的投票统计（如果有token则获取详细统计，否则只获取投票数）
              const worksWithVotes = await Promise.all(
                works.map(async (work) => {
                  if (token) {
                    // 已登录：获取完整统计信息
                    try {
                      const statsResponse = await fetch(\`/api/vote/stats?workId=\${work.id}\`, {
                        headers: {
                          'Authorization': \`Bearer \${token}\`
                        }
                      });
                      
                      if (statsResponse.ok) {
                        const stats = await statsResponse.json();
                        if (stats.success) {
                          return {
                            ...work,
                            voteCount: stats.data.voteCount || 0,
                            hasVoted: stats.data.hasVoted || false,
                            isOwner: work.userId === currentUser?.userid
                          };
                        }
                      }
                    } catch (error) {
                      console.error(\`获取作品 \${work.id} 的投票统计失败:\`, error);
                    }
                  }
                  
                  // 未登录或获取失败：尝试通过 API 获取投票数（不传 token）
                  try {
                    const statsResponse = await fetch(\`/api/vote/stats?workId=\${work.id}\`);
                    if (statsResponse.ok) {
                      const stats = await statsResponse.json();
                      if (stats.success) {
                        return {
                          ...work,
                          voteCount: stats.data.voteCount || 0,
                          hasVoted: false,
                          isOwner: false
                        };
                      }
                    }
                  } catch (error) {
                    console.error(\`获取作品 \${work.id} 的投票数失败:\`, error);
                  }
                  
                  // 如果获取失败，使用默认值
                  return {
                    ...work,
                    voteCount: 0,
                    hasVoted: false,
                    isOwner: false
                  };
                })
              );

              // 获取用户已投票数量（仅当已登录时）
              if (token) {
                try {
                  const userVotesResponse = await fetch('/api/vote/user/count', {
                    headers: {
                      'Authorization': \`Bearer \${token}\`
                    }
                  });
                  
                  if (userVotesResponse.ok) {
                    const userVotesData = await userVotesResponse.json();
                    if (userVotesData.success) {
                      userVoteCount = userVotesData.data.count || 0;
                    }
                  }
                } catch (error) {
                  console.error('获取用户投票数失败:', error);
                }
              } else {
                userVoteCount = 0;
              }

              displayWorks(worksWithVotes);
            }
          } else {
            document.getElementById('emptyState').style.display = 'block';
          }
        } else {
          document.getElementById('emptyState').style.display = 'block';
        }
      } catch (error) {
        console.error('加载作品失败:', error);
        document.getElementById('emptyState').style.display = 'block';
      } finally {
        document.getElementById('loading').classList.remove('active');
      }
    }

    // 显示作品
    function displayWorks(works) {
      const grid = document.getElementById('worksGrid');
      
      grid.innerHTML = works.map(work => \`
        <div class="masonry-item">
          <div class="work-card">
            <div class="work-video-container" onclick="playVideo('\${work.fileUrl}', '\${work.title}')">
              <video class="work-video" src="\${work.fileUrl}" preload="metadata"></video>
              <div class="work-video-overlay">
                <div class="play-icon">▶</div>
              </div>
            </div>
            <div class="work-content">
              <div class="work-title">\${work.title || '未命名作品'}</div>
              <div class="work-creator">\${work.creatorName || '未知'}</div>
              <div class="work-footer">
                <div class="work-votes">
                  <span>\${work.voteCount}</span>
                </div>
                <button 
                  class="vote-btn \${work.hasVoted ? 'voted' : ''} \${work.isOwner ? 'own-work' : ''}"
                  onclick="handleVote('\${work.id}', \${work.hasVoted}, \${work.isOwner})"
                  \${work.hasVoted || work.isOwner ? 'disabled' : ''}
                  \${userVoteCount >= MAX_VOTES && !work.hasVoted && !work.isOwner ? 'disabled' : ''}
                >
                  \${work.hasVoted ? '已投票' : work.isOwner ? '自己的作品' : '投票'}
                </button>
              </div>
            </div>
          </div>
        </div>
      \`).join('');
    }

    // 播放视频
    function playVideo(url, title) {
      const modal = document.getElementById('videoModal');
      const video = document.getElementById('modalVideo');
      video.src = url;
      video.load();
      modal.classList.add('active');
    }

    // 关闭视频模态框
    function closeVideoModal() {
      const modal = document.getElementById('videoModal');
      const video = document.getElementById('modalVideo');
      video.pause();
      video.src = '';
      modal.classList.remove('active');
    }

    // 处理投票
    async function handleVote(workId, hasVoted, isOwner) {
      if (hasVoted || isOwner) return;

      const token = localStorage.getItem('auth_token');
      if (!token) {
        // 未登录，提示用户登录，但不自动跳转
        if (confirm('请先登录才能投票，是否前往登录页面？')) {
          window.location.href = '/login';
        }
        return;
      }

      if (userVoteCount >= MAX_VOTES) {
        alert(\`您已经投了 \${MAX_VOTES} 票，不能再投票了\`);
        return;
      }

      try {
        const response = await fetch('/api/vote', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${token}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ workId })
        });

        const data = await response.json();
        if (data.success) {
          userVoteCount++;
          loadWorks(); // 重新加载作品列表
        } else {
          alert(data.error?.message || '投票失败');
        }
      } catch (error) {
        console.error('投票失败:', error);
        alert('投票失败，请重试');
      }
    }

    // 点击模态框外部关闭
    document.getElementById('videoModal').addEventListener('click', (e) => {
      if (e.target.id === 'videoModal') {
        closeVideoModal();
      }
    });

    // 页面加载时检查登录状态并加载作品
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
          
          // 更新渐变浅色版本
          const darkRgb = hexToRgb(primaryDark);
          const colorRgb = hexToRgb(primaryColor);
          root.style.setProperty('--gradient-light', \`linear-gradient(135deg, rgba(\${darkRgb}, 0.1) 0%, rgba(\${colorRgb}, 0.1) 100%)\`);
          
          // 更新阴影发光效果
          root.style.setProperty('--shadow-glow', \`0 0 20px rgba(\${colorRgb}, 0.3)\`);
        }
      } catch (error) {
        console.error('Load theme error:', error);
      }
    }

    // 十六进制颜色转RGB（用于rgba）
    function hexToRgb(hex) {
      const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
      return result ? 
        \`\${parseInt(result[1], 16)}, \${parseInt(result[2], 16)}, \${parseInt(result[3], 16)}\` : 
        '37, 99, 235';
    }

    window.addEventListener('load', async () => {
      // 先加载主题配置
      await loadAndApplyTheme();
      // 检查 URL 中是否有 token（从登录回调返回）
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) {
        localStorage.setItem('auth_token', token);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      checkAuth();
    });

    // 切换用户菜单
    function toggleUserMenu() {
      const dropdown = document.getElementById('userDropdown');
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }

    function toggleSideUserMenu() {
      const dropdown = document.getElementById('sideUserDropdown');
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }

    // 打开侧边菜单
    function toggleSideMenu() {
      const sideMenu = document.getElementById('sideMenu');
      const menuOverlay = document.getElementById('menuOverlay');
      const menuToggle = document.getElementById('menuToggle');
      
      if (sideMenu.classList.contains('active')) {
        closeSideMenu();
      } else {
        sideMenu.classList.add('active');
        menuOverlay.classList.add('active');
        menuToggle.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    // 关闭侧边菜单
    function closeSideMenu() {
      const sideMenu = document.getElementById('sideMenu');
      const menuOverlay = document.getElementById('menuOverlay');
      const menuToggle = document.getElementById('menuToggle');
      
      sideMenu.classList.remove('active');
      menuOverlay.classList.remove('active');
      menuToggle.classList.remove('active');
      document.body.style.overflow = '';
    }

    // 点击外部关闭菜单
    document.addEventListener('click', function(event) {
      const userMenu = document.getElementById('userMenu');
      const dropdown = document.getElementById('userDropdown');
      if (userMenu && dropdown && !userMenu.contains(event.target)) {
        dropdown.style.display = 'none';
      }
      
      const sideUserMenu = document.getElementById('sideUserMenu');
      const sideDropdown = document.getElementById('sideUserDropdown');
      if (sideUserMenu && sideDropdown && !sideUserMenu.contains(event.target)) {
        sideDropdown.style.display = 'none';
      }
    });

    // 退出登录（保留在首页）
    async function logout() {
      const token = localStorage.getItem('auth_token');
      
      // 如果有 token，调用后端 API 清除 session
      if (token) {
        try {
          await fetch('/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': \`Bearer \${token}\`
            }
          });
        } catch (error) {
          console.error('Logout error:', error);
          // 即使 API 失败，也继续清除本地状态
        }
      }
      
      // 清除本地状态
      clearUserState();
      
      // 更新 UI：显示登录按钮，隐藏用户菜单
      document.getElementById('authBtn').style.display = 'inline-flex';
      document.getElementById('userMenu').style.display = 'none';
      document.getElementById('sideAuthBtn').style.display = 'inline-flex';
      document.getElementById('sideUserMenu').style.display = 'none';
      document.getElementById('adminLink').style.display = 'none';
      document.getElementById('sideAdminLink').style.display = 'none';
      
      // 清除用户信息
      currentUser = null;
      userVoteCount = 0;
      
      // 重新加载作品列表（以未登录状态）
      loadWorks();
    }

    // 清除用户状态
    function clearUserState() {
      localStorage.removeItem('auth_token');
      currentUser = null;
      userVoteCount = 0;
      // 隐藏用户菜单，显示登录按钮
      document.getElementById('userMenu').style.display = 'none';
      document.getElementById('authBtn').style.display = 'block';
      document.getElementById('authBtn').textContent = '登录';
      // 同步侧边菜单
      document.getElementById('sideUserMenu').style.display = 'none';
      document.getElementById('sideAuthBtn').style.display = 'block';
      document.getElementById('sideAuthBtn').textContent = '登录';
      document.getElementById('sideAdminLink').style.display = 'none';
      // 关闭下拉菜单
      document.getElementById('userDropdown').style.display = 'none';
      document.getElementById('sideUserDropdown').style.display = 'none';
      // 清空作品列表
      document.getElementById('worksGrid').innerHTML = '';
      document.getElementById('emptyState').style.display = 'none';
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
