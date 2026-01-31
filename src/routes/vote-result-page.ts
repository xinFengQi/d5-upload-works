/**
 * 投票结果页面路由处理
 */

import type { Env } from '../types/env';

export async function handleVoteResultPage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>投票结果 - 2026年会作品投票</title>
  <link rel="icon" type="image/png" href="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary-color: #6366f1;
      --secondary-color: #8b5cf6;
      --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --gold: #ffd700;
      --silver: #c0c0c0;
      --bronze: #cd7f32;
      --text-primary: #1f2937;
      --text-secondary: #6b7280;
      --bg-primary: #ffffff;
      --bg-secondary: #f9fafb;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      color: var(--text-primary);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      overflow-x: hidden;
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
      padding: 0;
      max-width: 1800px;
      margin: 0 auto;
      min-height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .content-wrapper {
      padding: 1.5rem 2rem;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .screen-header {
      text-align: center;
      color: white;
      flex-shrink: 0;
    }

    .screen-title {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }

    .screen-subtitle {
      font-size: 1.5rem;
      opacity: 0.9;
      margin-bottom: 0.5rem;
    }

    .podium-section {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 2rem;
      margin-bottom: 0;
      min-height: 0;
      flex: 1;
    }

    .podium-item {
      flex: 1;
      max-width: 450px;
      text-align: center;
      animation: slideUp 0.6s ease-out;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .podium-item.first {
      order: 2;
    }

    .podium-item.second {
      order: 1;
    }

    .podium-item.third {
      order: 3;
    }

    .podium-rank {
      font-size: 4.5rem;
      font-weight: 800;
      color: white;
      margin-bottom: 1rem;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      flex-shrink: 0;
    }

    .podium-rank.first {
      color: var(--gold);
    }

    .podium-rank.second {
      color: var(--silver);
    }

    .podium-rank.third {
      color: var(--bronze);
    }

    .podium-card {
      background: white;
      border-radius: 1.25rem;
      padding: 2rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      margin-bottom: 1rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .podium-item.first .podium-card {
      transform: scale(1.1);
    }

    .podium-video {
      width: 100%;
      aspect-ratio: 16/9;
      border-radius: 0.75rem;
      background: #000;
      margin-bottom: 1rem;
      overflow: hidden;
      flex-shrink: 0;
    }

    .podium-video video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .podium-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      flex-shrink: 0;
    }

    .podium-creator {
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .podium-votes {
      font-size: 2.25rem;
      font-weight: 800;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      flex-shrink: 0;
    }

    .podium-height {
      height: 180px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 0.5rem 0.5rem 0 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 2.5rem;
      font-weight: 800;
      flex-shrink: 0;
    }

    .podium-item.first .podium-height {
      height: 220px;
    }

    .podium-item.second .podium-height,
    .podium-item.third .podium-height {
      height: 160px;
    }

    .list-section {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      margin-top: 4rem;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    /* 确保第4-10名列表在视口之外，需要滚动才能看到 */
    .screen-container {
      overflow-y: auto;
    }

    .content-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .list-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      text-align: center;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .list-items {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .list-item {
      background: var(--bg-secondary);
      border-radius: 0.5rem;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      width: 100%;
      transition: all 0.3s ease;
    }

    .list-item:hover {
      background: #f3f4f6;
      transform: translateX(4px);
    }

    .list-rank {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-secondary);
      min-width: 50px;
      text-align: center;
    }

    .list-info {
      flex: 1;
      min-width: 0;
    }

    .list-title-text {
      font-weight: 600;
      margin-bottom: 0.25rem;
      font-size: 1.125rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .list-creator {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .list-votes {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
      min-width: 80px;
      text-align: right;
    }

    .loading {
      text-align: center;
      padding: 4rem 2rem;
      color: white;
    }

    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top: 3px solid white;
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

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(50px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 1200px) {
      .podium-section {
        flex-direction: column;
        align-items: center;
      }

      .podium-item {
        max-width: 100%;
      }

      .podium-item.first {
        order: 1;
      }

      .podium-item.second {
        order: 2;
      }

      .podium-item.third {
        order: 3;
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
    <div class="content-wrapper">
      <div class="screen-header">
        <h1 class="screen-title">2026年会作品投票结果</h1>
        <p class="screen-subtitle">Top 10 作品展示</p>
        <p style="font-size: 1rem; opacity: 0.8; margin-top: 0.5rem;">见证创作的力量</p>
      </div>

      <div class="loading" id="loading">
        <div class="spinner"></div>
        <p style="margin-top: 1rem;">加载中...</p>
      </div>

      <div id="content" style="display: none;">
        <!-- 前三名领奖台 -->
        <div class="podium-section" id="podiumSection">
          <!-- 动态生成 -->
        </div>

        <!-- 第4-10名列表 -->
        <div class="list-section" id="listSection" style="display: none;">
          <h2 class="list-title">第 4-10 名</h2>
          <div class="list-items" id="listItems">
            <!-- 动态生成 -->
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    async function loadTopWorks() {
      try {
        const response = await fetch('/api/works/top?limit=10');
        
        if (!response.ok) {
          throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        
        const data = await response.json();
        console.log('Top works response:', data);

        if (data.success && data.data && data.data.items) {
          const works = data.data.items;
          
          if (works.length === 0) {
            document.getElementById('loading').innerHTML = '<p>暂无作品</p>';
            return;
          }

          // 前三名
          const topThree = works.slice(0, 3);
          displayPodium(topThree);

          // 第4-10名
          if (works.length > 3) {
            const rest = works.slice(3, 10);
            displayList(rest);
          }

          document.getElementById('loading').style.display = 'none';
          document.getElementById('content').style.display = 'block';
        } else {
          console.error('API response error:', data);
          document.getElementById('loading').innerHTML = \`<p>加载失败: \${data.error?.message || '未知错误'}</p>\`;
        }
      } catch (error) {
        console.error('加载失败:', error);
        document.getElementById('loading').innerHTML = '<p>加载失败，请刷新重试</p>';
      }
    }

    function displayPodium(works) {
      try {
        const podiumSection = document.getElementById('podiumSection');
        if (!podiumSection) {
          console.error('podiumSection element not found');
          return;
        }
        
        // works 已经是按投票数排序的 [第1名, 第2名, 第3名]
        // 但显示顺序需要是 [第2名(左), 第1名(中), 第3名(右)]
        const displayOrder = [1, 0, 2]; // 索引顺序：先显示第2名，再第1名，再第3名
        const ranks = ['second', 'first', 'third'];
        const rankLabels = ['🥈', '🥇', '🥉'];
        const rankTexts = ['第2名', '第1名', '第3名'];

        podiumSection.innerHTML = displayOrder.map((originalIndex, displayIndex) => {
          const work = works[originalIndex];
          if (!work) return '';
          return \`
          <div class="podium-item \${ranks[displayIndex]}">
            <div class="podium-rank \${ranks[displayIndex]}">\${rankLabels[displayIndex]}</div>
            <div class="podium-card">
              <div class="podium-video">
                <video src="\${work.fileUrl}" autoplay loop muted></video>
              </div>
              <div class="podium-title">\${work.title || '未命名作品'}</div>
              <div class="podium-creator">\${work.creatorName || '未知'}</div>
              <div class="podium-votes">\${work.voteCount || 0} 票</div>
            </div>
            <div class="podium-height">
              <span>\${rankTexts[displayIndex]}</span>
            </div>
          </div>
        \`}).join('');
      } catch (error) {
        console.error('displayPodium error:', error);
      }
    }

    function displayList(works) {
      const listSection = document.getElementById('listSection');
      const listItems = document.getElementById('listItems');

      listSection.style.display = 'block';
      listItems.innerHTML = works.map((work, index) => \`
        <div class="list-item">
          <div class="list-rank">\${index + 4}</div>
          <div class="list-info">
            <div class="list-title-text">\${work.title || '未命名作品'}</div>
            <div class="list-creator">\${work.creatorName || '未知'}</div>
          </div>
          <div class="list-votes">\${work.voteCount || 0} 票</div>
        </div>
      \`).join('');
    }

    // 页面加载时获取数据
    window.addEventListener('load', () => {
      loadTopWorks();
      // 每30秒刷新一次
      setInterval(loadTopWorks, 30000);
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
