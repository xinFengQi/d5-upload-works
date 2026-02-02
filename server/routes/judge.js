/**
 * 评委评分路由
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { createSuccessResponse, createErrorResponse, sendJson } = require('../utils/response');
const { requireJudge } = require('../middleware/auth');

const MIN_SCORE = 1;
const MAX_SCORE = 100;

// 提交/更新评分
router.post('/score', requireJudge, (req, res) => {
  const workId = req.body?.workId;
  let score = req.body?.score;
  if (workId == null || workId === '') {
    return sendJson(res, createErrorResponse('workId is required', 'INVALID_REQUEST', 400));
  }
  score = Number(score);
  if (Number.isNaN(score) || score < MIN_SCORE || score > MAX_SCORE) {
    return sendJson(res, createErrorResponse(`评分须为 ${MIN_SCORE}-${MAX_SCORE} 的整数`, 'INVALID_REQUEST', 400));
  }
  score = Math.round(score);
  const judgeEmail = req.judgeEmail;
  const db = getDb();
  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(workId);
  if (!work) {
    return sendJson(res, createErrorResponse('Work not found', 'WORK_NOT_FOUND', 404));
  }
  const now = Date.now();
  db.prepare(
    'INSERT INTO judge_scores (work_id, judge_email, score, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(work_id, judge_email) DO UPDATE SET score = ?, created_at = ?'
  ).run(workId, judgeEmail, score, now, score, now);
  sendJson(res, createSuccessResponse({ workId, score }));
});

// 获取当前评委对各作品的评分
router.get('/my-scores', requireJudge, (req, res) => {
  const judgeEmail = req.judgeEmail;
  const db = getDb();
  const rows = db.prepare('SELECT work_id, score, created_at FROM judge_scores WHERE judge_email = ?').all(judgeEmail);
  const list = rows.map((r) => ({ workId: r.work_id, score: r.score, createdAt: r.created_at }));
  sendJson(res, createSuccessResponse({ scores: list }));
});

module.exports = router;
