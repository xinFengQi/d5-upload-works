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
      const voted = db.prepare('SELECT work_id FROM votes WHERE user_id = ?').all(currentUser.userid);
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
  popular: { name: '人气奖', limit: 10 },
};

// 按奖项类型获取作品集合（同一结果页带不同 type 调用）
router.get('/by-award', (req, res) => {
  try {
    const type = (req.query.type || '').trim().toLowerCase() || 'popular';
    const config = AWARD_TYPES[type];
    if (!config) {
      return sendJson(res, createErrorResponse(`未知奖项类型: ${type}`, 'INVALID_AWARD_TYPE', 400));
    }
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || config.limit));
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
