/**
 * 投票计数器服务封装
 * 封装 Durable Objects 的调用
 */

import type { Env } from '../types/env';
import { VoteCounter } from '../durable-objects/vote-counter';

export class VoteCounterService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * 获取投票计数器的 Durable Object 实例
   */
  private getVoteCounter(workId: string): DurableObjectStub {
    // 检查 Durable Objects 是否可用
    if (!this.env.VOTE_COUNTER) {
      throw new Error('VOTE_COUNTER Durable Object namespace is not available. Please deploy the Worker first.');
    }
    
    // 使用 workId 作为 Durable Object 的 ID
    // 这样每个作品都有自己独立的计数器实例
    const id = this.env.VOTE_COUNTER.idFromName(workId);
    return this.env.VOTE_COUNTER.get(id);
  }

  /**
   * 投票
   */
  async vote(workId: string, userId: string): Promise<{ success: boolean; voteCount?: number; error?: string }> {
    try {
      const stub = this.getVoteCounter(workId);
      const response = await stub.fetch('https://vote-counter.internal/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      return await response.json();
    } catch (error) {
      console.error('VoteCounterService vote error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * 取消投票
   */
  async unvote(workId: string, userId: string): Promise<{ success: boolean; voteCount?: number; error?: string }> {
    try {
      const stub = this.getVoteCounter(workId);
      const response = await stub.fetch(`https://vote-counter.internal/vote?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      return await response.json();
    } catch (error) {
      console.error('VoteCounterService unvote error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * 获取投票数
   */
  async getCount(workId: string): Promise<number> {
    try {
      const stub = this.getVoteCounter(workId);
      
      // 添加超时处理（5秒）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await stub.fetch('https://vote-counter.internal/count', {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json() as { success: boolean; count?: number };
        return data.success ? (data.count || 0) : 0;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error(`VoteCounterService getCount timeout for work ${workId}`);
        } else {
          throw fetchError;
        }
        return 0;
      }
    } catch (error: any) {
      console.error(`VoteCounterService getCount error for work ${workId}:`, error);
      return 0;
    }
  }

  /**
   * 检查用户是否已投票
   */
  async hasVoted(workId: string, userId: string): Promise<{ hasVoted: boolean; createdAt?: number }> {
    try {
      const stub = this.getVoteCounter(workId);
      const response = await stub.fetch(`https://vote-counter.internal/has-voted?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
      });

      const data = await response.json() as { success: boolean; hasVoted?: boolean; createdAt?: number };
      return {
        hasVoted: data.success ? (data.hasVoted || false) : false,
        createdAt: data.createdAt || undefined,
      };
    } catch (error) {
      console.error('VoteCounterService hasVoted error:', error);
      return { hasVoted: false };
    }
  }

  /**
   * 获取投票用户列表
   */
  async getVoters(workId: string): Promise<Array<{ userId: string; createdAt: number }>> {
    try {
      const stub = this.getVoteCounter(workId);
      const response = await stub.fetch('https://vote-counter.internal/voters', {
        method: 'GET',
      });

      const data = await response.json() as { success: boolean; voters?: Array<{ userId: string; createdAt: number }> };
      return data.success ? (data.voters || []) : [];
    } catch (error) {
      console.error('VoteCounterService getVoters error:', error);
      return [];
    }
  }
}
