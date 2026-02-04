/**
 * 投票路由
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { createSuccessResponse, createErrorResponse, sendJson } = require('../utils/response');
const { getSessionUser } = require('../middleware/auth');
const { normalizeWorkId } = require('../utils/validate');

const DEFAULT_MAX_VOTES_PER_USER = 1;

// 投票：校验开放时间 + 每人最多投票数（事务防并发超限）
router.post('/', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  const workId = normalizeWorkId(req.body?.workId);
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required or invalid', 'INVALID_REQUEST', 400));
  }

  const db = getDb();
  const configRow = db.prepare(
    'SELECT vote_open_start, vote_open_end, max_votes_per_user FROM screen_config WHERE id = 1'
  ).get();
  const voteStart = configRow?.vote_open_start != null ? Number(configRow.vote_open_start) : null;
  const voteEnd = configRow?.vote_open_end != null ? Number(configRow.vote_open_end) : null;
  const now = Date.now();
  if (voteStart != null && now < voteStart) {
    return sendJson(res, createErrorResponse('当前不在投票开放时间内', 'VOTE_NOT_OPEN', 403));
  }
  if (voteEnd != null && now > voteEnd) {
    return sendJson(res, createErrorResponse('当前不在投票开放时间内', 'VOTE_NOT_OPEN', 403));
  }

  const maxVotes =
    configRow?.max_votes_per_user != null && configRow.max_votes_per_user !== ''
      ? Number(configRow.max_votes_per_user)
      : DEFAULT_MAX_VOTES_PER_USER;

  try {
    const result = db.transaction(() => {
      const userVoteCount = db.prepare('SELECT COUNT(*) AS c FROM votes WHERE user_id = ?').get(user.userid).c;
      if (userVoteCount >= maxVotes) {
        throw new Error('MAX_VOTES_REACHED');
      }
      const work = db.prepare('SELECT id, userid FROM works WHERE id = ?').get(workId);
      if (!work) throw new Error('WORK_NOT_FOUND');
      if (work.userid === user.userid) throw new Error('CANNOT_VOTE_OWN');
      const existing = db.prepare('SELECT 1 FROM votes WHERE work_id = ? AND user_id = ?').get(workId, user.userid);
      if (existing) throw new Error('ALREADY_VOTED');
      try {
        db.prepare('INSERT INTO votes (work_id, user_id, created_at) VALUES (?, ?, ?)').run(workId, user.userid, now);
      } catch (insertErr) {
        // 并发下另一请求已插入同一 (work_id, user_id)，UNIQUE 约束触发，视为已投过
        const isUnique = insertErr.code === 'SQLITE_CONSTRAINT' ||
          (insertErr.message && String(insertErr.message).includes('UNIQUE constraint'));
        if (isUnique) throw new Error('ALREADY_VOTED');
        throw insertErr;
      }
      return db.prepare('SELECT COUNT(*) AS c FROM votes WHERE work_id = ?').get(workId).c;
    })();
    sendJson(res, createSuccessResponse({ success: true, voteCount: result }));
  } catch (err) {
    if (err.message === 'MAX_VOTES_REACHED') {
      return sendJson(res, createErrorResponse(`已达到每人最多投票数（${maxVotes}）`, 'MAX_VOTES_REACHED', 400));
    }
    if (err.message === 'WORK_NOT_FOUND') {
      return sendJson(res, createErrorResponse('Work not found', 'WORK_NOT_FOUND', 404));
    }
    if (err.message === 'CANNOT_VOTE_OWN') {
      return sendJson(res, createErrorResponse('Cannot vote for your own work', 'CANNOT_VOTE_OWN', 400));
    }
    if (err.message === 'ALREADY_VOTED') {
      return sendJson(res, createErrorResponse('Already voted', 'ALREADY_VOTED', 400));
    }
    throw err;
  }
});

// 取消投票（仅在投票开放时间内允许，与投票规则一致）
// 接口：DELETE /api/vote?workId=作品ID，需登录，返回 { success: true, data: { success: true, voteCount } }
router.delete('/', (req, res) => {
  try {
    const user = getSessionUser(req);
    if (!user) {
      return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
    }
    const workId = normalizeWorkId(req.query.workId);
    if (!workId) {
      return sendJson(res, createErrorResponse('workId is required or invalid', 'INVALID_REQUEST', 400));
    }

    const db = getDb();
    const configRow = db.prepare(
      'SELECT vote_open_start, vote_open_end FROM screen_config WHERE id = 1'
    ).get();
    const voteStart = configRow?.vote_open_start != null ? Number(configRow.vote_open_start) : null;
    const voteEnd = configRow?.vote_open_end != null ? Number(configRow.vote_open_end) : null;
    const now = Date.now();
    if (voteStart != null && now < voteStart) {
      return sendJson(res, createErrorResponse('当前不在投票开放时间内', 'VOTE_NOT_OPEN', 403));
    }
    if (voteEnd != null && now > voteEnd) {
      return sendJson(res, createErrorResponse('当前不在投票开放时间内', 'VOTE_NOT_OPEN', 403));
    }

    const result = db.prepare('DELETE FROM votes WHERE work_id = ? AND user_id = ?').run(workId, user.userid);
    const voteCount = db.prepare('SELECT COUNT(*) AS c FROM votes WHERE work_id = ?').get(workId).c;

    if (result.changes === 0) {
      return sendJson(res, createErrorResponse('未找到投票记录或已取消', 'NOT_FOUND', 404));
    }
    sendJson(res, createSuccessResponse({ success: true, voteCount }));
  } catch (err) {
    console.error('Cancel vote error:', err);
    sendJson(res, createErrorResponse('取消投票失败', 'INTERNAL_ERROR', 500));
  }
});

// 用户已投票数量
router.get('/user/count', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) AS c FROM votes WHERE user_id = ?').get(user.userid).c;
  sendJson(res, createSuccessResponse({ count }));
});

// 作品投票统计
router.get('/stats', (req, res) => {
  const workId = normalizeWorkId(req.query.workId);
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required or invalid', 'INVALID_REQUEST', 400));
  }
  const db = getDb();
  const voteCount = db.prepare('SELECT COUNT(*) AS c FROM votes WHERE work_id = ?').get(workId).c;
  const user = getSessionUser(req);
  let hasVoted = false;
  if (user) {
    const row = db.prepare('SELECT 1 FROM votes WHERE work_id = ? AND user_id = ?').get(workId, user.userid);
    hasVoted = !!row;
  }
  sendJson(res, createSuccessResponse({
    workId,
    voteCount,
    count: voteCount,
    hasVoted,
  }));
});

// 作品投票用户列表（仅管理员）
router.get('/users', (req, res) => {
  const user = getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return sendJson(res, createErrorResponse('Forbidden: Admin only', 'FORBIDDEN', 403));
  }
  const workId = normalizeWorkId(req.query.workId);
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required or invalid', 'INVALID_REQUEST', 400));
  }
  const db = getDb();
  const rows = db.prepare(
    'SELECT v.user_id AS userId, v.created_at AS createdAt, u.name AS userName FROM votes v LEFT JOIN users u ON v.user_id = u.userid WHERE v.work_id = ? ORDER BY v.created_at DESC'
  ).all(workId);
  sendJson(res, createSuccessResponse({
    workId,
    voters: rows.map((r) => ({ userId: r.userId, userName: r.userName || '未知用户', createdAt: r.createdAt })),
    count: rows.length,
  }));
});

module.exports = router;
