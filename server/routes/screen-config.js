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

// 获取配置
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT grid_layout, theme_json, updated_at FROM screen_config WHERE id = 1').get();
    if (!row) {
      return sendJson(res, createSuccessResponse({
        gridLayout: '2x2',
        updatedAt: Date.now(),
        theme: DEFAULT_THEME,
      }));
    }
    const theme = parseTheme(row.theme_json);
    sendJson(res, createSuccessResponse({
      gridLayout: row.grid_layout,
      updatedAt: row.updated_at,
      theme,
    }));
  } catch (err) {
    console.error('Get screen config error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

// 保存配置（仅管理员）
router.post('/', requireAdmin, (req, res) => {
  try {
    const { gridLayout, theme } = req.body || {};
    const allowed = ['2x2', '2x3', '3x2', '3x3', '4x4'];
    if (gridLayout && !allowed.includes(gridLayout)) {
      return sendJson(res, createErrorResponse('Invalid gridLayout. Must be one of: 2x2, 2x3, 3x2, 3x3, 4x4', 'INVALID_REQUEST', 400));
    }
    const hex = /^#[0-9A-Fa-f]{6}$/;
    if (theme) {
      if (theme.primaryColor && !hex.test(theme.primaryColor)) return sendJson(res, createErrorResponse('Invalid primaryColor', 'INVALID_REQUEST', 400));
      if (theme.primaryDark && !hex.test(theme.primaryDark)) return sendJson(res, createErrorResponse('Invalid primaryDark', 'INVALID_REQUEST', 400));
      if (theme.primaryLight && !hex.test(theme.primaryLight)) return sendJson(res, createErrorResponse('Invalid primaryLight', 'INVALID_REQUEST', 400));
      if (theme.secondaryColor && !hex.test(theme.secondaryColor)) return sendJson(res, createErrorResponse('Invalid secondaryColor', 'INVALID_REQUEST', 400));
    }

    const db = getDb();
    const existing = db.prepare('SELECT grid_layout, theme_json FROM screen_config WHERE id = 1').get();
    const now = Date.now();
    const finalLayout = gridLayout || existing?.grid_layout || '2x2';
    const finalTheme = theme || parseTheme(existing?.theme_json) || DEFAULT_THEME;
    const themeStr = JSON.stringify(finalTheme);

    db.prepare('INSERT OR REPLACE INTO screen_config (id, grid_layout, theme_json, updated_at) VALUES (1, ?, ?, ?)').run(finalLayout, themeStr, now);

    sendJson(res, createSuccessResponse({
      gridLayout: finalLayout,
      updatedAt: now,
      theme: finalTheme,
    }));
  } catch (err) {
    console.error('Save screen config error:', err);
    sendJson(res, createErrorResponse('Internal server error', 'INTERNAL_ERROR', 500));
  }
});

module.exports = router;
