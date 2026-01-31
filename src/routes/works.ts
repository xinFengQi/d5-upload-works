/**
 * 作品管理相关路由处理
 */

import type { Env } from '../types/env';
import { createErrorResponse, createSuccessResponse, createPaginatedResponse } from '../utils/response';
import { KVService } from '../services/kv';
import { VoteCounterService } from '../services/vote-counter';
import type { Work } from '../types/work';
import type { UserSession, DingTalkUser } from '../types/user';

export async function handleWorksRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 获取作品列表
  if (path === '/api/works' && method === 'GET') {
    try {
      const kvService = new KVService(env.MY_KV);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);

      // 获取所有作品键
      const workKeys = await kvService.list('work:');
      const works: Work[] = [];

      // 获取所有作品
      for (const key of workKeys) {
        const work = await kvService.get<Work>(key);
        if (work) {
          works.push(work);
        }
      }

      // 按创建时间倒序排序
      works.sort((a, b) => b.createdAt - a.createdAt);

      // 分页
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedWorks = works.slice(start, end);

      return createPaginatedResponse(paginatedWorks, works.length, page, limit);
    } catch (error) {
      console.error('Get works error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // 获取 Top 作品（按投票数排序）
  if (path === '/api/works/top' && method === 'GET') {
    try {
      const kvService = new KVService(env.MY_KV);
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);

      // 获取所有作品
      const workKeys = await kvService.list('work:');
      const worksWithVotes: Array<Work & { voteCount: number }> = [];

      // 使用 Durable Objects 获取投票数
      const voteCounterService = new VoteCounterService(env);
      
      // 检查是否有作品
      if (workKeys.length === 0) {
        return createSuccessResponse({
          items: [],
          total: 0,
        });
      }
      
      for (const key of workKeys) {
        try {
          const work = await kvService.get<Work>(key);
          if (work) {
            try {
              const voteCount = await voteCounterService.getCount(work.id);
              worksWithVotes.push({ ...work, voteCount });
            } catch (voteError: any) {
              console.error(`Get vote count error for work ${work.id}:`, voteError);
              // 如果获取投票数失败，使用 0
              worksWithVotes.push({ ...work, voteCount: 0 });
            }
          }
        } catch (workError: any) {
          console.error(`Error processing work key ${key}:`, workError);
          // 继续处理下一个作品
        }
      }

      // 按投票数倒序排序
      worksWithVotes.sort((a, b) => b.voteCount - a.voteCount);

      // 取前 N 名
      const topWorks = worksWithVotes.slice(0, limit);

      return createSuccessResponse({
        items: topWorks,
        total: topWorks.length,
      });
    } catch (error: any) {
      console.error('Get top works error:', error);
      return createErrorResponse(
        error.message || 'Internal server error',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  // 获取作品详情
  const workDetailMatch = path.match(/^\/api\/works\/([^/]+)$/);
  if (workDetailMatch && method === 'GET') {
    const workId = workDetailMatch[1];
    // TODO: 实现获取作品详情逻辑
    return createErrorResponse('Not implemented', 'NOT_IMPLEMENTED', 501);
  }

  // 删除作品
  const workDeleteMatch = path.match(/^\/api\/works\/([^/]+)$/);
  if (workDeleteMatch && method === 'DELETE') {
    try {
      const workId = workDeleteMatch[1];
      const kvService = new KVService(env.MY_KV);

      // 1. 验证用户身份（必须是管理员）
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401);
      }

      const token = authHeader.substring(7);
      const session = await kvService.get<UserSession>(`session:${token}`);

      if (!session) {
        return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401);
      }

      // 检查 token 是否过期
      if (session.expiresAt < Date.now()) {
        await kvService.delete(`session:${token}`);
        return createErrorResponse('Token expired', 'TOKEN_EXPIRED', 401);
      }

      // 验证是否为管理员
      if (session.userInfo.role !== 'admin') {
        return createErrorResponse('Forbidden: Admin only', 'FORBIDDEN', 403);
      }

      // 2. 获取作品信息
      const workKey = `work:${workId}`;
      const work = await kvService.get<Work>(workKey);

      if (!work) {
        return createErrorResponse('Work not found', 'NOT_FOUND', 404);
      }

      // 3. 删除作品相关的所有数据
      // 删除作品记录
      await kvService.delete(workKey);

      // 删除投票计数
      const voteCountKey = `vote:count:${workId}`;
      await kvService.delete(voteCountKey);

      // 删除所有用户的投票记录（遍历所有用户）
      const userVoteKeys = await kvService.list(`vote:user:`);
      for (const key of userVoteKeys) {
        const userVotes = await kvService.get<string[]>(key);
        if (userVotes && userVotes.includes(workId)) {
          const updatedVotes = userVotes.filter(id => id !== workId);
          if (updatedVotes.length === 0) {
            await kvService.delete(key);
          } else {
            await kvService.set(key, updatedVotes);
          }
        }
      }

      // 从用户的作品索引中删除
      const userWorksKey = `user_works:${work.userId}`;
      const userWorks = await kvService.get<string[]>(userWorksKey);
      if (userWorks) {
        const updatedWorks = userWorks.filter(id => id !== workId);
        if (updatedWorks.length === 0) {
          await kvService.delete(userWorksKey);
        } else {
          await kvService.set(userWorksKey, updatedWorks);
        }
      }

      // 从全局作品索引中删除
      const allWorksKey = 'all_works';
      const allWorks = await kvService.get<string[]>(allWorksKey);
      if (allWorks) {
        const updatedAllWorks = allWorks.filter(id => id !== workId);
        await kvService.set(allWorksKey, updatedAllWorks);
      }

      // 注意：OSS 文件删除需要调用 OSS SDK，这里暂时跳过
      // 在实际生产环境中，应该调用 OSS SDK 删除文件
      // await ossService.deleteFile(work.fileName);

      return createSuccessResponse({ success: true, message: '作品删除成功' });
    } catch (error) {
      console.error('Delete work error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  return createErrorResponse('Not Found', 'NOT_FOUND', 404);
}
