# 安全风险排查说明

## 高 / 中风险

### 1. 开放重定向 + Token 泄露（已修复）

- **位置**：`server/routes/auth.js` 回调与 `/exchange` 中，`frontend_origin` 来自 query。
- **问题**：若攻击者构造 `frontend_origin=https://evil.com`，登录成功后会被重定向到 `https://evil.com/?token=xxx`，导致 token 泄露。
- **修复**：仅信任配置的白名单（如 `FRONTEND_ORIGIN`），不在白名单的 `frontend_origin` 一律忽略，使用当前请求 host 或默认前端地址。

### 2. CORS 过于宽松

- **位置**：`server/app.js` 中 `cors({ origin: true, credentials: true })`。
- **问题**：`origin: true` 会反射任意请求来源，任意站点都可发起带 Cookie/凭证的跨域请求，易被滥用。
- **建议**：生产环境改为固定前端域名，例如 `origin: process.env.FRONTEND_ORIGIN || 'https://your-app.com'`，或使用数组配置多个允许的 origin。

### 3. 无接口限流

- **问题**：未对登录、投票、上传、评委评分等接口做限流，存在暴力破解（如管理员密码）、刷票、恶意上传等风险。
- **建议**：使用 `express-rate-limit` 等对 `/api/auth/admin`、`/api/vote`、`/api/upload`、`/api/judge/score` 等做按 IP 或按用户的限流。

### 4. 错误信息可能暴露内部细节

- **位置**：如 `auth.js` 中 `createErrorResponse(\`钉钉登录失败: ${err.message}\`, ...)`、`upload.js` 中返回 `err.message`。
- **问题**：将后端/第三方错误原文返回给前端，可能暴露路径、配置或内部逻辑。
- **建议**：生产环境统一返回通用错误文案，详细错误仅写日志；或根据 `NODE_ENV` / `ENVIRONMENT` 区分是否返回 `err.message`。

---

## 低风险 / 已知限制

### 5. Token 出现在 URL 中

- **位置**：钉钉回调重定向到 `/?token=xxx`。
- **问题**：Token 可能进入浏览器历史、Referer、代理/日志。
- **建议**：可考虑改为“一次性 code + 前端换 token”，或使用 fragment（#token）并前端立即取走后清除。

### 6. 管理员登录无失败次数限制

- **位置**：`POST /api/auth/admin`。
- **问题**：仅校验密码，无锁定或延迟，易被暴力尝试。
- **建议**：在限流基础上，可增加连续失败次数限制或短暂锁定。

### 7. 钉钉用户信息日志

- **位置**：`server/services/dingtalk.js` 中有“打印钉钉返回的全部用户信息（调试用）”注释。
- **问题**：若启用 `console.log(userData)`，会记录手机、邮箱等 PII。
- **建议**：生产环境不要打印完整 userData；若需调试，仅打印非敏感字段或脱敏。

### 8. 钉钉 API 中 appsecret 在 URL/请求体中

- **说明**：钉钉部分接口要求传 `clientSecret`，属官方 API 设计，项目已注明；需确保日志、监控不记录含 secret 的完整 URL/body。

---

## 已做得较好的部分

- **SQL**：查询均使用参数化（`?` 占位），未拼接用户输入，SQL 注入风险低。
- **会话**：Token 使用 `crypto.randomBytes(32)` 生成，过期与退出时删除 session。
- **上传**：校验 MIME 白名单、大小、登录态；OSS key 使用服务端生成的 `workId`，避免路径遍历。
- **权限**：删除作品、配置、评委评分等使用 `requireAdmin` / `requireJudge`，接口有身份校验。
- **敏感配置**：密钥通过环境变量配置，`.gitignore` 已包含 `.env`。

---

## 建议优先处理顺序

1. 修复开放重定向（白名单 `frontend_origin`）——**已实现**  
2. 生产环境收紧 CORS（固定或白名单 origin）  
3. 为敏感接口增加限流（登录、投票、上传、评分）  
4. 生产环境统一收口错误响应，不直接返回 `err.message`
