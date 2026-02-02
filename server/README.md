# 作品上传系统 - Node 服务端

- 数据库：SQLite（`data/app.db`），**部署时务必挂载持久化卷**，详见 [DEPLOY.md](./DEPLOY.md)。
- 接口：`/auth/*`、`/api/upload`、`/api/works`、`/api/vote`、`/api/screen-config`。

## 本地运行

```bash
cd server
npm install
cp .env.example .env   # 编辑 .env 填写配置
node db/init.js        # 可选，首次初始化表
npm start              # 默认 http://localhost:8080
```

前端静态文件在 `../frontend/public`，开发时由本服务一并提供；生产环境建议用 Nginx 提供静态并代理 `/api`、`/auth` 到本服务。
