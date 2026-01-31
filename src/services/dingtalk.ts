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
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      appid: this.appKey,
      response_type: 'code',
      scope: 'openid',
      redirect_uri: this.redirectUri,
      state: state || this.generateState(),
    });

    return `https://oapi.dingtalk.com/connect/oauth2/sns_authorize?${params.toString()}`;
  }

  /**
   * 获取企业内部应用的 access_token
   */
  async getAccessToken(): Promise<string> {
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
