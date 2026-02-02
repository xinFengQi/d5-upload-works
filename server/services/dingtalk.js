/**
 * 钉钉认证服务（Node 环境）
 */
class DingTalkService {
  constructor(config) {
    this.appKey = config.DINGTALK_APP_KEY;
    this.appSecret = config.DINGTALK_APP_SECRET;
    this.redirectUri = config.DINGTALK_REDIRECT_URI;
  }

  getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: this.appKey,
      response_type: 'code',
      scope: 'openid Contact.User.Read',
      redirect_uri: this.redirectUri,
      prompt: 'consent',
      ...(state && { state }),
    });
    return `https://login.dingtalk.com/oauth2/auth?${params.toString()}`;
  }

  async getUserInfoByAuthCode(authCode) {
    const tokenUrl = 'https://api.dingtalk.com/v1.0/oauth2/userAccessToken';
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.appKey,
        clientSecret: this.appSecret,
        code: authCode,
        grantType: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`Failed to get user access token: HTTP ${tokenResponse.status}, ${text}`);
    }
    const tokenData = await tokenResponse.json();
    if (tokenData.errcode !== undefined && tokenData.errcode !== 0) {
      throw new Error(`Failed to get user access token: errcode=${tokenData.errcode}, ${tokenData.errmsg || ''}`);
    }
    if (!tokenData.accessToken) {
      throw new Error('Failed to get user access token: No accessToken in response');
    }

    const userInfoUrl = 'https://api.dingtalk.com/v1.0/contact/users/me';
    const userResponse = await fetch(userInfoUrl, {
      method: 'GET',
      headers: { 'x-acs-dingtalk-access-token': tokenData.accessToken },
    });
    if (!userResponse.ok) {
      const text = await userResponse.text();
      throw new Error(`Failed to get user info: HTTP ${userResponse.status}, ${text}`);
    }
    const userData = await userResponse.json();
    // 打印钉钉返回的全部用户信息（调试用）
    console.log('[DingTalk] 钉钉 /v1.0/contact/users/me 完整返回:', JSON.stringify(userData, null, 2));
    if (userData.code && userData.code !== '0' && userData.code !== 'OK') {
      throw new Error(`Failed to get user info: code=${userData.code}, ${userData.message || ''}`);
    }
    if (userData.errcode !== undefined && userData.errcode !== 0) {
      throw new Error(`Failed to get user info: errcode=${userData.errcode}, ${userData.errmsg || ''}`);
    }
    if (!userData.unionId && !userData.nick) {
      throw new Error('Failed to get user info: Invalid response format');
    }
    return {
      userid: userData.unionId || '',
      name: userData.nick || '未知用户',
      avatar: userData.avatarUrl,
      mobile: userData.mobile,
      email: userData.email,
    };
  }
}

module.exports = { DingTalkService };
