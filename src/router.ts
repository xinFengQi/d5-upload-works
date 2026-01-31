/**
 * 路由处理
 * 根据请求路径分发到不同的路由处理器
 */

import { handleAuthRoutes } from './routes/auth';
import { handleUploadRoutes } from './routes/upload';
import { handleWorksRoutes } from './routes/works';
import { handleVoteRoutes } from './routes/vote';
import { handleHomeRoute } from './routes/home';
import { handleUploadPage } from './routes/upload-page';
import { handleScreenPage } from './routes/screen-page';
import { handleVoteResultPage } from './routes/vote-result-page';
import { handleLoginPage } from './routes/login-page';
import { handleAdminPage } from './routes/admin-page';
import { createErrorResponse } from './utils/response';

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 健康检查
  if (path === '/health' && method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 首页
  if (path === '/' && method === 'GET') {
    return handleHomeRoute(request, env, ctx);
  }

  // 认证相关路由
  if (path.startsWith('/auth/')) {
    return handleAuthRoutes(request, env, ctx);
  }

  // 上传相关路由
  if (path.startsWith('/api/upload')) {
    return handleUploadRoutes(request, env, ctx);
  }

  // 作品管理路由
  if (path.startsWith('/api/works')) {
    return handleWorksRoutes(request, env, ctx);
  }

  // 投票相关路由
  if (path.startsWith('/api/vote')) {
    return handleVoteRoutes(request, env, ctx);
  }

  // 上传页面
  if (path === '/upload' && method === 'GET') {
    return handleUploadPage(request, env, ctx);
  }

  // 大屏展示页面（走马灯轮播）
  if (path === '/screen' && method === 'GET') {
    return handleScreenPage(request, env, ctx);
  }

  // 投票结果页面
  if (path === '/vote-result' && method === 'GET') {
    return handleVoteResultPage(request, env, ctx);
  }

  // 登录页面
  if (path === '/login' && method === 'GET') {
    return handleLoginPage(request, env, ctx);
  }

  // 管理员页面
  if (path === '/admin' && method === 'GET') {
    return handleAdminPage(request, env, ctx);
  }

  // 404
  return createErrorResponse('Not Found', 'NOT_FOUND', 404);
}
