/**
 * 认证相关路由
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { DingTalkService } = require('../services/dingtalk');
const { generateToken } = require('../utils/crypto');
const { createSuccessResponse, createErrorResponse, sendJson } = require('../utils/response');

const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 天
const STATE_TTL_SEC = 600; // 10 分钟

/** 仅允许重定向到配置的白名单 origin，防止开放重定向 + token 泄露 */
function resolveRedirectOrigin(req) {
  const config = req.app.locals.config;
  const backendHost = `${req.protocol}://${req.get('host')}`;
  const raw = req.query.frontend_origin;
  if (!raw || typeof raw !== 'string') return backendHost;
  const candidate = raw.trim();
  if (!/^https?:\/\/[^/]+$/.test(candidate)) return backendHost;
  const allowed = (config?.ALLOWED_REDIRECT_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length > 0 && allowed.includes(candidate.toLowerCase())) return candidate;
  // 开发环境：若未配置白名单，允许请求里带的 localhost/127.0.0.1 前端地址，避免回调跳到后端端口白屏
  if (isDevelopment(config, req) && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(candidate)) return candidate;
  return backendHost;
}

function isDevelopment(config, req) {
  if (config.ENVIRONMENT) {
    return ['development', 'dev'].includes(String(config.ENVIRONMENT).toLowerCase());
  }
  const host = req.get('host') || '';
  if (/localhost|127\.0\.0\.1/.test(host)) return true;
  if (config.DINGTALK_REDIRECT_URI && /localhost|127\.0\.0\.1/.test(config.DINGTALK_REDIRECT_URI)) return true;
  return false;
}

function generateMockUser(userName) {
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '测试用户1', '开发人员'];
  const name = userName || names[Math.floor(Math.random() * names.length)];
  const userId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    userid: userId,
    name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    mobile: `138${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`,
    email: `${name.toLowerCase().replace(/\s/g, '')}@d5techs.com`,
    role: 'user',
  };
}

// 钉钉登录入口（直接重定向，保留兼容）
router.get('/dingtalk', (req, res) => {
  try {
    const state = generateToken();
    const db = getDb();
    db.prepare(
      'INSERT OR REPLACE INTO auth_states (state, created_at) VALUES (?, ?)'
    ).run(state, Date.now());
    const dingtalk = new DingTalkService(req.app.locals.config);
    const authUrl = dingtalk.getAuthUrl(state);
    res.redirect(302, authUrl);
  } catch (err) {
    console.error('DingTalk auth error:', err);
    sendJson(res, createErrorResponse('Failed to initiate login', 'AUTH_ERROR', 500));
  }
});

// 获取钉钉登录 URL（前端先调此接口拿到 url 再重定向）
router.get('/dingtalk-url', (req, res) => {
  try {
    const state = generateToken();
    const db = getDb();
    db.prepare(
      'INSERT OR REPLACE INTO auth_states (state, created_at) VALUES (?, ?)'
    ).run(state, Date.now());
    const dingtalk = new DingTalkService(req.app.locals.config);
    const authUrl = dingtalk.getAuthUrl(state);
    sendJson(res, createSuccessResponse({ url: authUrl }));
  } catch (err) {
    console.error('DingTalk auth URL error:', err);
    sendJson(res, createErrorResponse('Failed to get login URL', 'AUTH_ERROR', 500));
  }
});

// 钉钉回调
router.get('/callback', async (req, res) => {
  try {
    const authCode = req.query.authCode || req.query.code;
    const state = req.query.state;
    const mockUserName = req.query.mock_user;

    if (!authCode) {
      return sendJson(res, createErrorResponse('Missing authCode parameter', 'INVALID_REQUEST', 400));
    }

    const db = getDb();
    if (state) {
      const row = db.prepare('SELECT 1 FROM auth_states WHERE state = ?').get(state);
      if (!row) {
        return sendJson(res, createErrorResponse('Invalid state parameter', 'INVALID_STATE', 400));
      }
      db.prepare('DELETE FROM auth_states WHERE state = ?').run(state);
    }

    let userInfo;
    const config = req.app.locals.config;
    const isMock = isDevelopment(config, req);

    if (authCode.startsWith('mock_code_')) {
      userInfo = generateMockUser(mockUserName ? decodeURIComponent(mockUserName) : undefined);
    } else {
      const dingtalk = new DingTalkService(config);
      try {
        userInfo = await dingtalk.getUserInfoByAuthCode(authCode);
        userInfo.role = 'user';
      } catch (err) {
        console.error('DingTalk getUserInfo error:', err);
        return sendJson(res, createErrorResponse(`钉钉登录失败: ${err.message}`, 'CALLBACK_ERROR', 500));
      }
    }

    const token = generateToken();
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_SEC * 1000;

    db.prepare(
      'INSERT OR REPLACE INTO users (userid, name, avatar, mobile, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      userInfo.userid,
      userInfo.name,
      userInfo.avatar || null,
      userInfo.mobile || null,
      userInfo.email || null,
      userInfo.role || 'user',
      now
    );
    db.prepare(
      'INSERT OR REPLACE INTO sessions (token, userid, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).run(token, userInfo.userid, expiresAt, now);

    const baseOrigin = resolveRedirectOrigin(req);
    const redirectUrl = new URL('/', baseOrigin);
    redirectUrl.searchParams.set('token', token);
    res.redirect(302, redirectUrl.toString());
  } catch (err) {
    console.error('Auth callback error:', err);
    sendJson(res, createErrorResponse(`Failed to complete login: ${err.message}`, 'CALLBACK_ERROR', 500));
  }
});

// 用 code/authCode 换 token（与 callback 同逻辑，返回 JSON，供前端直接带 code 进入首页时调用）
router.get('/exchange', async (req, res) => {
  try {
    const authCode = req.query.authCode || req.query.code;
    const state = req.query.state;
    const mockUserName = req.query.mock_user;

    if (!authCode) {
      return sendJson(res, createErrorResponse('Missing authCode or code parameter', 'INVALID_REQUEST', 400));
    }

    const db = getDb();
    if (state) {
      const row = db.prepare('SELECT 1 FROM auth_states WHERE state = ?').get(state);
      if (!row) {
        return sendJson(res, createErrorResponse('Invalid state parameter', 'INVALID_STATE', 400));
      }
      db.prepare('DELETE FROM auth_states WHERE state = ?').run(state);
    }

    let userInfo;
    const config = req.app.locals.config;

    if (authCode.startsWith('mock_code_')) {
      userInfo = generateMockUser(mockUserName ? decodeURIComponent(mockUserName) : undefined);
    } else {
      const dingtalk = new DingTalkService(config);
      try {
        userInfo = await dingtalk.getUserInfoByAuthCode(authCode);
        userInfo.role = 'user';
      } catch (err) {
        console.error('DingTalk getUserInfo error:', err);
        return sendJson(res, createErrorResponse(`钉钉登录失败: ${err.message}`, 'CALLBACK_ERROR', 500));
      }
    }

    const token = generateToken();
    const now = Date.now();
    const expiresAt = now + SESSION_TTL_SEC * 1000;

    db.prepare(
      'INSERT OR REPLACE INTO users (userid, name, avatar, mobile, email, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      userInfo.userid,
      userInfo.name,
      userInfo.avatar || null,
      userInfo.mobile || null,
      userInfo.email || null,
      userInfo.role || 'user',
      now
    );
    db.prepare(
      'INSERT OR REPLACE INTO sessions (token, userid, expires_at, created_at) VALUES (?, ?, ?, ?)'
    ).run(token, userInfo.userid, expiresAt, now);

    const user = {
      userid: userInfo.userid,
      name: userInfo.name,
      avatar: userInfo.avatar || null,
      mobile: userInfo.mobile || null,
      email: userInfo.email || null,
      role: userInfo.role || 'user',
    };
    sendJson(res, createSuccessResponse({ token, user }));
  } catch (err) {
    console.error('Auth exchange error:', err);
    sendJson(res, createErrorResponse(`登录失败: ${err.message}`, 'EXCHANGE_ERROR', 500));
  }
});

// 当前用户信息
router.get('/me', (req, res) => {
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  const token = authHeader.slice(7);
  const db = getDb();
  const session = db.prepare(
    'SELECT s.userid, s.expires_at, u.name, u.avatar, u.mobile, u.email, u.role FROM sessions s JOIN users u ON s.userid = u.userid WHERE s.token = ?'
  ).get(token);
  if (!session || session.expires_at < Date.now()) {
    if (session) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return sendJson(res, createErrorResponse('Invalid or expired token', 'TOKEN_EXPIRED', 401));
  }
  let isJudge = false;
  const userEmail = (session.email || '').trim().toLowerCase();
  if (userEmail) {
    const configRow = db.prepare('SELECT judges_json FROM screen_config WHERE id = 1').get();
    if (configRow && configRow.judges_json) {
      try {
        const judges = JSON.parse(configRow.judges_json);
        if (Array.isArray(judges)) {
          isJudge = judges.some((e) => String(e).trim().toLowerCase() === userEmail);
        }
      } catch (_) {}
    }
  }
  const userInfo = {
    userid: session.userid,
    name: session.name,
    avatar: session.avatar,
    mobile: session.mobile,
    email: session.email,
    role: session.role || 'user',
    isJudge,
  };
  sendJson(res, createSuccessResponse(userInfo));
});

// 管理员登录
router.post('/admin', (req, res) => {
  console.log('[auth] POST /admin 收到请求');
  const password = req.body?.password;
  if (!password) {
    return sendJson(res, createErrorResponse('Missing password', 'INVALID_REQUEST', 400));
  }
  const config = req.app.locals.config;
  const envPassword = config.ADMIN_PASSWORD;
  if (envPassword === undefined || envPassword === '') {
    return sendJson(res, createErrorResponse('管理员密码未配置，请在 server/.env 中设置 ADMIN_PASSWORD 并重启服务', 'ADMIN_PASSWORD_NOT_SET', 500));
  }
  if (password !== envPassword) {
    return sendJson(res, createErrorResponse('密码错误', 'INVALID_PASSWORD', 401));
  }
  const token = generateToken();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_SEC * 1000;
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO users (userid, name, role, created_at) VALUES (?, ?, ?, ?)'
  ).run('admin', '管理员', 'admin', now);
  db.prepare(
    'INSERT OR REPLACE INTO sessions (token, userid, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(token, 'admin', expiresAt, now);
  sendJson(res, createSuccessResponse({ token }));
});

// 退出
router.post('/logout', (req, res) => {
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  const token = authHeader.slice(7);
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  sendJson(res, createSuccessResponse({ success: true }));
});

module.exports = router;
