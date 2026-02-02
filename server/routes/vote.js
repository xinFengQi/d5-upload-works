/**
 * 投票路由
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { createSuccessResponse, createErrorResponse, sendJson } = require('../utils/response');
const { getSessionUser } = require('../middleware/auth');

const MAX_VOTES_PER_USER = 10;

// 投票
router.post('/', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  const workId = req.body?.workId;
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required', 'INVALID_REQUEST', 400));
  }

  const db = getDb();
  const work = db.prepare('SELECT id, userid FROM works WHERE id = ?').get(workId);
  if (!work) {
    return sendJson(res, createErrorResponse('Work not found', 'WORK_NOT_FOUND', 404));
  }
  if (work.userid === user.userid) {
    return sendJson(res, createErrorResponse('Cannot vote for your own work', 'CANNOT_VOTE_OWN', 400));
  }

  const existing = db.prepare('SELECT 1 FROM votes WHERE work_id = ? AND user_id = ?').get(workId, user.userid);
  if (existing) {
    return sendJson(res, createErrorResponse('Already voted', 'ALREADY_VOTED', 400));
  }

  const userVoteCount = db.prepare('SELECT COUNT(*) AS c FROM votes WHERE user_id = ?').get(user.userid).c;
  if (userVoteCount >= MAX_VOTES_PER_USER) {
    return sendJson(res, createErrorResponse('Maximum votes reached (10)', 'MAX_VOTES_REACHED', 400));
  }

  const now = Date.now();
  db.prepare('INSERT INTO votes (work_id, user_id, created_at) VALUES (?, ?, ?)').run(workId, user.userid, now);
  const voteCount = db.prepare('SELECT COUNT(*) AS c FROM votes WHERE work_id = ?').get(workId).c;

  sendJson(res, createSuccessResponse({ success: true, voteCount }));
});

// 取消投票
router.delete('/', (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return sendJson(res, createErrorResponse('Unauthorized', 'UNAUTHORIZED', 401));
  }
  const workId = req.query.workId;
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required', 'INVALID_REQUEST', 400));
  }

  const db = getDb();
  const result = db.prepare('DELETE FROM votes WHERE work_id = ? AND user_id = ?').run(workId, user.userid);
  const voteCount = db.prepare('SELECT COUNT(*) AS c FROM votes WHERE work_id = ?').get(workId).c;

  if (result.changes === 0) {
    return sendJson(res, createErrorResponse('Vote not found', 'NOT_FOUND', 404));
  }
  sendJson(res, createSuccessResponse({ success: true, voteCount }));
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
  const workId = req.query.workId;
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required', 'INVALID_REQUEST', 400));
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
  const workId = req.query.workId;
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required', 'INVALID_REQUEST', 400));
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
