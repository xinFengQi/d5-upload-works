# 服务端部署说明

## 部署方式概览

| 方式 | 适用 | 要点 |
|------|------|------|
| **物理机/云主机** | 自有服务器、云 ECS | 代码放固定目录，`data/` 在持久化盘，Node 用 PM2 或 systemd 守护 |
| **Docker** | 容器化部署 | 镜像内只放代码，`data/` 用卷挂载到宿主机 |
| **仅 Node** | 内网/简单对外 | 不配 Nginx，Node 直接提供静态+API（开发同理） |

生产环境建议：**Nginx 提供静态 + 反向代理 API**，Node 只跑接口。

---

## 一、物理机 / 云主机部署

### 1. 上传代码

将项目放到固定目录，例如：

```bash
/var/www/d5-upload-works/
├── server/          # 服务端
├── frontend/
│   └── public/      # 前端静态
```

### 2. 安装依赖与配置

```bash
cd /var/www/d5-upload-works/server
npm install --production
cp .env.example .env
# 编辑 .env，填写 OSS、钉钉、ADMIN_PASSWORD、PORT 等
```

### 3. 初始化数据库（首次）

```bash
node db/init.js
# 确认 server/data/app.db 已生成
```

### 4. 用 PM2 守护进程（推荐）

项目根目录已提供 `ecosystem.config.cjs`，默认端口 **8080**，进程异常退出会自动重启。

```bash
# 在项目根目录
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 按提示设置开机自启
```

常用命令：

```bash
pm2 list          # 查看进程
pm2 logs d5-works # 查看日志
pm2 restart d5-works
pm2 stop d5-works
```

生产环境可带环境变量启动：

```bash
pm2 start ecosystem.config.cjs --env production
```

### 5. 配置 Nginx（推荐）

- 静态：`root` 指向 `frontend/public`
- 接口：`/api/`、`/auth/` 反向代理到 `http://127.0.0.1:8080`（默认端口 8080，可用 PORT 覆盖）

配置示例见下文「Nginx 反向代理」一节。

### 6. 数据持久化（必做）

- **不要**把 `server/data/` 放在临时盘或每次重建的目录。
- 确保 `server/data/` 所在磁盘为持久化存储，重启、重新部署后目录仍在且可写。
- 备份时包含 `server/data/*.db` 及 WAL 文件。

---

## 二、Docker 部署

### 1. 编写 Dockerfile（放在项目根或 server 目录）

示例（项目根目录下，上下文为项目根）：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server/ ./server/
COPY frontend/ ./frontend/
EXPOSE 8080
# 数据目录 /app/server/data 需在运行时挂载
CMD ["node", "server/server.js"]
```

构建：

```bash
docker build -t d5-works .
```

### 2. 运行容器（必须挂载 data）

```bash
docker run -d \
  --name d5-works \
  -p 8080:8080 \
  -v /host/path/to/data:/app/server/data \
  -e PORT=8080 \
  --env-file server/.env \
  d5-works
```

或使用命名卷：

```bash
docker volume create d5-works-data
docker run -d --name d5-works -p 8080:8080 \
  -v d5-works-data:/app/server/data \
  --env-file server/.env \
  d5-works
```

首次运行后如需建表，可执行：

```bash
docker exec d5-works node db/init.js
```

### 3. 对外访问

- 前面再加 Nginx，静态指向 `frontend/public`（或挂载到宿主机由 Nginx 提供），`/api`、`/auth` 代理到容器 8080 端口。

---

## 三、仅 Node 直接对外（不推荐生产）

不配 Nginx 时，Node 会同时提供静态和 API（与本地开发一致）：

```bash
cd server
npm install
cp .env.example .env && 编辑 .env
node db/init.js
npm start
```

访问 `http://服务器IP:8080`。适合内网或临时使用，生产建议加 Nginx。

---

## 数据持久化（重要：避免重新部署导致数据丢失）

- **数据库文件**：`data/app.db`（SQLite，含 WAL 文件）
- **部署时必须**将 `data` 目录放在**持久化存储**上，否则重启/重新部署会丢失所有数据。

### 推荐做法

1. **物理机 / 云主机**
   - 将项目部署在固定目录，例如 `/var/www/d5-upload-works/server`
   - 确保 `data/` 目录存在且可写：`mkdir -p data && chmod 755 data`
   - 不要将 `data/*.db` 放在临时盘或容器内层（未挂载卷）

2. **Docker**
   - 必须挂载数据卷到容器内 `data` 目录，例如：
   ```bash
   docker run -d \
     -p 8080:8080 \
     -v /host/path/to/data:/app/data \
     your-image
   ```
   - 或使用 Docker 命名卷：`-v d5-works-data:/app/data`

3. **PM2 / systemd**
   - 工作目录固定到带持久化磁盘的路径，确保进程的 `cwd` 下存在 `data/` 且可写。

### 首次部署

```bash
cd server
npm install
# 复制 .env.example 为 .env 并填写配置
cp .env.example .env
# 可选：单独初始化数据库
node db/init.js
npm start
```

---

## Nginx 反向代理（生产环境推荐）

- **静态资源**：由 Nginx 直接提供，减轻 Node 压力。
- **接口**：`/api/*`、`/auth/*` 代理到 Node 服务（默认 `http://127.0.0.1:8080`）。

示例配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/d5-upload-works/frontend/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 环境变量

见 `.env.example`（复制为 `.env` 后填写）：

- `PORT`：服务端口，默认 8080
- `ALIYUN_OSS_*`：阿里云 OSS
- `DINGTALK_*`：钉钉应用
- `ADMIN_PASSWORD`：管理员密码
- `ENVIRONMENT`：`development` | `production`

---

## 其他进程守护方案

除 PM2 外，可按环境选用：

| 方案 | 适用 | 说明 |
|------|------|------|
| **PM2** | 通用、Node 项目 | 自动重启、日志、集群；本项目已提供 `ecosystem.config.cjs`，推荐。 |
| **systemd** | Linux 服务器 | 系统级守护，不依赖 Node 全局包；需写 `.service` 文件，`Restart=on-failure` 即可自动重启。 |
| **Docker** | 容器部署 | 使用 `restart: always` 或 `unless-stopped`，容器退出时由 Docker 自动重启。 |
| **Supervisor** | 传统 Linux | 类似 systemd，配置 `autorestart=true`，适合多进程管理。 |

### systemd 示例（可选）

创建 `/etc/systemd/system/d5-works.service`：

```ini
[Unit]
Description=D5 Upload Works
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/d5-upload-works/server
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment=PORT=8080
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

然后：`systemctl daemon-reload && systemctl enable d5-works && systemctl start d5-works`。
