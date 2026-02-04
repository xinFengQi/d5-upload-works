# 作品上传与投票系统

基于 **Node.js + Express + SQLite** 的作品上传与投票系统，支持钉钉登录、阿里云 OSS 文件存储、投票统计、评委评分和多屏播放。前端为 **Vue 3 + Vite** 单页应用，构建后由 Node 或 Nginx 提供。

## 技术栈

- **服务端**: Node.js + Express
- **数据库**: SQLite（better-sqlite3），数据文件 `server/data/app.db`
- **文件存储**: 阿里云 OSS（REST API）
- **认证**: 钉钉 OAuth 2.0
- **前端**: Vue 3 + Vite，构建产物在 `frontend-vue/dist/`，由 Node 或 Nginx 提供

## 目录结构

```
├── server/           # Node 服务端（API + 可提供前端静态）
├── frontend-vue/     # Vue 前端（需 npm run build 后由 server 或 Nginx 提供 dist）
├── ecosystem.config.cjs  # PM2 配置（在项目根目录）
├── package.json
└── README.md
```

## 环境要求

- Node.js >= 18
- npm >= 9

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

在 `server/` 下复制 `.env.example` 为 `.env`，填写：

- 阿里云 OSS：`ALIYUN_OSS_ACCESS_KEY_ID`、`ALIYUN_OSS_ACCESS_KEY_SECRET`、`ALIYUN_OSS_REGION`、`ALIYUN_OSS_BUCKET`
- 钉钉：`DINGTALK_APP_KEY`、`DINGTALK_APP_SECRET`、`DINGTALK_REDIRECT_URI`
- 管理员：`ADMIN_PASSWORD`
- 可选：`PORT`（默认 8080）、`ENVIRONMENT`

### 3. 初始化数据库（可选）

```bash
cd server
node db/init.js
```

### 4. 启动服务（开发环境前后端分离）

**后端（仅 API，默认 8080）：**

```bash
cd server
npm start
```

**前端（Vue 开发服务器，默认 5173，会代理 /api 到后端）：**

```bash
cd frontend-vue
npm install
npm run dev
```

浏览器访问 **`http://localhost:5173`**。前端会把 `/api` 请求代理到 `http://localhost:8080`，无需 Node 提供静态资源。

或从项目根目录只启动后端：`npm start`（会执行 `node server/server.js`）。

## 部署说明

- **端口**：默认 8080，可通过环境变量 `PORT` 修改。
- **进程守护**：推荐使用 PM2，在项目根目录执行 `pm2 start ecosystem.config.cjs`，异常退出会自动重启。详见 `server/DEPLOY.md`。
- **数据持久化**：`server/data/` 必须放在持久化存储（挂载卷），否则重新部署会丢失数据。
- **生产环境**：建议 Nginx 提供静态资源，并将 `/api`、`/auth` 反向代理到 Node（默认 8080）。示例配置见 `server/DEPLOY.md`。

## 主要接口（均以 `/api` 为前缀，除健康检查外）

- **认证**：`GET /api/auth/dingtalk`、`GET /api/auth/callback`、`GET /api/auth/exchange`、`GET /api/auth/me`、`POST /api/auth/admin`、`POST /api/auth/logout`
- **上传**：`GET /api/upload/sts-credentials`、`POST /api/upload/complete`、`POST /api/upload`（需登录，文件上限 1GB）
- **作品**：`GET /api/works`、`GET /api/works/top`、`DELETE /api/works/:workId`（管理员）
- **投票**：`POST /api/vote`、`DELETE /api/vote`、`GET /api/vote/stats`、`GET /api/vote/user/count`、`GET /api/vote/users`（管理员）；受「投票开放时间」与「每人最多投票数」配置限制（管理员与普通用户一视同仁）
- **大屏配置**：`GET /api/screen-config`、`POST /api/screen-config`（管理员）；含投票/评分开放时间、每人最多投票数、评委列表、主题等
- **评委/评分**：`POST /api/judge/score`（评委）、`GET /api/judge/works`、`GET /api/judge/works/:workId/scores`（评委或管理员）、`GET /api/judge/my-scores`、`GET /api/judge/categories` 等

更多说明见 `server/README.md` 与 `server/DEPLOY.md`。
