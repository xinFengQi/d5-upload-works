/**
 * 评委评分路由
 * 评委评分：所有评委对一个作品打分的汇总（主键为作品），存 work_judge_score；明细存 judge_scores
 */
const express = require('express');
const router = express.Router();
const { getDb, hasColumn } = require('../db');
const { createSuccessResponse, createErrorResponse, createPaginatedResponse, sendJson } = require('../utils/response');
const { requireJudge, requireAdminOrJudge } = require('../middleware/auth');
const { normalizeWorkId } = require('../utils/validate');

const MIN_SCORE = 1;
const MAX_PAGE = 1000;
const MAX_SCORE = 100;
/** 创意与概念、艺术与观感 各 0–50 分 */
const MAX_DIM_SCORE = 50;

function updateWorkJudgeScore(db, workId) {
  const hasCreativityCol = hasColumn(db, 'judge_scores', 'creativity_score');
  const sel = hasCreativityCol
    ? 'SELECT AVG(score) AS avg_score, COUNT(*) AS cnt, MAX(created_at) AS updated_at, AVG(COALESCE(creativity_score, score/2.0)) AS avg_creativity, AVG(COALESCE(art_score, score/2.0)) AS avg_art FROM judge_scores WHERE work_id = ?'
    : 'SELECT AVG(score) AS avg_score, COUNT(*) AS cnt, MAX(created_at) AS updated_at FROM judge_scores WHERE work_id = ?';
  const row = db.prepare(sel).get(workId);
  const now = Date.now();
  if (row && row.cnt > 0) {
    if (hasColumn(db, 'work_judge_score', 'creativity_score') && row.avg_creativity != null) {
      db.prepare(
        `INSERT INTO work_judge_score (work_id, score, judge_count, updated_at, creativity_score, art_score) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(work_id) DO UPDATE SET score = excluded.score, judge_count = excluded.judge_count, updated_at = excluded.updated_at, creativity_score = excluded.creativity_score, art_score = excluded.art_score`
      ).run(workId, row.avg_score, row.cnt, row.updated_at || now, row.avg_creativity, row.avg_art);
    } else {
      db.prepare(
        'INSERT INTO work_judge_score (work_id, score, judge_count, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(work_id) DO UPDATE SET score = excluded.score, judge_count = excluded.judge_count, updated_at = excluded.updated_at'
      ).run(workId, row.avg_score, row.cnt, row.updated_at || now);
    }
  } else {
    db.prepare('DELETE FROM work_judge_score WHERE work_id = ?').run(workId);
  }
}

// 提交/更新评分（双维度：创意与概念 0–50，艺术与观感 0–50，总分 0–100）
router.post('/score', requireJudge, (req, res) => {
  const workId = normalizeWorkId(req.body?.workId);
  let creativityScore = req.body?.creativityScore;
  let artScore = req.body?.artScore;
  if (!workId) {
    return sendJson(res, createErrorResponse('workId is required or invalid', 'INVALID_REQUEST', 400));
  }
  creativityScore = Number(creativityScore);
  artScore = Number(artScore);
  if (Number.isNaN(creativityScore) || creativityScore < 0 || creativityScore > MAX_DIM_SCORE) {
    return sendJson(res, createErrorResponse(`创意与概念须为 0–${MAX_DIM_SCORE} 的整数`, 'INVALID_REQUEST', 400));
  }
  if (Number.isNaN(artScore) || artScore < 0 || artScore > MAX_DIM_SCORE) {
    return sendJson(res, createErrorResponse(`艺术与观感须为 0–${MAX_DIM_SCORE} 的整数`, 'INVALID_REQUEST', 400));
  }
  creativityScore = Math.round(creativityScore);
  artScore = Math.round(artScore);
  const score = creativityScore + artScore;
  const judgeEmail = req.judgeEmail;
  const db = getDb();
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
  if (hasColumn(db, 'judge_scores', 'creativity_score')) {
    db.prepare(
      'INSERT INTO judge_scores (work_id, judge_email, score, creativity_score, art_score, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(work_id, judge_email) DO UPDATE SET score = ?, creativity_score = ?, art_score = ?, created_at = ?'
    ).run(workId, judgeEmail, score, creativityScore, artScore, now, score, creativityScore, artScore, now);
  } else {
    db.prepare(
      'INSERT INTO judge_scores (work_id, judge_email, score, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(work_id, judge_email) DO UPDATE SET score = ?, created_at = ?'
    ).run(workId, judgeEmail, score, now, score, now);
  }
  updateWorkJudgeScore(db, workId);
  sendJson(res, createSuccessResponse({ workId, score, creativityScore, artScore }));
});

// 获取当前评委对各作品的评分
router.get('/my-scores', requireJudge, (req, res) => {
  const judgeEmail = req.judgeEmail;
  const db = getDb();
  const hasCreativity = hasColumn(db, 'judge_scores', 'creativity_score');
  const rows = db.prepare(
    hasCreativity
      ? 'SELECT work_id, score, creativity_score AS creativityScore, art_score AS artScore, created_at FROM judge_scores WHERE judge_email = ?'
      : 'SELECT work_id, score, created_at FROM judge_scores WHERE judge_email = ?'
  ).all(judgeEmail);
  const list = rows.map((r) => ({
    workId: r.work_id,
    score: r.score,
    creativityScore: hasCreativity && r.creativityScore != null ? r.creativityScore : null,
    artScore: hasCreativity && r.artScore != null ? r.artScore : null,
    createdAt: r.created_at,
  }));
  sendJson(res, createSuccessResponse({ scores: list }));
});

// 评委评分列表：作品列表 + 评委评分（作品维度）+ 我的打分（管理员或评委可访问，管理员无 myScore）
router.get('/works', requireAdminOrJudge, (req, res) => {
  try {
    const page = Math.min(MAX_PAGE, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const judgeEmail = req.judgeEmail != null ? req.judgeEmail : '';
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) AS c FROM works').get().c;
    const hasCreativity = hasColumn(db, 'judge_scores', 'creativity_score');
    let rows;
    if (hasCreativity) {
      rows = db.prepare(`
        SELECT w.id, w.userid AS userId, w.title, w.description, w.file_url AS fileUrl, w.file_name AS fileName, w.file_size AS fileSize, w.file_type AS fileType, w.creator_name AS creatorName, w.created_at AS createdAt, w.updated_at AS updatedAt,
               COALESCE(v.cnt, 0) AS voteCount,
               j.avg_score AS judgeScore, j.cnt AS judgeCount,
               j.avg_creativity AS judgeCreativityScore, j.avg_art AS judgeArtScore,
               m.score AS myScore, m.creativity_score AS myCreativityScore, m.art_score AS myArtScore
        FROM works w
        LEFT JOIN (SELECT work_id, COUNT(*) AS cnt FROM votes GROUP BY work_id) v ON w.id = v.work_id
        LEFT JOIN (SELECT work_id, AVG(score) AS avg_score, AVG(COALESCE(creativity_score, score/2.0)) AS avg_creativity, AVG(COALESCE(art_score, score/2.0)) AS avg_art, COUNT(*) AS cnt FROM judge_scores GROUP BY work_id) j ON w.id = j.work_id
        LEFT JOIN judge_scores m ON w.id = m.work_id AND m.judge_email = ?
        ORDER BY w.created_at DESC LIMIT ? OFFSET ?
      `).all(judgeEmail, limit, (page - 1) * limit);
    } else {
      rows = db.prepare(`
        SELECT w.id, w.userid AS userId, w.title, w.description, w.file_url AS fileUrl, w.file_name AS fileName, w.file_size AS fileSize, w.file_type AS fileType, w.creator_name AS creatorName, w.created_at AS createdAt, w.updated_at AS updatedAt,
               COALESCE(v.cnt, 0) AS voteCount,
               j.avg_score AS judgeScore, j.cnt AS judgeCount,
               m.score AS myScore
        FROM works w
        LEFT JOIN (SELECT work_id, COUNT(*) AS cnt FROM votes GROUP BY work_id) v ON w.id = v.work_id
        LEFT JOIN (SELECT work_id, AVG(score) AS avg_score, COUNT(*) AS cnt FROM judge_scores GROUP BY work_id) j ON w.id = j.work_id
        LEFT JOIN judge_scores m ON w.id = m.work_id AND m.judge_email = ?
        ORDER BY w.created_at DESC LIMIT ? OFFSET ?
      `).all(judgeEmail, limit, (page - 1) * limit);
    }
    const items = rows.map((r) => ({
      ...r,
      judgeScore: r.judgeScore != null ? Math.round(r.judgeScore * 10) / 10 : null,
      judgeCreativityScore: r.judgeCreativityScore != null ? Math.round(r.judgeCreativityScore * 10) / 10 : null,
      judgeArtScore: r.judgeArtScore != null ? Math.round(r.judgeArtScore * 10) / 10 : null,
      judgeCount: r.judgeCount ?? 0,
      myScore: r.myScore != null ? r.myScore : null,
      myCreativityScore: r.myCreativityScore != null ? r.myCreativityScore : null,
      myArtScore: r.myArtScore != null ? r.myArtScore : null,
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
  const hasCreativity = hasColumn(db, 'judge_scores', 'creativity_score');
  const rows = db.prepare(
    hasCreativity
      ? 'SELECT judge_email AS judgeEmail, score, creativity_score AS creativityScore, art_score AS artScore, created_at AS createdAt FROM judge_scores WHERE work_id = ? ORDER BY created_at ASC'
      : 'SELECT judge_email AS judgeEmail, score, created_at AS createdAt FROM judge_scores WHERE work_id = ? ORDER BY created_at ASC'
  ).all(workId);
  const list = rows.map((r) => ({
    judgeEmail: r.judgeEmail,
    score: r.score,
    creativityScore: r.creativityScore != null ? r.creativityScore : null,
    artScore: r.artScore != null ? r.artScore : null,
    createdAt: r.createdAt,
  }));
  sendJson(res, createSuccessResponse({ workId, scores: list }));
});

module.exports = router;
