/**
 * 多屏播放页面路由处理
 * 根据配置的分屏模式显示多个视频，实现播放队列和循环播放
 */

import type { Env } from '../types/env';

export async function handleMultiScreenPage(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>多屏播放 - 2026年会作品投票</title>
  <link rel="icon" type="image/png" href="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #000;
      color: white;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }

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
    }

    .grid-container {
      width: 100vw;
      height: 100vh;
      display: grid;
      gap: 0.25rem;
      padding: 0.25rem;
    }

    .grid-2x2 {
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
    }

    .grid-2x3 {
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
    }

    .grid-3x2 {
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, 1fr);
    }

    .grid-3x3 {
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
    }

    .grid-4x4 {
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(4, 1fr);
    }

    .video-cell {
      position: relative;
      background: #000;
      overflow: hidden;
      border: 2px solid transparent;
      transition: border-color 0.3s ease;
    }

    .video-cell.playing {
      border-color: rgba(37, 99, 235, 0.4);
      box-shadow: 0 0 15px rgba(37, 99, 235, 0.3);
    }

    .video-cell video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.6), transparent);
      padding: 0.75rem 0.5rem;
      font-size: 0.75rem;
      opacity: 1;
      color: white;
      z-index: 10;
    }

    .loading {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
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
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 2000;
    }
  </style>
</head>
<body>
  <a href="/" class="logo-exit" title="返回首页">
    <img src="https://cn.official.d5render.com/wp-content/uploads/d5-logo-100.png" alt="D5 Render">
  </a>

  <div class="loading" id="loading">
    <div class="spinner"></div>
    <p>加载中...</p>
  </div>

  <div class="empty-state" id="emptyState" style="display: none;">
    <div style="font-size: 5rem; margin-bottom: 1rem;">📺</div>
    <h2>暂无作品</h2>
    <p style="opacity: 0.8; margin-top: 0.5rem;">请先上传作品</p>
  </div>

  <div class="grid-container" id="gridContainer" style="display: none;">
    <!-- 视频单元格将通过 JavaScript 动态生成 -->
  </div>

  <script>
    let works = [];
    let config = { gridLayout: '2x2' };
    let playQueue = [];
    let playingCells = new Set();
    let cellVideos = new Map(); // 存储每个单元格的视频队列

    // 获取网格布局的单元格数量
    function getGridSize(layout) {
      const [rows, cols] = layout.split('x').map(Number);
      return rows * cols;
    }

    // 加载配置
    async function loadConfig() {
      try {
        const response = await fetch('/api/screen-config');
        const data = await response.json();
        
        if (data.success && data.data) {
          config = data.data;
        }
      } catch (error) {
        console.error('Load config error:', error);
      }
    }

    // 加载所有作品
    async function loadWorks() {
      try {
        const response = await fetch('/api/works?page=1&limit=1000');
        const data = await response.json();

        if (data.success && data.data.items) {
          const items = data.data.items;

          if (items.length === 0) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
            return;
          }

          // 为每个作品获取投票数
          await Promise.all(items.map(async (work) => {
            try {
              const voteResponse = await fetch(\`/api/vote/stats?workId=\${work.id}\`);
              const voteData = await voteResponse.json();
              if (voteData.success && voteData.data) {
                work.voteCount = voteData.data.count || 0;
              } else {
                work.voteCount = 0;
              }
            } catch (err) {
              console.error(\`Get vote count error for work \${work.id}:\`, err);
              work.voteCount = 0;
            }
          }));

          works = items;

          const container = document.getElementById('gridContainer');
          const hasGrid = container && container.querySelectorAll('.video-cell').length > 0;
          if (!hasGrid) {
            await loadConfig();
            renderGrid();
            initializePlayQueue();
          }
          // 已有网格时为定时刷新：仅更新 works，不重绘、不打断当前播放；各格队列用完后会从新 works 补充
        } else {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('emptyState').style.display = 'block';
        }
      } catch (error) {
        console.error('Load works error:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
      }
    }

    // 渲染网格
    function renderGrid() {
      const container = document.getElementById('gridContainer');
      const gridSize = getGridSize(config.gridLayout);
      
      // 设置网格类
      container.className = \`grid-container grid-\${config.gridLayout}\`;
      
      // 清空容器
      container.innerHTML = '';
      
      // 创建单元格
      for (let i = 0; i < gridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'video-cell';
        cell.id = \`cell-\${i}\`;
        
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        
        const info = document.createElement('div');
        info.className = 'video-info';
        info.id = \`info-\${i}\`;
        
        cell.appendChild(video);
        cell.appendChild(info);
        container.appendChild(cell);
        
        // 为每个单元格初始化视频队列
        cellVideos.set(i, []);
      }
      
      document.getElementById('loading').style.display = 'none';
      container.style.display = 'grid';
    }

    // 初始化播放队列
    function initializePlayQueue() {
      if (works.length === 0) return;
      
      const gridSize = getGridSize(config.gridLayout);
      
      // 为每个单元格分配视频队列（循环分配）
      for (let i = 0; i < works.length; i++) {
        const cellIndex = i % gridSize;
        const queue = cellVideos.get(cellIndex) || [];
        queue.push(works[i]);
        cellVideos.set(cellIndex, queue);
      }
      
      // 开始播放所有单元格
      for (let i = 0; i < gridSize; i++) {
        playNextInCell(i);
      }
    }

    // 在指定单元格播放下一个视频
    function playNextInCell(cellIndex) {
      const queue = cellVideos.get(cellIndex);
      if (!queue || queue.length === 0) {
        // 如果队列为空，重新填充（循环播放）
        const gridSize = getGridSize(config.gridLayout);
        for (let i = 0; i < works.length; i++) {
          const idx = i % gridSize;
          if (idx === cellIndex) {
            const q = cellVideos.get(cellIndex) || [];
            q.push(works[i]);
            cellVideos.set(cellIndex, q);
          }
        }
        // 如果重新填充后还是空的，说明没有作品
        if (!cellVideos.get(cellIndex) || cellVideos.get(cellIndex).length === 0) {
          return;
        }
      }
      
      const work = queue.shift();
      if (!work) return;
      
      const cell = document.getElementById(\`cell-\${cellIndex}\`);
      const video = cell.querySelector('video');
      const info = document.getElementById(\`info-\${cellIndex}\`);
      
      if (!video) return;
      
      // 设置视频源
      video.src = work.fileUrl;
      video.load();
      
      // 更新信息
      if (info) {
        info.innerHTML = \`
          <div style="font-weight: 600; margin-bottom: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${truncateText(work.title || '未命名作品', 30)}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; opacity: 0.9;">
            <span>\${work.creatorName || '未知'}</span>
            <span style="display: flex; align-items: center; gap: 0.25rem;">
              <span style="font-size: 0.65rem;">❤️</span>
              <span>\${work.voteCount || 0}</span>
            </span>
          </div>
        \`;
      }
      
      // 标记为播放中
      cell.classList.add('playing');
      playingCells.add(cellIndex);
      
      // 播放视频
      video.play().catch(err => {
        console.error(\`Play error for cell \${cellIndex}:\`, err);
        // 播放失败，尝试播放下一个
        setTimeout(() => playNextInCell(cellIndex), 1000);
      });
      
      // 监听播放结束
      video.onended = () => {
        cell.classList.remove('playing');
        playingCells.delete(cellIndex);
        // 播放下一个
        playNextInCell(cellIndex);
      };
      
      // 监听播放错误
      video.onerror = () => {
        console.error(\`Video error for cell \${cellIndex}\`);
        cell.classList.remove('playing');
        playingCells.delete(cellIndex);
        // 播放失败，尝试播放下一个
        setTimeout(() => playNextInCell(cellIndex), 1000);
      };
    }

    // 截断文本
    function truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
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

    // 页面加载
    window.addEventListener('load', async () => {
      // 先加载主题配置
      await loadAndApplyTheme();
      loadWorks();
      // 每10分钟刷新一次数据
      setInterval(loadWorks, 10 * 60 * 1000);
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
