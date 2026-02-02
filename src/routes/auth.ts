/**
 * 认证相关路由处理
 */

import type { Env } from '../types/env';
import { createErrorResponse, createSuccessResponse } from '../utils/response';
import { DingTalkService } from '../services/dingtalk';
import { KVService } from '../services/kv';
import { generateToken } from '../utils/crypto';
import { isDevelopment } from '../utils/env';
import type { UserSession, DingTalkUser } from '../types/user';

/**
 * 生成模拟用户信息
 */
function generateMockUser(userName?: string): DingTalkUser {
  const names = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
    '郑十一', '王十二', '冯十三', '陈十四', '褚十五', '卫十六',
    '测试用户1', '测试用户2', '开发人员', '设计师', '产品经理'
  ];
  
  const randomName = userName || names[Math.floor(Math.random() * names.length)];
  const userId = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    userid: userId,
    name: randomName,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomName}`,
    mobile: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    email: `${randomName.toLowerCase().replace(/\s/g, '')}@d5techs.com`,
  };
}

export async function handleAuthRoutes(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const kvService = new KVService(env.MY_KV);
  const isMock = isDevelopment(env, request);

  // 钉钉登录入口（重定向到钉钉）
  if (path === '/auth/dingtalk' && method === 'GET') {
    try {
      // 生成 state 并存储（用于防止 CSRF 攻击）
      const state = generateToken();
      await kvService.set(`auth:state:${state}`, { createdAt: Date.now() }, 600); // 10分钟过期

      // 直接重定向到钉钉登录
      const dingtalkService = new DingTalkService(env);
      const authUrl = dingtalkService.getAuthUrl(state);
      return Response.redirect(authUrl, 302);
    } catch (error) {
      console.error('DingTalk auth error:', error);
      return createErrorResponse('Failed to initiate login', 'AUTH_ERROR', 500);
    }
  }

  // 钉钉登录回调
  if (path === '/auth/callback' && method === 'GET') {
    try {
      // 钉钉新 OAuth2 接口返回的是 authCode，不是 code
      const authCode = url.searchParams.get('authCode') || url.searchParams.get('code');
      const state = url.searchParams.get('state');
      // URLSearchParams.get() 会自动解码，直接使用即可
      const mockUserName = url.searchParams.get('mock_user');

      if (!authCode) {
        return createErrorResponse('Missing authCode parameter', 'INVALID_REQUEST', 400);
      }

      // 验证 state（防止 CSRF 攻击）
      if (state) {
        const stateData = await kvService.get(`auth:state:${state}`);
        if (!stateData) {
          return createErrorResponse('Invalid state parameter', 'INVALID_STATE', 400);
        }
        // 删除已使用的 state
        await kvService.delete(`auth:state:${state}`);
      }

      let userInfo: DingTalkUser;

      // 检查是否为模拟登录（通过 code 前缀判断，最可靠）
      if (authCode.startsWith('mock_code_')) {
        // 模拟登录：生成模拟用户信息
        const decodedUserName = mockUserName ? decodeURIComponent(mockUserName) : undefined;
        userInfo = generateMockUser(decodedUserName);
        userInfo.role = 'user';
        console.log('Mock login - raw userName:', mockUserName);
        console.log('Mock login - decoded userName:', decodedUserName);
        console.log('Mock login - userInfo:', userInfo);
      } else {
        // 真实钉钉登录：通过 authCode 获取用户信息
        console.log('Real DingTalk login - authCode:', authCode.substring(0, 20) + '...');
        console.log('isDevelopment:', isMock);
        
        const dingtalkService = new DingTalkService(env);
        try {
          userInfo = await dingtalkService.getUserInfoByAuthCode(authCode);
          userInfo.role = 'user';
          console.log('DingTalk user info:', {
            userid: userInfo.userid,
            name: userInfo.name,
            hasAvatar: !!userInfo.avatar,
          });
        } catch (error) {
          console.error('Failed to get DingTalk user info:', error);
          // 钉钉登录失败，不允许 fallback 到模拟用户
          throw new Error(`钉钉登录失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 生成 session token
      const token = generateToken();
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天过期

      // 创建用户会话
      const session: UserSession = {
        userId: userInfo.userid,
        userInfo,
        createdAt: Date.now(),
        expiresAt,
      };

      // 存储会话到 KV
      await kvService.set(`session:${token}`, session, 7 * 24 * 60 * 60); // 7天过期

      // 存储用户信息（永久存储，用于快速查询）
      await kvService.set(`user:${userInfo.userid}`, userInfo);

      // 重定向到首页，并携带 token
      const redirectUrl = new URL('/', url.origin);
      redirectUrl.searchParams.set('token', token);

      return Response.redirect(redirectUrl.toString(), 302);
    } catch (error) {
      console.error('DingTalk callback error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('Error details:', {
        message: errorMessage,
        stack: errorStack,
        url: url.toString(),
        searchParams: Object.fromEntries(url.searchParams),
      });
      return createErrorResponse(
        `Failed to complete login: ${errorMessage}`,
        'CALLBACK_ERROR',
        500
      );
    }
  }

  // 获取当前用户信息
  if (path === '/auth/me' && method === 'GET') {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401);
      }

      const token = authHeader.substring(7);
      const session = await kvService.get<UserSession>(`session:${token}`);

      if (!session) {
        return createErrorResponse('Invalid token', 'INVALID_TOKEN', 401);
      }

      // 检查 token 是否过期
      if (session.expiresAt < Date.now()) {
        await kvService.delete(`session:${token}`);
        return createErrorResponse('Token expired', 'TOKEN_EXPIRED', 401);
      }

      return createSuccessResponse(session.userInfo);
    } catch (error) {
      console.error('Get user info error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // 管理员登录
  if (path === '/auth/admin' && method === 'POST') {
    try {
      const body = await request.json() as { password?: string };
      
      if (!body.password) {
        return createErrorResponse('Missing password', 'INVALID_REQUEST', 400);
      }

      // 调试日志：检查环境变量（不输出实际密码）
      const hasAdminPassword = !!env.ADMIN_PASSWORD;
      const adminPasswordLength = env.ADMIN_PASSWORD ? env.ADMIN_PASSWORD.length : 0;
      const inputPasswordLength = body.password ? body.password.length : 0;
      const passwordsMatch = body.password === env.ADMIN_PASSWORD;
      
      // 详细的调试日志（用于排查 Dashboard Variables 问题）
      console.log('Admin login attempt:', {
        hasAdminPassword,
        adminPasswordLength,
        inputPasswordLength,
        passwordsMatch,
        // 检查所有环境变量（不输出实际值）
        envKeys: Object.keys(env).filter(key => key.includes('ADMIN') || key.includes('PASSWORD')),
        adminPasswordType: typeof env.ADMIN_PASSWORD,
        adminPasswordValue: env.ADMIN_PASSWORD ? '[REDACTED]' : 'undefined',
      });

      // 验证管理员密码
      if (!passwordsMatch) {
        // 返回详细的调试信息（仅在生产环境调试时使用）
        return createErrorResponse(
          'Invalid password', 
          'INVALID_PASSWORD', 
          401,
          {
            debug: {
              hasAdminPassword,
              adminPasswordLength,
              inputPasswordLength,
              // 注意：不返回实际密码值
            }
          }
        );
      }

      // 生成 session token
      const token = generateToken();
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天过期

      // 创建管理员用户信息
      const adminUser: DingTalkUser = {
        userid: 'admin',
        name: '管理员',
        role: 'admin',
      };

      // 创建用户会话
      const session: UserSession = {
        userId: 'admin',
        userInfo: adminUser,
        createdAt: Date.now(),
        expiresAt,
      };

      // 存储会话到 KV
      await kvService.set(`session:${token}`, session, 7 * 24 * 60 * 60); // 7天过期

      // 存储用户信息（永久存储，用于快速查询）
      await kvService.set(`user:admin`, adminUser);

      return createSuccessResponse({ token });
    } catch (error) {
      console.error('Admin login error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  // 退出登录
  if (path === '/auth/logout' && method === 'POST') {
    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401);
      }

      const token = authHeader.substring(7);
      
      // 删除 session
      await kvService.delete(`session:${token}`);

      return createSuccessResponse({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      return createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
    }
  }

  return createErrorResponse('Not Found', 'NOT_FOUND', 404);
}
