/**
 * 认证中间件：从 Authorization: Bearer <token> 解析用户
 */
const { getDb } = require('../db');
const { createErrorResponse, sendJson } = require('../utils/response');

function getSessionUser(req) {
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const db = getDb();
  const row = db.prepare(
    'SELECT s.userid, s.expires_at, u.name, u.avatar, u.mobile, u.email, u.role FROM sessions s JOIN users u ON s.userid = u.userid WHERE s.token = ?'
  ).get(token);
  if (!row || row.expires_at < Date.now()) {
    if (row) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return {
    userid: row.userid,
    name: row.name,
    avatar: row.avatar,
    mobile: row.mobile,
    email: row.email,
    role: row.role || 'user',
  };
}

function requireUser(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  if (user.role !== 'admin') {
    return sendJson(res, createErrorResponse('Forbidden: Admin only', 'FORBIDDEN', 403));
  }
  req.user = user;
  next();
}

function requireJudge(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  const userEmail = (user.email || '').trim().toLowerCase();
  if (!userEmail) {
    return sendJson(res, createErrorResponse('您未绑定邮箱，无法使用评委功能', 'NO_EMAIL', 403));
  }
  const db = getDb();
  const row = db.prepare('SELECT judges_json FROM screen_config WHERE id = 1').get();
  if (!row || !row.judges_json) {
    return sendJson(res, createErrorResponse('Forbidden: Judge only', 'FORBIDDEN', 403));
  }
  try {
    const judges = JSON.parse(row.judges_json);
    const isJudge = Array.isArray(judges) && judges.some((e) => String(e).trim().toLowerCase() === userEmail);
    if (!isJudge) {
      return sendJson(res, createErrorResponse('Forbidden: Judge only', 'FORBIDDEN', 403));
    }
  } catch (_) {
    return sendJson(res, createErrorResponse('Forbidden: Judge only', 'FORBIDDEN', 403));
  }
  req.user = user;
  req.judgeEmail = userEmail;
  next();
}

/** 管理员或评委：用于查看某作品的评委评分明细等 */
function requireAdminOrJudge(req, res, next) {
  const user = getSessionUser(req);
  if (!user) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  if (user.role === 'admin') {
    req.user = user;
    return next();
  }
  const userEmail = (user.email || '').trim().toLowerCase();
  if (!userEmail) {
    return sendJson(res, createErrorResponse('您未绑定邮箱，无法使用该功能', 'NO_EMAIL', 403));
  }
  const db = getDb();
  const row = db.prepare('SELECT judges_json FROM screen_config WHERE id = 1').get();
  if (!row || !row.judges_json) {
    return sendJson(res, createErrorResponse('Forbidden', 'FORBIDDEN', 403));
  }
  try {
    const judges = JSON.parse(row.judges_json);
    const isJudge = Array.isArray(judges) && judges.some((e) => String(e).trim().toLowerCase() === userEmail);
    if (!isJudge) {
      return sendJson(res, createErrorResponse('Forbidden', 'FORBIDDEN', 403));
    }
  } catch (_) {
    return sendJson(res, createErrorResponse('Forbidden', 'FORBIDDEN', 403));
  }
  req.user = user;
  req.judgeEmail = userEmail;
  next();
}

module.exports = { getSessionUser, requireUser, requireAdmin, requireJudge, requireAdminOrJudge };
