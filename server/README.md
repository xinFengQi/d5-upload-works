# 作品上传系统 - Node 服务端

- 数据库：SQLite（`data/app.db`），**部署时务必挂载持久化卷**，详见 [DEPLOY.md](./DEPLOY.md)。
- 接口：`/api/auth/*`、`/api/upload`、`/api/works`、`/api/vote`、`/api/screen-config`、`/api/judge/*`。健康检查：`GET /health`。

## 本地运行

```bash
cd server
npm install
cp .env.example .env   # 编辑 .env 填写配置
node db/init.js        # 可选，首次初始化表
npm start              # 默认 http://localhost:8080
```

前端为 Vue 构建产物，路径 `../frontend-vue/dist`（需在 `frontend-vue` 下先执行 `npm run build`）。开发时可由本服务提供该目录；生产环境建议 Nginx 提供静态并代理 `/api` 到本服务。
