/**
 * 作品管理路由
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { OSSService } = require('../services/oss');
const { createSuccessResponse, createErrorResponse, createPaginatedResponse, sendJson } = require('../utils/response');
const { requireUser, requireAdmin, getSessionUser } = require('../middleware/auth');
const { normalizeWorkId } = require('../utils/validate');
const { getTodayDateChina } = require('../utils/dateChina');

const MAX_PAGE = 1000;
const MAX_TITLE_LENGTH = 200;

// 校验作品标题是否可用（上传前异步校验，避免上传后才发现重复）
router.get('/check-title', requireUser, (req, res) => {
  try {
    const title = (req.query.title ?? '').trim();
    if (!title) {
      return sendJson(res, createErrorResponse('请输入作品标题', 'NO_TITLE', 400));
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return sendJson(res, createErrorResponse(`标题最多 ${MAX_TITLE_LENGTH} 字`, 'TITLE_TOO_LONG', 400));
    }
    const db = getDb();
    const existing = db.prepare('SELECT id FROM works WHERE LOWER(TRIM(title)) = LOWER(?)').get(title);
    sendJson(res, createSuccessResponse({ available: !existing }));
  } catch (err) {
    console.error('Check title error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

// 作品列表（分页）。带 Authorization 时返回每条的 hasVoted，避免前端 N 次 stats 请求
router.get('/', (req, res) => {
  try {
    const page = Math.min(MAX_PAGE, Math.max(1, parseInt(req.query.page, 10) || 1));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) AS c FROM works').get().c;
    const rows = db.prepare(`
      SELECT w.id, w.userid AS userId, w.title, w.description, w.file_url AS fileUrl, w.file_name AS fileName, w.file_size AS fileSize, w.file_type AS fileType, w.creator_name AS creatorName, u.avatar AS creatorAvatar, w.created_at AS createdAt, w.updated_at AS updatedAt,
             COALESCE(v.cnt, 0) AS voteCount
      FROM works w
      LEFT JOIN users u ON w.userid = u.userid
      LEFT JOIN (SELECT work_id, COUNT(*) AS cnt FROM votes GROUP BY work_id) v ON w.id = v.work_id
      ORDER BY w.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, (page - 1) * limit);
    let votedWorkIds = new Set();
    const currentUser = getSessionUser(req);
    if (currentUser) {
      const voteDate = getTodayDateChina();
      const voted = db.prepare('SELECT work_id FROM votes WHERE user_id = ? AND vote_date = ?').all(currentUser.userid, voteDate);
      votedWorkIds = new Set(voted.map((r) => r.work_id));
    }
    const items = rows.map((r) => ({
      ...r,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      hasVoted: votedWorkIds.has(r.id),
    }));
    sendJson(res, createPaginatedResponse(items, total, page, limit));
  } catch (err) {
    console.error('Get works error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

// Top 作品（按投票数）
router.get('/top', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const db = getDb();
    const rows = db.prepare(`
      SELECT w.id, w.userid AS userId, w.title, w.description, w.file_url AS fileUrl, w.file_name AS fileName, w.file_size AS fileSize, w.file_type AS fileType, w.creator_name AS creatorName, u.avatar AS creatorAvatar, w.created_at AS createdAt, w.updated_at AS updatedAt,
             COALESCE(v.cnt, 0) AS voteCount
      FROM works w
      LEFT JOIN users u ON w.userid = u.userid
      LEFT JOIN (SELECT work_id, COUNT(*) AS cnt FROM votes GROUP BY work_id) v ON w.id = v.work_id
      ORDER BY voteCount DESC, w.created_at DESC
      LIMIT ?
    `).all(limit);
    sendJson(res, createSuccessResponse({ items: rows, total: rows.length }));
  } catch (err) {
    console.error('Get top works error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

/** 奖项类型与名称映射（后续奖项可在此扩展） */
const AWARD_TYPES = {
  popular: { name: '时光共鸣奖', limit: 3 },
};

// 按奖项类型获取作品集合（同一结果页带不同 type 调用）
router.get('/by-award', (req, res) => {
  try {
    const type = (req.query.type || '').trim().toLowerCase() || 'popular';
    const config = AWARD_TYPES[type];
    if (!config) {
      return sendJson(res, createErrorResponse(`未知奖项类型: ${type}`, 'INVALID_AWARD_TYPE', 400));
    }
    const limit = type === 'popular' ? 3 : Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || config.limit));
    const db = getDb();
    let rows;
    if (type === 'popular') {
      rows = db.prepare(`
        SELECT w.id, w.userid AS userId, w.title, w.description, w.file_url AS fileUrl, w.file_name AS fileName, w.file_size AS fileSize, w.file_type AS fileType, w.creator_name AS creatorName, u.avatar AS creatorAvatar, w.created_at AS createdAt, w.updated_at AS updatedAt,
               COALESCE(v.cnt, 0) AS voteCount
        FROM works w
        LEFT JOIN users u ON w.userid = u.userid
        LEFT JOIN (SELECT work_id, COUNT(*) AS cnt FROM votes GROUP BY work_id) v ON w.id = v.work_id
        ORDER BY voteCount DESC, w.created_at DESC
        LIMIT ?
      `).all(limit);
    } else {
      rows = [];
    }
    sendJson(res, createSuccessResponse({
      items: rows,
      total: rows.length,
      awardType: type,
      awardName: config.name,
    }));
  } catch (err) {
    console.error('Get works by award error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

// 主奖项：最终得分 = 专业评审得分×60% + 大众情感共鸣分×40%，按综合得分排序取前 6
// 大众情感共鸣分按人气排名：前10%→100分，前11%-30%→80分，前31%-60%→60分，后40%→40分
router.get('/by-judge-rank', (req, res) => {
  try {
    // 主奖项页固定需要前 6 名，至少取 6 条，避免误传 limit=3 只返回 3 条
    const limit = Math.min(20, Math.max(6, parseInt(req.query.limit, 10) || 6));
    const db = getDb();
    const rows = db.prepare(`
      SELECT w.id, w.userid AS userId, w.title, w.description, w.file_url AS fileUrl, w.file_name AS fileName, w.file_size AS fileSize, w.file_type AS fileType, w.creator_name AS creatorName, u.avatar AS creatorAvatar, w.created_at AS createdAt, w.updated_at AS updatedAt,
             COALESCE(v.cnt, 0) AS voteCount,
             j.score AS judgeScore
      FROM works w
      LEFT JOIN work_judge_score j ON w.id = j.work_id
      LEFT JOIN users u ON w.userid = u.userid
      LEFT JOIN (SELECT work_id, COUNT(*) AS cnt FROM votes GROUP BY work_id) v ON w.id = v.work_id
      ORDER BY w.created_at DESC
    `).all();
    const N = rows.length;
    if (N === 0) {
      return sendJson(res, createSuccessResponse({ items: [], total: 0 }));
    }
    // 按投票数降序得到人气排名（同票按 created_at 先到在前）
    const byVote = [...rows].sort((a, b) => {
      const va = a.voteCount ?? 0;
      const vb = b.voteCount ?? 0;
      if (vb !== va) return vb - va;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
    const voteRankByWorkId = {};
    byVote.forEach((r, idx) => {
      voteRankByWorkId[r.id] = idx + 1;
    });
    const ceil = Math.ceil;
    const getPublicScore = (rank) => {
      if (rank <= ceil(0.1 * N)) return 100;
      if (rank <= ceil(0.3 * N)) return 80;
      if (rank <= ceil(0.6 * N)) return 60;
      return 40;
    };
    const withScore = rows.map((r) => {
      const judgeScore = r.judgeScore != null ? Number(r.judgeScore) : 0;
      const voteRank = voteRankByWorkId[r.id] ?? N;
      const publicScore = getPublicScore(voteRank);
      const finalScore = judgeScore * 0.6 + publicScore * 0.4;
      return {
        ...r,
        judgeScore: r.judgeScore != null ? Math.round(r.judgeScore * 10) / 10 : null,
        publicScore,
        finalScore: Math.round(finalScore * 10) / 10,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
    const sorted = withScore.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });
    const items = sorted.slice(0, limit).map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      description: r.description,
      fileUrl: r.fileUrl,
      fileName: r.fileName,
      fileSize: r.fileSize,
      fileType: r.fileType,
      creatorName: r.creatorName,
      creatorAvatar: r.creatorAvatar,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      voteCount: r.voteCount,
      judgeScore: r.judgeScore,
      publicScore: r.publicScore,
      finalScore: r.finalScore,
    }));
    sendJson(res, createSuccessResponse({ items, total: items.length }));
  } catch (err) {
    console.error('Get works by judge rank error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

// 删除作品（仅管理员）
router.delete('/:workId', requireAdmin, async (req, res) => {
  try {
    const workId = normalizeWorkId(req.params.workId);
    if (!workId) {
      return sendJson(res, createErrorResponse('workId invalid', 'INVALID_REQUEST', 400));
    }
    const db = getDb();
    const work = db.prepare('SELECT * FROM works WHERE id = ?').get(workId);
    if (!work) {
      return sendJson(res, createErrorResponse('Work not found', 'NOT_FOUND', 404));
    }

    const oss = new OSSService(req.app.locals.config);
    try {
      await oss.deleteFile(work.file_name);
    } catch (err) {
      console.error('OSS delete error (continuing):', err);
    }

    db.prepare('DELETE FROM votes WHERE work_id = ?').run(workId);
    db.prepare('DELETE FROM judge_scores WHERE work_id = ?').run(workId);
    db.prepare('DELETE FROM work_judge_score WHERE work_id = ?').run(workId);
    db.prepare('DELETE FROM works WHERE id = ?').run(workId);

    sendJson(res, createSuccessResponse({ success: true, message: '作品删除成功' }));
  } catch (err) {
    console.error('Delete work error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

module.exports = router;
