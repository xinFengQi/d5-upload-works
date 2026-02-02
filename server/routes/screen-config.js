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
    const row = db.prepare('SELECT grid_layout, theme_json, max_votes_per_user, judges_json, updated_at FROM screen_config WHERE id = 1').get();
    if (!row) {
      return sendJson(res, createSuccessResponse({
        gridLayout: '2x2',
        updatedAt: Date.now(),
        theme: DEFAULT_THEME,
        maxVotesPerUser: 1,
        judges: [],
      }));
    }
    const theme = parseTheme(row.theme_json);
    const maxVotesPerUser = row.max_votes_per_user != null ? Number(row.max_votes_per_user) : 1;
    const judges = parseJudges(row.judges_json);
    sendJson(res, createSuccessResponse({
      gridLayout: row.grid_layout,
      updatedAt: row.updated_at,
      theme,
      maxVotesPerUser,
      judges,
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

// 保存配置（仅管理员）
router.post('/', requireAdmin, (req, res) => {
  try {
    const { gridLayout, theme, maxVotesPerUser, judges } = req.body || {};
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
        return sendJson(res, createErrorResponse('每人最多投票数须为 1–100 的整数', 'INVALID_REQUEST', 400));
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

    const db = getDb();
    const existing = db.prepare('SELECT grid_layout, theme_json, max_votes_per_user, judges_json FROM screen_config WHERE id = 1').get();
    const now = Date.now();
    const finalLayout = gridLayout ?? existing?.grid_layout ?? '2x2';
    const finalTheme = theme ? { ...parseTheme(existing?.theme_json), ...theme } : parseTheme(existing?.theme_json);
    const themeStr = JSON.stringify(finalTheme);
    const finalMaxVotes = maxVotesPerUser != null ? Math.min(100, Math.max(1, Number(maxVotesPerUser))) : (existing?.max_votes_per_user != null ? Number(existing.max_votes_per_user) : 1);
    const finalJudges = judges != null ? judges.filter((e) => isEmailLike(e)) : parseJudges(existing?.judges_json);
    const judgesStr = JSON.stringify(finalJudges);

    const updateResult = db.prepare(
      'UPDATE screen_config SET grid_layout = ?, theme_json = ?, max_votes_per_user = ?, judges_json = ?, updated_at = ? WHERE id = 1'
    ).run(finalLayout, themeStr, finalMaxVotes, judgesStr, now);
    if (updateResult.changes === 0) {
      db.prepare(
        'INSERT INTO screen_config (id, grid_layout, theme_json, max_votes_per_user, judges_json, updated_at) VALUES (1, ?, ?, ?, ?, ?)'
      ).run(finalLayout, themeStr, finalMaxVotes, judgesStr, now);
    }

    sendJson(res, createSuccessResponse({
      gridLayout: finalLayout,
      updatedAt: now,
      theme: finalTheme,
      maxVotesPerUser: finalMaxVotes,
      judges: finalJudges,
    }));
  } catch (err) {
    console.error('Save screen config error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

module.exports = router;
