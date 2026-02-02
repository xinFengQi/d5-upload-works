/**
 * 钉钉认证服务
 */

import type { Env } from '../types/env';
import type { DingTalkUser } from '../types/user';

export class DingTalkService {
  private appKey: string;
  private appSecret: string;
  private redirectUri: string;

  constructor(env: Env) {
    this.appKey = env.DINGTALK_APP_KEY;
    this.appSecret = env.DINGTALK_APP_SECRET;
    this.redirectUri = env.DINGTALK_REDIRECT_URI;
  }

  /**
   * 获取钉钉登录授权 URL
   * 参考官方文档：https://open.dingtalk.com/document/development/obtain-identity-credentials
   * 
   * 注意：钉钉 OAuth2 接口参数要求：
   * - 授权端点：https://login.dingtalk.com/oauth2/auth
   * - client_id: 应用标识（企业内部应用使用 AppKey，第三方企业应用使用 SuiteKey）
   * - response_type: 固定为 'code'
   * - scope: 授权范围，支持 'openid' 或 'openid corpid'（空格分隔，需要 URL 编码）
   * - redirect_uri: 回调地址，必须在钉钉开放平台配置且完全匹配（包括协议、域名、端口、路径）
   * - prompt: 值为 'consent' 时，会进入授权确认页
   * - state: 状态参数，用于防止 CSRF 攻击（可选）
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.appKey, // 使用 client_id 而不是 appid
      response_type: 'code',
      scope: 'openid', // 使用 openid，如果需要组织ID可以使用 'openid corpid'
      redirect_uri: this.redirectUri,
      prompt: 'consent', // 进入授权确认页
      ...(state && { state }), // state 是可选的
    });

    return `https://login.dingtalk.com/oauth2/auth?${params.toString()}`;
  }

  /**
   * 获取企业内部应用的 access_token
   * 注意：钉钉 API 要求在 URL 中传递 appsecret，这是 API 的限制
   * 确保日志系统不记录包含敏感信息的 URL
   */
  async getAccessToken(): Promise<string> {
    // 注意：钉钉 API 要求在 URL 中传递 appsecret，无法避免
    // 确保日志系统不记录包含敏感信息的 URL
    const url = `https://oapi.dingtalk.com/gettoken?appkey=${this.appKey}&appsecret=${this.appSecret}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get access token: HTTP ${response.status}`);
    }

    const data = await response.json() as { access_token?: string; errmsg?: string; errcode?: number };

    if (data.errcode !== 0 || !data.access_token) {
      throw new Error(`Failed to get access token: ${data.errmsg || 'Unknown error'}`);
    }

    return data.access_token;
  }

  /**
   * 通过 code 获取用户信息（企业内部应用）
   */
  async getUserInfoByCode(code: string): Promise<DingTalkUser> {
    // 先获取 access_token
    const accessToken = await this.getAccessToken();

    // 通过 code 获取用户信息
    const url = `https://oapi.dingtalk.com/topapi/v2/user/getuserinfo?access_token=${accessToken}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: HTTP ${response.status}`);
    }

    const data = await response.json() as {
      result?: { userid?: string };
      errmsg?: string;
      errcode?: number;
    };

    if (data.errcode !== 0 || !data.result || !data.result.userid) {
      throw new Error(`Failed to get user info: ${data.errmsg || 'Unknown error'}`);
    }

    const userId = data.result.userid;

    // 获取用户详细信息
    return await this.getUserDetail(userId, accessToken);
  }

  /**
   * 获取用户详细信息
   */
  async getUserDetail(userId: string, accessToken: string): Promise<DingTalkUser> {
    const url = `https://oapi.dingtalk.com/topapi/v2/user/get?access_token=${accessToken}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userid: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get user detail: HTTP ${response.status}`);
    }

    const data = await response.json() as {
      result?: {
        userid?: string;
        name?: string;
        avatar?: string;
        mobile?: string;
        email?: string;
      };
      errmsg?: string;
      errcode?: number;
    };

    if (data.errcode !== 0 || !data.result) {
      throw new Error(`Failed to get user detail: ${data.errmsg || 'Unknown error'}`);
    }

    return {
      userid: data.result.userid || userId,
      name: data.result.name || '未知用户',
      avatar: data.result.avatar,
      mobile: data.result.mobile,
      email: data.result.email,
    };
  }

  /**
   * 通过 access_token 获取用户信息（兼容旧接口）
   */
  async getUserInfo(accessToken: string): Promise<DingTalkUser> {
    // 这个接口主要用于兼容，实际使用 getUserInfoByCode
    throw new Error('Use getUserInfoByCode instead');
  }

  /**
   * 生成随机 state
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
