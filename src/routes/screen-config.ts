/**
 * 大屏配置相关路由处理
 */

import type { Env } from '../types/env';
import { createErrorResponse, createSuccessResponse } from '../utils/response';
import { KVService } from '../services/kv';
import type { UserSession } from '../types/user';

export interface ScreenConfig {
  gridLayout: '2x2' | '2x3' | '3x2' | '3x3' | '4x4';
  updatedAt: number;
  // 主题配置
  theme?: {
    primaryColor?: string;
    primaryDark?: string;
    primaryLight?: string;
    secondaryColor?: string;
  };
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
          theme: {
            primaryColor: '#2563eb',
            primaryDark: '#1e40af',
            primaryLight: '#3b82f6',
            secondaryColor: '#64748b',
          },
        });
      }

      // 确保主题配置存在（向后兼容）
      if (!config.theme) {
        config.theme = {
          primaryColor: '#2563eb',
          primaryDark: '#1e40af',
          primaryLight: '#3b82f6',
          secondaryColor: '#64748b',
        };
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
      const { gridLayout, theme } = body;

      // 验证 gridLayout
      if (gridLayout && !['2x2', '2x3', '3x2', '3x3', '4x4'].includes(gridLayout)) {
        return createErrorResponse(
          'Invalid gridLayout. Must be one of: 2x2, 2x3, 3x2, 3x3, 4x4',
          'INVALID_REQUEST',
          400
        );
      }

      // 验证主题配置
      if (theme) {
        if (theme.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(theme.primaryColor)) {
          return createErrorResponse('Invalid primaryColor format. Must be hex color (e.g., #2563eb)', 'INVALID_REQUEST', 400);
        }
        if (theme.primaryDark && !/^#[0-9A-Fa-f]{6}$/.test(theme.primaryDark)) {
          return createErrorResponse('Invalid primaryDark format. Must be hex color (e.g., #1e40af)', 'INVALID_REQUEST', 400);
        }
        if (theme.primaryLight && !/^#[0-9A-Fa-f]{6}$/.test(theme.primaryLight)) {
          return createErrorResponse('Invalid primaryLight format. Must be hex color (e.g., #3b82f6)', 'INVALID_REQUEST', 400);
        }
        if (theme.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(theme.secondaryColor)) {
          return createErrorResponse('Invalid secondaryColor format. Must be hex color (e.g., #64748b)', 'INVALID_REQUEST', 400);
        }
      }

      // 获取现有配置
      const existingConfig = await kvService.get<ScreenConfig>('screen_config');
      
      const config: ScreenConfig = {
        gridLayout: gridLayout || existingConfig?.gridLayout || '2x2',
        updatedAt: Date.now(),
        theme: theme || existingConfig?.theme || {
          primaryColor: '#2563eb',
          primaryDark: '#1e40af',
          primaryLight: '#3b82f6',
          secondaryColor: '#64748b',
        },
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
