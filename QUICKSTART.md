# 快速开始指南

## 前置要求

1. **Node.js** >= 18.0.0
2. **npm** >= 9.0.0
3. **Cloudflare 账号**（用于部署）
4. **阿里云账号**（用于 OSS）
5. **钉钉开放平台账号**（用于登录）

## 第一步：安装依赖

```bash
npm install
```

## 第二步：配置环境变量

1. 复制环境变量模板：
```bash
cp .dev.vars.example .dev.vars
```

2. 编辑 `.dev.vars` 文件，填写以下信息：

### 获取阿里云 OSS 配置

1. 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 进入 **对象存储 OSS** > **Bucket 列表**
3. 创建或选择一个 Bucket，记录：
   - Bucket 名称
   - 区域（如：oss-cn-hangzhou）
4. 进入 **访问控制 RAM** > **用户** > **创建用户**
5. 创建 AccessKey，记录：
   - AccessKey ID
   - AccessKey Secret

### 获取钉钉应用配置

1. 登录 [钉钉开放平台](https://open.dingtalk.com/)
2. 进入 **应用开发** > **创建应用**
3. 选择 **企业内部开发** > **H5微应用**
4. 创建应用后，记录：
   - AppKey
   - AppSecret
5. 配置 **回调地址**：`http://localhost:8787/auth/callback`（开发环境）

### 生成会话密钥

使用以下命令生成随机密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 第三步：配置 Workers KV

1. 登录 Cloudflare Dashboard
2. 进入 **Workers & Pages** > **KV**
3. 创建命名空间：
   - 名称：`MY_KV`
   - 记录命名空间 ID
4. 创建预览命名空间：
   - 名称：`MY_KV_PREVIEW`
   - 记录预览命名空间 ID

5. 编辑 `wrangler.toml`，填入 KV 命名空间 ID：
```toml
# Workers KV 命名空间绑定
[[kv_namespaces]]
binding = "MY_KV"
id = "你的生产环境KV_ID"
preview_id = "你的预览环境KV_ID"

# Durable Objects 绑定（用于投票计数）
[[durable_objects.bindings]]
name = "VOTE_COUNTER"
class_name = "VoteCounter"
script_name = "d5-upload-works"
```

**注意**：Durable Objects 会在首次部署时自动创建，无需手动配置。

## 第四步：本地开发

```bash
npm run dev
```

服务将在 `http://localhost:8787` 启动。

### 测试健康检查

```bash
curl http://localhost:8787/health
```

应该返回：
```json
{"status":"ok"}
```

## 第五步：部署到 Cloudflare

### 1. 登录 Cloudflare

```bash
npx wrangler login
```

### 2. 配置生产环境密钥

```bash
# 配置阿里云 OSS
npx wrangler secret put ALIYUN_OSS_ACCESS_KEY_ID
npx wrangler secret put ALIYUN_OSS_ACCESS_KEY_SECRET
npx wrangler secret put ALIYUN_OSS_REGION
npx wrangler secret put ALIYUN_OSS_BUCKET

# 配置钉钉
npx wrangler secret put DINGTALK_APP_KEY
npx wrangler secret put DINGTALK_APP_SECRET
npx wrangler secret put DINGTALK_REDIRECT_URI

# 配置会话密钥
npx wrangler secret put SESSION_SECRET
```

**注意**：`DINGTALK_REDIRECT_URI` 需要填写生产环境的回调地址，如：`https://your-domain.com/auth/callback`

### 3. 部署

```bash
npm run deploy
```

### 4. 查看日志

```bash
npm run tail
```

## 常见问题

### Q: 如何查看 Workers 的 URL？

部署成功后，Wrangler 会显示 Workers 的 URL，格式为：
```
https://d5-upload-works.your-subdomain.workers.dev
```

### Q: 如何配置自定义域名？

1. 在 Cloudflare Dashboard 中，进入你的 Workers
2. 点击 **Triggers** > **Routes**
3. 添加自定义域名路由

### Q: 本地开发时如何测试钉钉登录？

1. 使用 [ngrok](https://ngrok.com/) 或类似工具将本地端口暴露到公网
2. 在钉钉开放平台配置回调地址为 ngrok 提供的地址
3. 更新 `.dev.vars` 中的 `DINGTALK_REDIRECT_URI`

### Q: Workers KV 有延迟怎么办？

Workers KV 是最终一致性存储，可能有几秒延迟。这是正常现象。系统已使用 Durable Objects 处理投票计数，保证强一致性。

### Q: 投票计数准确吗？

是的，系统使用 Durable Objects 实现投票计数，保证原子性和强一致性，投票数完全准确。

### Q: 如何配置多屏播放？

1. 登录管理员账号
2. 访问 `/admin` 页面
3. 在"大屏播放配置"卡片中选择布局（2x2, 2x3, 3x2, 3x3, 4x4）
4. 点击"保存配置"
5. 访问 `/multi-screen` 页面查看效果

### Q: 如何调试 Workers？

1. 使用 `console.log` 输出日志
2. 使用 `npm run tail` 查看实时日志
3. 使用 Cloudflare Dashboard 的 **Logs** 功能

## 下一步

- 查看 [README.md](./README.md) 了解完整的 API 文档和项目说明
- 查看 `.cursor/rules/` 目录中的规则文件了解开发规范
- 开始实现业务逻辑
