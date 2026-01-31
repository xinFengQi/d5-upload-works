/**
 * 投票计数器 Durable Object
 * 用于保证投票计数的原子性和强一致性
 */

export class VoteCounter {
  private state: DurableObjectState;
  private env: any; // Durable Objects 中的 env 可能不包含所有字段
  
  // 内存缓存（用于快速访问）
  private voteCount: number = 0;
  private voters: Map<string, { userId: string; createdAt: number }> = new Map();
  private initialized: boolean = false;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  /**
   * 初始化：从存储加载数据
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 从存储加载投票数
      const count = await this.state.storage.get<number>('voteCount');
      this.voteCount = count || 0;

      // 从存储加载投票记录
      const votersData = await this.state.storage.get<Map<string, { userId: string; createdAt: number }>>('voters');
      if (votersData) {
        this.voters = new Map(Object.entries(votersData));
      }

      this.initialized = true;
    } catch (error) {
      console.error('VoteCounter initialize error:', error);
      // 如果加载失败，使用默认值
      this.voteCount = 0;
      this.voters = new Map();
      this.initialized = true;
    }
  }

  /**
   * 处理 HTTP 请求
   */
  async fetch(request: Request): Promise<Response> {
    await this.initialize();

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 投票
    if (path === '/vote' && method === 'POST') {
      return this.handleVote(request);
    }

    // 取消投票
    if (path === '/vote' && method === 'DELETE') {
      return this.handleUnvote(request);
    }

    // 获取投票数
    if (path === '/count' && method === 'GET') {
      return this.handleGetCount();
    }

    // 检查用户是否已投票
    if (path === '/has-voted' && method === 'GET') {
      return this.handleHasVoted(request);
    }

    // 获取投票用户列表
    if (path === '/voters' && method === 'GET') {
      return this.handleGetVoters();
    }

    return new Response('Not Found', { status: 404 });
  }

  /**
   * 处理投票
   */
  private async handleVote(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { userId: string };
      const { userId } = body;

      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: 'userId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 检查是否已投票
      if (this.voters.has(userId)) {
        return new Response(JSON.stringify({ success: false, error: 'Already voted' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 原子性操作：增加投票数并记录投票者
      const now = Date.now();
      this.voteCount++;
      this.voters.set(userId, { userId, createdAt: now });

      // 持久化到存储
      await this.state.storage.put('voteCount', this.voteCount);
      await this.state.storage.put('voters', Object.fromEntries(this.voters));

      return new Response(JSON.stringify({ 
        success: true, 
        voteCount: this.voteCount 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('VoteCounter handleVote error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * 处理取消投票
   */
  private async handleUnvote(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: 'userId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 检查是否已投票
      if (!this.voters.has(userId)) {
        return new Response(JSON.stringify({ success: false, error: 'Vote not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 原子性操作：减少投票数并删除投票记录
      this.voteCount = Math.max(0, this.voteCount - 1);
      this.voters.delete(userId);

      // 持久化到存储
      await this.state.storage.put('voteCount', this.voteCount);
      await this.state.storage.put('voters', Object.fromEntries(this.voters));

      return new Response(JSON.stringify({ 
        success: true, 
        voteCount: this.voteCount 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('VoteCounter handleUnvote error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * 获取投票数
   */
  private async handleGetCount(): Promise<Response> {
    return new Response(JSON.stringify({ 
      success: true, 
      count: this.voteCount 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * 检查用户是否已投票
   */
  private async handleHasVoted(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: 'userId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasVoted = this.voters.has(userId);
      const voteRecord = hasVoted ? this.voters.get(userId) : null;

      return new Response(JSON.stringify({ 
        success: true, 
        hasVoted,
        createdAt: voteRecord?.createdAt || null
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('VoteCounter handleHasVoted error:', error);
      return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * 获取投票用户列表
   */
  private async handleGetVoters(): Promise<Response> {
    const votersList = Array.from(this.voters.values())
      .sort((a, b) => b.createdAt - a.createdAt);

    return new Response(JSON.stringify({ 
      success: true, 
      voters: votersList,
      count: votersList.length
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
