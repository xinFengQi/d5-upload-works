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
  DINGTALK_APP_KEY: process.env.DINGTALK_APP_KEY,
  DINGTALK_APP_SECRET: process.env.DINGTALK_APP_SECRET,
  DINGTALK_REDIRECT_URI: process.env.DINGTALK_REDIRECT_URI,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ENVIRONMENT: process.env.ENVIRONMENT,
};

// 静态资源最先：/css/common.css、/index.html 等直接由静态中间件返回，避免被其它中间件影响
const frontendPath = path.join(__dirname, '..', 'frontend', 'public');
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

const pageMap = {
  '/': 'index.html',
  '/login': 'login.html',
  '/upload': 'upload.html',
  '/admin': 'admin.html',
  '/screen': 'screen.html',
  '/multi-screen': 'multi-screen.html',
  '/vote-result': 'vote-result.html',
};
// 2. 页面路由：/login、/upload 等返回对应 HTML，其余回落到 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const page = pageMap[req.path];
  const file = page ? path.join(frontendPath, page) : path.join(frontendPath, req.path);
  res.sendFile(file, (err) => {
    if (err) res.sendFile(path.join(frontendPath, 'index.html'));
  });
});

module.exports = app;
