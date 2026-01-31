/**
 * 投票相关路由处理
 */

import type { Env } from '../types/env';
import { createErrorResponse, createSuccessResponse } from '../utils/response';
import { KVService } from '../services/kv';
import { VoteCounterService } from '../services/vote-counter';
import type { VoteRequest, VoteRecord } from '../types/vote';

export async function handleVoteRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // 获取认证 token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401);
  }
  const token = authHeader.substring(7);

  // 验证 token 并获取用户信息
  const kvService = new KVService(env.MY_KV);
  const session = await kvService.get<any>(`session:${token}`);
  if (!session || session.expiresAt < Date.now()) {
    return createErrorResponse('Token expired', 'TOKEN_EXPIRED', 401);
  }
  const userId = session.userId;

  // 投票
  if (path === '/api/vote' && method === 'POST') {
    try {
      const body: VoteRequest = await request.json();
      const { workId } = body;

      if (!workId) {
        return createErrorResponse('workId is required', 'INVALID_REQUEST', 400);
      }

      // 获取作品信息
      const work = await kvService.get<any>(`work:${workId}`);
      if (!work) {
        return createErrorResponse('Work not found', 'WORK_NOT_FOUND', 404);
      }

      // 检查是否为自己的作品
      if (work.userId === userId) {
        return createErrorResponse('Cannot vote for your own work', 'CANNOT_VOTE_OWN', 400);
      }

      // 使用 Durable Objects 检查是否已投票（原子性操作）
      const voteCounterService = new VoteCounterService(env);
      const hasVotedResult = await voteCounterService.hasVoted(workId, userId);
      if (hasVotedResult.hasVoted) {
        return createErrorResponse('Already voted', 'ALREADY_VOTED', 400);
      }

      // 检查用户已投票数量（最多10个）- 仍使用 KV 查询用户的所有投票
      const userVotes = await kvService.list(`vote:user:${userId}:`);
      if (userVotes.length >= 10) {
        return createErrorResponse('Maximum votes reached (10)', 'MAX_VOTES_REACHED', 400);
      }

      // 使用 Durable Objects 进行投票（原子性操作）
      const voteResult = await voteCounterService.vote(workId, userId);
      if (!voteResult.success) {
        return createErrorResponse(voteResult.error || 'Vote failed', 'VOTE_FAILED', 400);
      }

      // 在 KV 中保存投票记录（用于查询用户的所有投票）
      const voteRecord: VoteRecord = {
        workId,
        userId,
        createdAt: Date.now(),
      };
      await kvService.set(`vote:${workId}:${userId}`, voteRecord);
      await kvService.set(`vote:user:${userId}:${workId}`, voteRecord);

      return createSuccessResponse({ success: true, voteCount: voteResult.voteCount });
    } catch (error) {
      console.error('Vote error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // 取消投票
  if (path === '/api/vote' && method === 'DELETE') {
    try {
      const workId = url.searchParams.get('workId');
      if (!workId) {
        return createErrorResponse('workId is required', 'INVALID_REQUEST', 400);
      }

      // 使用 Durable Objects 取消投票（原子性操作）
      const voteCounterService = new VoteCounterService(env);
      const unvoteResult = await voteCounterService.unvote(workId, userId);
      if (!unvoteResult.success) {
        return createErrorResponse(unvoteResult.error || 'Unvote failed', 'UNVOTE_FAILED', 400);
      }

      // 删除 KV 中的投票记录
      await kvService.delete(`vote:${workId}:${userId}`);
      await kvService.delete(`vote:user:${userId}:${workId}`);

      return createSuccessResponse({ success: true, voteCount: unvoteResult.voteCount });
    } catch (error) {
      console.error('Unvote error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // 获取用户投票数量
  if (path === '/api/vote/user/count' && method === 'GET') {
    try {
      const userVotes = await kvService.list(`vote:user:${userId}:`);
      return createSuccessResponse({
        count: userVotes.length,
      });
    } catch (error) {
      console.error('Get user vote count error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // 获取投票统计
  if (path === '/api/vote/stats' && method === 'GET') {
    try {
      const workId = url.searchParams.get('workId');
      if (!workId) {
        return createErrorResponse('workId is required', 'INVALID_REQUEST', 400);
      }

      // 使用 Durable Objects 获取投票数和投票状态
      const voteCounterService = new VoteCounterService(env);
      
      try {
        const voteCount = await voteCounterService.getCount(workId);
        const hasVotedResult = await voteCounterService.hasVoted(workId, userId);

        return createSuccessResponse({
          workId,
          count: voteCount, // 使用 count 而不是 voteCount，与管理页面期望的字段名一致
          hasVoted: hasVotedResult.hasVoted,
        });
      } catch (doError: any) {
        console.error(`Durable Objects error for work ${workId}:`, doError);
        // 如果 Durable Objects 调用失败，返回 0
        return createSuccessResponse({
          workId,
          count: 0,
          hasVoted: false,
        });
      }
    } catch (error: any) {
      console.error('Get vote stats error:', error);
      return createErrorResponse(
        error.message || 'Internal server error',
        'INTERNAL_ERROR',
        500
      );
    }
  }

  // 获取作品的投票用户列表（仅管理员）
  if (path === '/api/vote/users' && method === 'GET') {
    try {
      // 验证是否为管理员
      if (session.userInfo?.role !== 'admin') {
        return createErrorResponse('Forbidden: Admin only', 'FORBIDDEN', 403);
      }

      const workId = url.searchParams.get('workId');
      if (!workId) {
        return createErrorResponse('workId is required', 'INVALID_REQUEST', 400);
      }

      // 使用 Durable Objects 获取投票用户列表
      const voteCounterService = new VoteCounterService(env);
      const votersData = await voteCounterService.getVoters(workId);

      // 获取用户信息
      const voters: Array<{ userId: string; userName: string; createdAt: number }> = [];
      for (const voter of votersData) {
        const userKey = `user:${voter.userId}`;
        const userInfo = await kvService.get<any>(userKey);
        
        voters.push({
          userId: voter.userId,
          userName: userInfo?.name || '未知用户',
          createdAt: voter.createdAt,
        });
      }

      return createSuccessResponse({
        workId,
        voters,
        count: voters.length,
      });
    } catch (error) {
      console.error('Get vote users error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  return createErrorResponse('Not Found', 'NOT_FOUND', 404);
}
