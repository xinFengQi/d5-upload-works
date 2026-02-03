/**
 * Express 应用：API 路由 + 开发时静态前端
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const worksRoutes = require('./routes/works');
const voteRoutes = require('./routes/vote');
const screenConfigRoutes = require('./routes/screen-config');
const judgeRoutes = require('./routes/judge');

const app = express();

// 配置挂到 app.locals，供路由使用
app.locals.config = {
  ALIYUN_OSS_ACCESS_KEY_ID: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  ALIYUN_OSS_ACCESS_KEY_SECRET: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
  ALIYUN_OSS_REGION: process.env.ALIYUN_OSS_REGION,
  ALIYUN_OSS_BUCKET: process.env.ALIYUN_OSS_BUCKET,
  /** RAM 角色 ARN，用于 STS 临时凭证（前端直传 OSS）。格式：acs:ram::账号ID:role/角色名 */
  ALIYUN_RAM_ROLE_ARN: process.env.ALIYUN_RAM_ROLE_ARN || '',
  DINGTALK_APP_KEY: process.env.DINGTALK_APP_KEY,
  DINGTALK_APP_SECRET: process.env.DINGTALK_APP_SECRET,
  DINGTALK_REDIRECT_URI: process.env.DINGTALK_REDIRECT_URI,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ENVIRONMENT: process.env.ENVIRONMENT,
  /** 允许的回调重定向域名，逗号分隔，如 https://localhost:5173,https://your-app.com；不设则仅用当前请求 host */
  ALLOWED_REDIRECT_ORIGINS: process.env.ALLOWED_REDIRECT_ORIGINS || '',
};

// 静态资源：Vue 构建产物在 frontend-vue/dist（需先在 frontend-vue 下执行 npm run build）
const frontendPath = path.join(__dirname, '..', 'frontend-vue', 'dist');
app.use(express.static(frontendPath, { index: false }));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/screen-config', screenConfigRoutes);
app.use('/api/judge', judgeRoutes);

// SPA 回退：非 API 请求先尝试静态文件，失败则返回 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const file = path.join(frontendPath, req.path);
  res.sendFile(file, (err) => {
    if (err) res.sendFile(path.join(frontendPath, 'index.html'));
  });
});

module.exports = app;
