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
      // scope: 授权范围，多个权限用空格分隔（URLSearchParams 会自动编码空格为 %20）
      // - openid: 基础权限，用于获取用户 AccessToken
      // - Contact.User.Read: 读取用户通讯录个人信息权限（调用 /v1.0/contact/users/me 接口必需）
      scope: 'openid Contact.User.Read',
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
   * 通过 authCode 获取用户信息（新 OAuth2 接口）
   * 参考官方文档：https://open.dingtalk.com/document/development/obtain-identity-credentials
   */
  async getUserInfoByAuthCode(authCode: string): Promise<DingTalkUser> {
    // 1. 使用 authCode 获取用户 access_token
    // 注意：新 OAuth2 接口使用 api.dingtalk.com，不是 oapi.dingtalk.com
    // 参考：https://open-dingtalk.github.io/developerpedia/docs/develop/permission/token/browser/get_user_app_token_browser
    const tokenUrl = 'https://api.dingtalk.com/v1.0/oauth2/userAccessToken';
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: this.appKey,
        clientSecret: this.appSecret,
        code: authCode,
        grantType: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get user access token: HTTP ${tokenResponse.status}, ${errorText}`);
    }

    const tokenData = await tokenResponse.json() as {
      accessToken?: string;
      refreshToken?: string;
      expireIn?: number;
      errmsg?: string;
      errcode?: number;
    };

    // 检查错误码（钉钉接口可能返回 errcode 或直接返回错误）
    if (tokenData.errcode !== undefined && tokenData.errcode !== 0) {
      throw new Error(
        `Failed to get user access token: errcode=${tokenData.errcode}, errmsg=${tokenData.errmsg || 'Unknown error'}`
      );
    }

    if (!tokenData.accessToken) {
      throw new Error(
        `Failed to get user access token: No accessToken in response. Response: ${JSON.stringify(tokenData)}`
      );
    }

    const userAccessToken = tokenData.accessToken;

    // 2. 使用用户 access_token 获取用户信息
    // 注意：新接口使用 api.dingtalk.com，不是 oapi.dingtalk.com
    const userInfoUrl = 'https://api.dingtalk.com/v1.0/contact/users/me';
    
    const userResponse = await fetch(userInfoUrl, {
      method: 'GET',
      headers: {
        'x-acs-dingtalk-access-token': userAccessToken,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      throw new Error(`Failed to get user info: HTTP ${userResponse.status}, ${errorText}`);
    }

    const userData = await userResponse.json() as {
      unionId?: string;
      nick?: string;
      avatarUrl?: string;
      mobile?: string;
      email?: string;
      errmsg?: string;
      errcode?: number;
      code?: string;
      message?: string;
    };

    // 检查错误响应（钉钉新接口成功时不返回 errcode，失败时可能返回 code 或 errcode）
    if (userData.code && userData.code !== '0' && userData.code !== 'OK') {
      throw new Error(
        `Failed to get user info: code=${userData.code}, message=${userData.message || 'Unknown error'}`
      );
    }

    if (userData.errcode !== undefined && userData.errcode !== 0) {
      throw new Error(
        `Failed to get user info: errcode=${userData.errcode}, errmsg=${userData.errmsg || 'Unknown error'}`
      );
    }

    // 验证响应格式（成功响应至少应该有 unionId 或 nick）
    if (!userData.unionId && !userData.nick) {
      throw new Error('Failed to get user info: Invalid response format');
    }

    // 3. 返回用户信息
    // 注意：新接口返回 unionId，不是 userid
    return {
      userid: userData.unionId || '', // 新接口使用 unionId
      name: userData.nick || '未知用户',
      avatar: userData.avatarUrl,
      mobile: userData.mobile,
      email: userData.email,
    };
  }

  /**
   * 通过 code 获取用户信息（旧接口，保留兼容性）
   * @deprecated 使用 getUserInfoByAuthCode 代替
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
