/**
 * 大屏配置路由
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { createSuccessResponse, createErrorResponse, sendJson } = require('../utils/response');
const { requireAdmin } = require('../middleware/auth');

const DEFAULT_THEME = {
  primaryColor: '#2563eb',
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',
  secondaryColor: '#64748b',
};

function parseTheme(themeJson) {
  if (!themeJson) return DEFAULT_THEME;
  try {
    const t = typeof themeJson === 'string' ? JSON.parse(themeJson) : themeJson;
    return { ...DEFAULT_THEME, ...t };
  } catch {
    return DEFAULT_THEME;
  }
}

function parseJudges(judgesJson) {
  if (judgesJson == null || judgesJson === '') return [];
  try {
    const arr = typeof judgesJson === 'string' ? JSON.parse(judgesJson) : judgesJson;
    return Array.isArray(arr) ? arr.filter((e) => typeof e === 'string') : [];
  } catch {
    return [];
  }
}

// 获取配置
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(
      'SELECT grid_layout, theme_json, max_votes_per_user, judges_json, vote_open_start, vote_open_end, score_open_start, score_open_end, updated_at FROM screen_config WHERE id = 1'
    ).get();
    if (!row) {
      return sendJson(res, createSuccessResponse({
        gridLayout: '2x2',
        updatedAt: Date.now(),
        theme: DEFAULT_THEME,
        maxVotesPerUser: 1,
        judges: [],
        voteOpenStart: null,
        voteOpenEnd: null,
        scoreOpenStart: null,
        scoreOpenEnd: null,
      }));
    }
    const theme = parseTheme(row.theme_json);
    const maxVotesPerUser = row.max_votes_per_user != null ? Number(row.max_votes_per_user) : 1;
    const judges = parseJudges(row.judges_json);
    const voteOpenStart = row.vote_open_start != null ? Number(row.vote_open_start) : null;
    const voteOpenEnd = row.vote_open_end != null ? Number(row.vote_open_end) : null;
    const scoreOpenStart = row.score_open_start != null ? Number(row.score_open_start) : null;
    const scoreOpenEnd = row.score_open_end != null ? Number(row.score_open_end) : null;
    sendJson(res, createSuccessResponse({
      gridLayout: row.grid_layout,
      updatedAt: row.updated_at,
      theme,
      maxVotesPerUser,
      judges,
      voteOpenStart,
      voteOpenEnd,
      scoreOpenStart,
      scoreOpenEnd,
    }));
  } catch (err) {
    console.error('Get screen config error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

// 简单邮箱格式校验
function isEmailLike(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// 将时间转为时间戳（支持 ISO 字符串或数字 ms），无效返回 null
function parseTime(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isNaN(n) && n > 0) return n;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

// 保存配置（仅管理员）
router.post('/', requireAdmin, (req, res) => {
  try {
    const { gridLayout, theme, maxVotesPerUser, judges, voteOpenStart, voteOpenEnd, scoreOpenStart, scoreOpenEnd } = req.body || {};
    const allowed = ['2x2', '2x3', '3x2', '3x3', '4x4'];
    if (gridLayout != null && gridLayout !== '' && !allowed.includes(gridLayout)) {
      return sendJson(res, createErrorResponse('Invalid gridLayout. Must be one of: 2x2, 2x3, 3x2, 3x3, 4x4', 'INVALID_REQUEST', 400));
    }
    const hex = /^#[0-9A-Fa-f]{6}$/;
    if (theme) {
      if (theme.primaryColor && !hex.test(theme.primaryColor)) return sendJson(res, createErrorResponse('Invalid primaryColor', 'INVALID_REQUEST', 400));
      if (theme.primaryDark && !hex.test(theme.primaryDark)) return sendJson(res, createErrorResponse('Invalid primaryDark', 'INVALID_REQUEST', 400));
      if (theme.primaryLight && !hex.test(theme.primaryLight)) return sendJson(res, createErrorResponse('Invalid primaryLight', 'INVALID_REQUEST', 400));
      if (theme.secondaryColor && !hex.test(theme.secondaryColor)) return sendJson(res, createErrorResponse('Invalid secondaryColor', 'INVALID_REQUEST', 400));
    }
    if (maxVotesPerUser != null) {
      const n = Number(maxVotesPerUser);
      if (Number.isNaN(n) || n < 1 || n > 100) {
        return sendJson(res, createErrorResponse('每人每天最多投票数须为 1–100 的整数', 'INVALID_REQUEST', 400));
      }
    }
    if (judges != null) {
      if (!Array.isArray(judges)) {
        return sendJson(res, createErrorResponse('评委须为邮箱数组', 'INVALID_REQUEST', 400));
      }
      const invalid = judges.find((e) => !isEmailLike(e));
      if (invalid !== undefined) {
        return sendJson(res, createErrorResponse(`无效评委邮箱: ${invalid}`, 'INVALID_REQUEST', 400));
      }
    }
    const vs = parseTime(voteOpenStart);
    const ve = parseTime(voteOpenEnd);
    const ss = parseTime(scoreOpenStart);
    const se = parseTime(scoreOpenEnd);
    if (vs != null && ve != null && vs > ve) {
      return sendJson(res, createErrorResponse('投票开放开始时间不能晚于结束时间', 'INVALID_REQUEST', 400));
    }
    if (ss != null && se != null && ss > se) {
      return sendJson(res, createErrorResponse('评分开放开始时间不能晚于结束时间', 'INVALID_REQUEST', 400));
    }

    const db = getDb();
    const existing = db.prepare(
      'SELECT grid_layout, theme_json, max_votes_per_user, judges_json, vote_open_start, vote_open_end, score_open_start, score_open_end FROM screen_config WHERE id = 1'
    ).get();
    const now = Date.now();
    const finalLayout = gridLayout ?? existing?.grid_layout ?? '2x2';
    const finalTheme = theme ? { ...parseTheme(existing?.theme_json), ...theme } : parseTheme(existing?.theme_json);
    const themeStr = JSON.stringify(finalTheme);
    const finalMaxVotes = maxVotesPerUser != null ? Math.min(100, Math.max(1, Number(maxVotesPerUser))) : (existing?.max_votes_per_user != null ? Number(existing.max_votes_per_user) : 1);
    const finalJudges = judges != null ? judges.filter((e) => isEmailLike(e)) : parseJudges(existing?.judges_json);
    const judgesStr = JSON.stringify(finalJudges);
    const finalVoteStart = voteOpenStart !== undefined ? vs : (existing?.vote_open_start != null ? Number(existing.vote_open_start) : null);
    const finalVoteEnd = voteOpenEnd !== undefined ? ve : (existing?.vote_open_end != null ? Number(existing.vote_open_end) : null);
    const finalScoreStart = scoreOpenStart !== undefined ? ss : (existing?.score_open_start != null ? Number(existing.score_open_start) : null);
    const finalScoreEnd = scoreOpenEnd !== undefined ? se : (existing?.score_open_end != null ? Number(existing.score_open_end) : null);

    const updateResult = db.prepare(
      'UPDATE screen_config SET grid_layout = ?, theme_json = ?, max_votes_per_user = ?, judges_json = ?, vote_open_start = ?, vote_open_end = ?, score_open_start = ?, score_open_end = ?, updated_at = ? WHERE id = 1'
    ).run(finalLayout, themeStr, finalMaxVotes, judgesStr, finalVoteStart, finalVoteEnd, finalScoreStart, finalScoreEnd, now);
    if (updateResult.changes === 0) {
      db.prepare(
        'INSERT INTO screen_config (id, grid_layout, theme_json, max_votes_per_user, judges_json, vote_open_start, vote_open_end, score_open_start, score_open_end, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(finalLayout, themeStr, finalMaxVotes, judgesStr, finalVoteStart, finalVoteEnd, finalScoreStart, finalScoreEnd, now);
    }

    sendJson(res, createSuccessResponse({
      gridLayout: finalLayout,
      updatedAt: now,
      theme: finalTheme,
      maxVotesPerUser: finalMaxVotes,
      judges: finalJudges,
      voteOpenStart: finalVoteStart,
      voteOpenEnd: finalVoteEnd,
      scoreOpenStart: finalScoreStart,
      scoreOpenEnd: finalScoreEnd,
    }));
  } catch (err) {
    console.error('Save screen config error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

module.exports = router;
