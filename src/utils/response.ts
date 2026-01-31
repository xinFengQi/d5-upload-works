/**
 * API 响应格式化工具
 */

import type { ApiResponse } from '../types/api';

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  message: string,
  code: string,
  status: number = 400,
  details?: any
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
      details,
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 创建分页响应
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): Response {
  const totalPages = Math.ceil(total / limit);

  return createSuccessResponse({
    items,
    total,
    page,
    limit,
    totalPages,
  });
}
