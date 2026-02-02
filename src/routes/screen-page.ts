/**
 * 大屏展示页面路由处理 - 走马灯轮播展示所有作品
 */

import type { Env } from '../types/env';

export async function handleScreenPage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>大屏展示 - 2026年会作品投票</title>
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
      
      /* 渐变 - 使用主题色 */
      --gradient: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-color) 100%);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      color: var(--text-primary);
      background: #000;
      min-height: 100vh;
      overflow: hidden;
    }

    /* Logo 隐藏出口 */
    .logo-exit {
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 2000;
      opacity: 0.3;
      transition: opacity 0.3s ease;
      cursor: pointer;
    }

    .logo-exit:hover {
      opacity: 1;
    }

    .logo-exit img {
      height: 50px;
      width: auto;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .screen-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .swiper-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .swiper-slide {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 1s ease-in-out, transform 1s ease-in-out;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: 1rem;
      box-sizing: border-box;
    }

    .swiper-slide.active {
      opacity: 1;
      z-index: 2;
    }

    .swiper-slide.prev {
      transform: translateX(-100%);
      z-index: 1;
    }

    .swiper-slide.next {
      transform: translateX(100%);
      z-index: 1;
    }

    .work-card {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      background: transparent;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 0;
    }

    .work-video-container {
      position: relative;
      width: 100%;
      height: calc(100vh - 80px);
      max-height: calc(100vh - 80px);
      border-radius: 0;
      overflow: hidden;
      background: #000;
      margin-bottom: 0.5rem;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .work-video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      max-width: 100%;
      max-height: 100%;
    }

    .work-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      color: white;
      flex-wrap: nowrap;
      white-space: nowrap;
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      border-radius: 0.5rem;
      width: fit-content;
      margin: 0 auto;
    }

    .work-title {
      font-size: 2rem;
      font-weight: 800;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 0 30px rgba(37, 99, 235, 0.5);
      flex-shrink: 0;
      max-width: 600px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: help;
    }

    .work-creator {
      font-size: 1.25rem;
      color: rgba(255, 255, 255, 0.8);
      flex-shrink: 0;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: help;
    }

    .work-votes {
      font-size: 1.5rem;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .work-votes::before {
      content: '❤️';
      font-size: 1.5rem;
      animation: heartbeat 2s ease-in-out infinite;
    }

    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    .slide-counter {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.25rem;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.5);
      padding: 0.75rem 1.5rem;
      border-radius: 2rem;
      backdrop-filter: blur(10px);
    }

    .loading {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: white;
      z-index: 2000;
    }

    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      color: white;
      padding: 4rem;
    }

    .empty-state-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      font-size: 1.25rem;
      opacity: 0.8;
    }

    @media (max-width: 768px) {
      .swiper-slide {
        padding: 0.5rem;
      }

      .work-video-container {
        height: calc(100vh - 60px);
        max-height: calc(100vh - 60px);
      }

      .work-info {
        gap: 1rem;
        flex-wrap: wrap;
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
      }

      .work-title {
        font-size: 1.25rem;
        max-width: 300px;
      }

      .work-creator {
        font-size: 0.875rem;
        max-width: 150px;
      }

      .work-votes {
        font-size: 1rem;
      }

      .logo-exit img {
        height: 40px;
      }

      .slide-counter {
        bottom: 0.5rem;
        right: 0.5rem;
        font-size: 1rem;
        padding: 0.5rem 1rem;
      }
    }
  </style>
</head>
<body>
  <!-- Logo 隐藏出口 -->
  <a href="/" class="logo-exit" title="返回首页">
    <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
  </a>

  <div class="screen-container">
    <div class="loading" id="loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div class="swiper-wrapper" id="swiperWrapper" style="display: none;">
      <!-- 作品幻灯片将通过 JavaScript 动态生成 -->
    </div>

    <div class="slide-counter" id="slideCounter" style="display: none;">
      <span id="currentIndex">1</span> / <span id="totalCount">0</span>
    </div>
  </div>

  <script>
    let works = [];
    let currentIndex = 0;

    // 截断文本函数
    function truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    }

    async function loadAllWorks() {
      try {
        const response = await fetch('/api/works?page=1&limit=100');
        const data = await response.json();

        if (data.success && data.data.items) {
          works = data.data.items;
          
          if (works.length === 0) {
            showEmptyState();
            return;
          }

          renderSlides();
          document.getElementById('loading').style.display = 'none';
          document.getElementById('swiperWrapper').style.display = 'block';
          document.getElementById('slideCounter').style.display = 'block';
        } else {
          showError();
        }
      } catch (error) {
        console.error('加载失败:', error);
        showError();
      }
    }

    function renderSlides() {
      const wrapper = document.getElementById('swiperWrapper');
      const totalCount = document.getElementById('totalCount');
      
      totalCount.textContent = works.length;

      wrapper.innerHTML = works.map((work, index) => \`
        <div class="swiper-slide \${index === 0 ? 'active' : ''}" data-index="\${index}">
          <div class="work-card">
            <div class="work-video-container">
              <video class="work-video" src="\${work.fileUrl}" autoplay muted playsinline></video>
            </div>
            <div class="work-info">
              <h2 class="work-title" title="\${work.title || '未命名作品'}">\${truncateText(work.title || '未命名作品', 30)}</h2>
              <p class="work-creator" title="\${work.creatorName || '未知'}">创作者：\${truncateText(work.creatorName || '未知', 15)}</p>
              <div class="work-votes">
                <span>\${work.voteCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      \`).join('');

      // 绑定视频播放结束事件
      bindVideoEndEvents();
      updateCounter();
    }

    function showSlide(index) {
      const slides = document.querySelectorAll('.swiper-slide');
      const prevIndex = currentIndex;
      currentIndex = index;

      // 更新所有幻灯片状态
      slides.forEach((slide, i) => {
        slide.classList.remove('active', 'prev', 'next');
        if (i === currentIndex) {
          slide.classList.add('active');
        } else if (i < currentIndex) {
          slide.classList.add('prev');
        } else {
          slide.classList.add('next');
        }
      });

      // 播放当前视频
      const currentSlide = slides[currentIndex];
      const video = currentSlide.querySelector('video');
      if (video) {
        video.currentTime = 0;
        // 确保视频结束事件已绑定
        video.removeEventListener('ended', handleVideoEnd);
        // 绑定结束事件，确保循环播放
        const handleEnd = () => {
          // 确保是当前视频才切换
          if (currentIndex === parseInt(currentSlide.dataset.index || '0')) {
            handleVideoEnd(currentIndex);
          }
        };
        video.addEventListener('ended', handleEnd);
        video.play().catch(e => {
          console.error('播放失败:', e);
          // 播放失败时，延迟后尝试播放下一个
          setTimeout(() => {
            if (works.length > 0) {
              nextSlide();
            }
          }, 1000);
        });
      }

      // 暂停其他视频
      slides.forEach((slide, i) => {
        if (i !== currentIndex) {
          const v = slide.querySelector('video');
          if (v) {
            v.pause();
            v.currentTime = 0;
          }
        }
      });

      updateCounter();
    }

    function bindVideoEndEvents() {
      const videos = document.querySelectorAll('.work-video');
      videos.forEach((video, index) => {
        // 移除之前的事件监听器（如果有）
        video.removeEventListener('ended', handleVideoEnd);
        // 添加新的事件监听器
        video.addEventListener('ended', () => handleVideoEnd(index));
      });
    }

    function handleVideoEnd(videoIndex) {
      // 只有当前播放的视频结束时才切换
      if (videoIndex === currentIndex) {
        // 确保有作品可以播放
        if (works.length > 0) {
          nextSlide();
        }
      }
    }

    function nextSlide() {
      // 确保有作品可以播放
      if (works.length === 0) return;
      
      // 循环播放：到达最后一个后回到第一个
      const nextIndex = (currentIndex + 1) % works.length;
      showSlide(nextIndex);
    }

    function prevSlide() {
      const prevIndex = (currentIndex - 1 + works.length) % works.length;
      showSlide(prevIndex);
    }

    function updateCounter() {
      document.getElementById('currentIndex').textContent = currentIndex + 1;
    }


    function showEmptyState() {
      document.getElementById('loading').innerHTML = \`
        <div class="empty-state">
          <div class="empty-state-icon">🎬</div>
          <h2>暂无作品</h2>
          <p>等待作品上传中...</p>
        </div>
      \`;
    }

    function showError() {
      document.getElementById('loading').innerHTML = \`
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <h2>加载失败</h2>
          <p>请刷新页面重试</p>
        </div>
      \`;
    }

    // 键盘控制
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        prevSlide();
      }
    });

    // 触摸滑动支持
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    });

    function handleSwipe() {
      const swipeThreshold = 50;
      const diff = touchStartX - touchEndX;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
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

    // 页面加载时获取数据
    window.addEventListener('load', async () => {
      // 先加载主题配置
      await loadAndApplyTheme();
      loadAllWorks();
      // 每60秒刷新一次数据
      setInterval(loadAllWorks, 60000);
    });

    // 页面可见性变化时控制视频播放
    document.addEventListener('visibilitychange', () => {
      const slides = document.querySelectorAll('.swiper-slide');
      if (document.hidden) {
        slides.forEach(slide => {
          const video = slide.querySelector('video');
          if (video) video.pause();
        });
      } else {
        const currentSlide = slides[currentIndex];
        if (currentSlide) {
          const video = currentSlide.querySelector('video');
          if (video) video.play().catch(e => console.error('播放失败:', e));
        }
      }
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
