# 作品上传系统

基于 Cloudflare Workers 的作品上传系统，支持钉钉登录和阿里云 OSS 文件存储。

## 项目架构

### 技术栈
- **运行时**: Cloudflare Workers
- **存储**: Cloudflare Workers KV
- **文件存储**: 阿里云 OSS
- **认证**: 钉钉 OAuth 2.0
- **语言**: TypeScript

### 系统架构图

```
┌─────────────┐
│   客户端    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────┐
│  Cloudflare Workers  │
│  ┌───────────────┐   │
│  │  路由层       │   │
│  │  - auth.ts    │   │
│  │  - upload.ts  │   │
│  │  - works.ts   │   │
│  └───────┬───────┘   │
│          │           │
│  ┌───────▼───────┐   │
│  │  服务层       │   │
│  │  - oss.ts     │   │
│  │  - dingtalk.ts│   │
│  │  - kv.ts      │   │
│  └───────┬───────┘   │
└──────────┼───────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│Workers  │  │ 阿里云   │
│   KV    │  │   OSS   │
└─────────┘  └──────────┘
```

### 核心模块

1. **认证模块**: 处理钉钉 OAuth 登录，管理用户会话
2. **上传模块**: 接收文件上传请求，调用阿里云 OSS SDK
3. **作品管理**: 作品的增删改查操作
4. **存储服务**: 封装 Workers KV 操作
5. **OSS 服务**: 封装阿里云 OSS SDK 调用

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Wrangler CLI (通过 npm 安装)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.dev.vars.example` 文件为 `.dev.vars`：

```bash
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars` 文件，填写以下环境变量：

```toml
# 阿里云 OSS 配置
ALIYUN_OSS_ACCESS_KEY_ID=your_access_key_id
ALIYUN_OSS_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your_bucket_name

# 钉钉应用配置
DINGTALK_APP_KEY=your_app_key
DINGTALK_APP_SECRET=your_app_secret
DINGTALK_REDIRECT_URI=https://your-domain.com/auth/callback

# 会话密钥（用于加密 session token）
SESSION_SECRET=your_random_secret_string
```

### 3. 配置 Wrangler

编辑 `wrangler.toml` 文件，配置 Workers KV 绑定：

```toml
[[kv_namespaces]]
binding = "MY_KV"
id = "your_kv_namespace_id"
preview_id = "your_preview_kv_namespace_id"
```

### 4. 本地开发

```bash
npm run dev
```

服务将在 `http://localhost:8787` 启动。

### 5. 部署到 Cloudflare

#### 首次部署

1. 登录 Cloudflare：
```bash
npx wrangler login
```

2. 创建 KV 命名空间：
```bash
npx wrangler kv:namespace create "MY_KV"
npx wrangler kv:namespace create "MY_KV" --preview
```

3. 配置生产环境密钥：
```bash
npx wrangler secret put ALIYUN_OSS_ACCESS_KEY_ID
npx wrangler secret put ALIYUN_OSS_ACCESS_KEY_SECRET
npx wrangler secret put ALIYUN_OSS_REGION
npx wrangler secret put ALIYUN_OSS_BUCKET
npx wrangler secret put DINGTALK_APP_KEY
npx wrangler secret put DINGTALK_APP_SECRET
npx wrangler secret put DINGTALK_REDIRECT_URI
npx wrangler secret put SESSION_SECRET
```

4. 部署：
```bash
npm run deploy
```

## 环境变量说明

### 阿里云 OSS 配置

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `ALIYUN_OSS_ACCESS_KEY_ID` | OSS AccessKey ID | 阿里云控制台 > 访问控制 > 用户 > 创建 AccessKey |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | OSS AccessKey Secret | 同上 |
| `ALIYUN_OSS_REGION` | OSS 区域 | 如：oss-cn-hangzhou, oss-cn-beijing |
| `ALIYUN_OSS_BUCKET` | OSS 存储桶名称 | 在 OSS 控制台创建存储桶 |

### 钉钉应用配置

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `DINGTALK_APP_KEY` | 钉钉应用 AppKey | 钉钉开放平台 > 应用开发 > 创建应用 |
| `DINGTALK_APP_SECRET` | 钉钉应用 AppSecret | 同上 |
| `DINGTALK_REDIRECT_URI` | 登录回调地址 | 格式：`https://your-domain.com/auth/callback` |

### 其他配置

| 变量名 | 说明 | 生成方式 |
|--------|------|----------|
| `SESSION_SECRET` | 会话加密密钥 | 使用随机字符串生成器生成，建议 32 位以上 |

## API 接口

### 认证接口

#### 1. 钉钉登录
```
GET /auth/dingtalk
```
重定向到钉钉登录页面。

#### 2. 登录回调
```
GET /auth/callback?code={code}&state={state}
```
处理钉钉登录回调，返回 session token。

#### 3. 获取当前用户
```
GET /auth/me
Headers: Authorization: Bearer {token}
```
获取当前登录用户信息。

#### 4. 退出登录
```
POST /auth/logout
Headers: Authorization: Bearer {token}
```
退出登录，清除 session。

### 上传接口

#### 1. 上传文件
```
POST /api/upload
Headers: 
  Authorization: Bearer {token}
  Content-Type: multipart/form-data
Body: file (文件)
```
上传文件到阿里云 OSS，返回文件 URL。

### 作品管理接口

#### 1. 获取作品列表
```
GET /api/works?page=1&limit=10
Headers: Authorization: Bearer {token}
```
获取当前用户的作品列表。

#### 2. 获取作品详情
```
GET /api/works/:id
Headers: Authorization: Bearer {token}
```
获取指定作品的详细信息。

#### 3. 删除作品
```
DELETE /api/works/:id
Headers: Authorization: Bearer {token}
```
删除指定作品。

## 安全注意事项

1. **密钥管理**
   - 所有密钥必须通过环境变量配置
   - 不要将 `.dev.vars` 文件提交到 Git
   - 生产环境使用 Wrangler secrets

2. **API 安全**
   - 所有需要认证的接口必须验证 token
   - 验证文件类型和大小
   - 使用 HTTPS 传输

3. **数据验证**
   - 验证所有用户输入
   - 限制文件上传大小和类型
   - 防止路径遍历攻击

## 开发指南

### 项目结构

```
src/
├── index.ts              # Workers 入口
├── routes/               # 路由处理
│   ├── auth.ts          # 认证路由
│   ├── upload.ts        # 上传路由
│   └── works.ts         # 作品路由
├── services/            # 服务层
│   ├── oss.ts           # OSS 服务
│   ├── dingtalk.ts      # 钉钉服务
│   └── kv.ts            # KV 服务
├── utils/               # 工具函数
│   ├── env.ts           # 环境变量
│   ├── response.ts      # 响应格式化
│   └── validation.ts    # 数据验证
└── types/               # 类型定义
    ├── user.ts
    ├── work.ts
    └── api.ts
```

### 添加新功能

1. 在 `src/routes/` 中添加路由处理
2. 在 `src/services/` 中添加业务逻辑
3. 在 `src/types/` 中添加类型定义
4. 在 `src/index.ts` 中注册路由

### 测试

```bash
# 本地测试
npm run dev

# 测试部署
npm run deploy -- --dry-run
```

## 常见问题

### Q: 如何获取阿里云 OSS AccessKey？
A: 登录阿里云控制台 > 访问控制 > 用户 > 创建用户 > 创建 AccessKey

### Q: 如何创建钉钉应用？
A: 登录钉钉开放平台 > 应用开发 > 创建应用 > 配置回调地址

### Q: Workers KV 有延迟怎么办？
A: Workers KV 是最终一致性存储，可能有几秒延迟。对于需要强一致性的场景，考虑使用 Durable Objects。

### Q: 如何调试 Workers？
A: 使用 `console.log` 输出日志，通过 `wrangler tail` 查看实时日志。

## 许可证

MIT
