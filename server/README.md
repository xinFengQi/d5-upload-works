# 作品上传系统 - Node 服务端

- 数据库：SQLite（`data/app.db`），**部署时务必挂载持久化卷**，详见 [DEPLOY.md](./DEPLOY.md)。
- 接口：`/api/auth/*`、`/api/upload`、`/api/works`、`/api/vote`、`/api/screen-config`、`/api/judge/*`。健康检查：`GET /health`。

## 本地运行（开发环境前后端分离）

**本服务仅提供 API，不提供前端静态：**

```bash
cd server
npm install
cp .env.example .env   # 编辑 .env 填写配置
node db/init.js        # 可选，首次初始化表
npm start              # 默认 http://localhost:8080
```

前端在 `frontend-vue` 下单独运行：`npm run dev`（默认 5173），通过 Vite 的 `proxy` 将 `/api` 转发到本机 8080。钉钉回调等需在 `.env` 中配置 `ALLOWED_REDIRECT_ORIGINS` 包含 `http://localhost:5173`。

**生产环境**：可仍由本服务挂载 `frontend-vue/dist`（需先 `npm run build`），或由 Nginx 提供静态并代理 `/api` 到本服务。
