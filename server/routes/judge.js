/**
 * 评委评分路由
 * 评委评分：所有评委对一个作品打分的汇总（主键为作品），存 work_judge_score；明细存 judge_scores
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { createSuccessResponse, createErrorResponse, createPaginatedResponse, sendJson } = require('../utils/response');
const { requireJudge, requireAdminOrJudge } = require('../middleware/auth');
const { normalizeWorkId } = require('../utils/validate');

const MIN_SCORE = 1;
const MAX_PAGE = 1000;
const MAX_SCORE = 100;

// 作品分类选项（空字符串表示未设置，后续可改为配置或环境变量）
const WORK_CATEGORIES = ['', '创意类', '技术类', '视觉类', '叙事类', '其他'];

function updateWorkJudgeScore(db, workId) {
  const row = db.prepare('SELECT AVG(score) AS avg_score, COUNT(*) AS cnt, MAX(created_at) AS updated_at FROM judge_scores WHERE work_id = ?').get(workId);
  const now = Date.now();
  if (row && row.cnt > 0) {
    db.prepare(
      'INSERT INTO work_judge_score (work_id, score, judge_count, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(work_id) DO UPDATE SET score = excluded.score, judge_count = excluded.judge_count, updated_at = excluded.updated_at'
    ).run(workId, row.avg_score, row.cnt, row.updated_at || now);
  } else {
    db.prepare('DELETE FROM work_judge_score WHERE work_id = ?').run(workId);
  }
}

// 提交/更新评分
router.post('/score', requireJudge, (req, res) => {
  const workId = normalizeWorkId(req.body?.workId);
  let score = req.body?.score;
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required or invalid', 'INVALID_REQUEST', 400));
  }
  score = Number(score);
  if (Number.isNaN(score) || score < MIN_SCORE || score > MAX_SCORE) {
    return sendJson(res, createErrorResponse(`评分须为 ${MIN_SCORE}-${MAX_SCORE} 的整数`, 'INVALID_REQUEST', 400));
  }
  score = Math.round(score);
  const judgeEmail = req.judgeEmail;
  const db = getDb();
  // 评分开放时间仅在接口层校验，不限制页面访问
  const configRow = db.prepare('SELECT score_open_start, score_open_end FROM screen_config WHERE id = 1').get();
  const scoreStart = configRow?.score_open_start != null ? Number(configRow.score_open_start) : null;
  const scoreEnd = configRow?.score_open_end != null ? Number(configRow.score_open_end) : null;
  const now = Date.now();
  if (scoreStart != null && now < scoreStart) {
    return sendJson(res, createErrorResponse('当前不在评分开放时间内', 'SCORE_NOT_OPEN', 403));
  }
  if (scoreEnd != null && now > scoreEnd) {
    return sendJson(res, createErrorResponse('当前不在评分开放时间内', 'SCORE_NOT_OPEN', 403));
  }
  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(workId);
  if (!work) {
    return sendJson(res, createErrorResponse('Work not found', 'WORK_NOT_FOUND', 404));
  }
  db.prepare(
    'INSERT INTO judge_scores (work_id, judge_email, score, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(work_id, judge_email) DO UPDATE SET score = ?, created_at = ?'
  ).run(workId, judgeEmail, score, now, score, now);
  updateWorkJudgeScore(db, workId);
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

// 获取作品分类选项（评委修改分类时使用）
router.get('/categories', requireJudge, (req, res) => {
  sendJson(res, createSuccessResponse({ list: WORK_CATEGORIES }));
});

// 评委修改作品分类
router.patch('/works/:workId/category', requireJudge, (req, res) => {
  const workId = normalizeWorkId(req.params.workId);
  let category = req.body?.category;
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required or invalid', 'INVALID_REQUEST', 400));
  }
  if (category !== undefined && category !== null) {
    category = String(category).trim();
  } else {
    category = '';
  }
  if (!WORK_CATEGORIES.includes(category)) {
    return sendJson(res, createErrorResponse('无效的分类', 'INVALID_REQUEST', 400));
  }
  const db = getDb();
  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(workId);
  if (!work) {
    return sendJson(res, createErrorResponse('Work not found', 'WORK_NOT_FOUND', 404));
  }
  const now = Date.now();
  db.prepare('UPDATE works SET category = ?, updated_at = ? WHERE id = ?').run(category || null, now, workId);
  sendJson(res, createSuccessResponse({ workId, category: category || null }));
});

// 评委评分列表：作品列表 + 评委评分（作品维度）+ 我的打分（管理员或评委可访问，管理员无 myScore）
router.get('/works', requireAdminOrJudge, (req, res) => {
  try {
    const page = Math.min(MAX_PAGE, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const judgeEmail = req.judgeEmail != null ? req.judgeEmail : '';
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) AS c FROM works').get().c;
    const rows = db.prepare(`
      SELECT w.id, w.userid AS userId, w.title, w.description, w.file_url AS fileUrl, w.file_name AS fileName, w.file_size AS fileSize, w.file_type AS fileType, w.creator_name AS creatorName, w.category, w.created_at AS createdAt, w.updated_at AS updatedAt,
             COALESCE(v.cnt, 0) AS voteCount,
             j.avg_score AS judgeScore, j.cnt AS judgeCount,
             m.score AS myScore
      FROM works w
      LEFT JOIN (SELECT work_id, COUNT(*) AS cnt FROM votes GROUP BY work_id) v ON w.id = v.work_id
      LEFT JOIN (SELECT work_id, AVG(score) AS avg_score, COUNT(*) AS cnt FROM judge_scores GROUP BY work_id) j ON w.id = j.work_id
      LEFT JOIN judge_scores m ON w.id = m.work_id AND m.judge_email = ?
      ORDER BY w.created_at DESC LIMIT ? OFFSET ?
    `).all(judgeEmail, limit, (page - 1) * limit);
    const items = rows.map((r) => ({
      ...r,
      category: r.category != null && r.category !== '' ? r.category : null,
      judgeScore: r.judgeScore != null ? Math.round(r.judgeScore * 10) / 10 : null,
      judgeCount: r.judgeCount ?? 0,
      myScore: r.myScore != null ? r.myScore : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    sendJson(res, createPaginatedResponse(items, total, page, limit));
  } catch (err) {
    console.error('Judge works error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

// 某作品的评委评分明细（管理员或评委可查看）
router.get('/works/:workId/scores', requireAdminOrJudge, (req, res) => {
  const workId = normalizeWorkId(req.params.workId);
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required or invalid', 'INVALID_REQUEST', 400));
  }
  const db = getDb();
  const work = db.prepare('SELECT id FROM works WHERE id = ?').get(workId);
  if (!work) {
    return sendJson(res, createErrorResponse('Work not found', 'WORK_NOT_FOUND', 404));
  }
  const rows = db.prepare(
    'SELECT judge_email AS judgeEmail, score, created_at AS createdAt FROM judge_scores WHERE work_id = ? ORDER BY created_at ASC'
  ).all(workId);
  const list = rows.map((r) => ({
    judgeEmail: r.judgeEmail,
    score: r.score,
    createdAt: r.createdAt,
  }));
  sendJson(res, createSuccessResponse({ workId, scores: list }));
});

module.exports = router;
