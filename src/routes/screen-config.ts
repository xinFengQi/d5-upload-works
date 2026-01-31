/**
 * 大屏配置相关路由处理
 */

import type { Env } from '../types/env';
import { createErrorResponse, createSuccessResponse } from '../utils/response';
import { KVService } from '../services/kv';
import type { UserSession } from '../types/user';

export interface ScreenConfig {
  gridLayout: '2x2' | '2x3' | '3x3' | '4x4';
  updatedAt: number;
}

/**
 * 验证管理员身份
 */
async function verifyAdmin(request: Request, kvService: KVService): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  const session = await kvService.get<UserSession>(`session:${token}`);

  if (!session || session.expiresAt < Date.now()) {
    return false;
  }

  return session.userInfo?.role === 'admin';
}

export async function handleScreenConfigRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const kvService = new KVService(env.MY_KV);

  // 获取配置
  if (path === '/api/screen-config' && method === 'GET') {
    try {
      const config = await kvService.get<ScreenConfig>('screen_config');
      
      // 如果没有配置，返回默认配置
      if (!config) {
        return createSuccessResponse({
          gridLayout: '2x2',
          updatedAt: Date.now(),
        });
      }

      return createSuccessResponse(config);
    } catch (error) {
      console.error('Get screen config error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // 保存配置（仅管理员）
  if (path === '/api/screen-config' && method === 'POST') {
    try {
      const isAdmin = await verifyAdmin(request, kvService);
      if (!isAdmin) {
        return createErrorResponse('Forbidden: Admin only', 'FORBIDDEN', 403);
      }

      const body = await request.json();
      const { gridLayout } = body;

      if (!gridLayout || !['2x2', '2x3', '3x2', '3x3', '4x4'].includes(gridLayout)) {
        return createErrorResponse(
          'Invalid gridLayout. Must be one of: 2x2, 2x3, 3x2, 3x3, 4x4',
          'INVALID_REQUEST',
          400
        );
      }

      const config: ScreenConfig = {
        gridLayout,
        updatedAt: Date.now(),
      };

      await kvService.set('screen_config', config);

      return createSuccessResponse(config);
    } catch (error) {
      console.error('Save screen config error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  return createErrorResponse('Not Found', 'NOT_FOUND', 404);
}
