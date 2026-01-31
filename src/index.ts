/**
 * Cloudflare Workers 入口文件
 * 处理所有 HTTP 请求路由
 */

import { handleRequest } from './router';
import { VoteCounter } from './durable-objects/vote-counter';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      console.error('Unhandled error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

// 导出 Durable Objects
export { VoteCounter };
