# Durable Objects 设置指南

## 什么是 Durable Objects？

**Durable Objects** 是 Cloudflare 提供的强一致性存储服务，与 Workers KV 的区别：

| 特性 | Workers KV | Durable Objects |
|------|-----------|-----------------|
| 一致性 | 最终一致性 | 强一致性 |
| 原子性 | ❌ 不支持 | ✅ 支持 |
| 事务 | ❌ 不支持 | ✅ 支持 |
| 适用场景 | 缓存、配置 | 计数器、状态管理 |

**D1 数据库** 是 Cloudflare 的 SQLite 数据库，适合复杂查询和关系型数据。对于投票计数这种简单场景，Durable Objects 更合适。

## 已完成的修改

### 1. 创建了 Durable Object 类
- `src/durable-objects/vote-counter.ts` - 投票计数器实现

### 2. 创建了服务封装
- `src/services/vote-counter.ts` - 封装 Durable Objects 调用

### 3. 更新了配置
- `wrangler.toml` - 添加了 Durable Objects 绑定
- `src/types/env.d.ts` - 添加了类型定义
- `src/index.ts` - 导出了 Durable Objects

### 4. 修改了投票逻辑
- `src/routes/vote.ts` - 使用 Durable Objects 进行投票
- `src/routes/works.ts` - 使用 Durable Objects 获取投票数

## 部署步骤

### 第一步：部署到 Cloudflare

```bash
npm run deploy
```

首次部署时，Wrangler 会自动创建 Durable Objects 类。

### 第二步：验证部署

部署后，检查 Cloudflare Dashboard：
1. 进入 **Workers & Pages** > **Durable Objects**
2. 应该能看到 `VoteCounter` 类已创建

### 第三步：测试

1. 测试投票功能：
   ```bash
   curl -X POST http://your-worker.workers.dev/api/vote \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"workId":"work_123"}'
   ```

2. 检查投票数是否正确：
   ```bash
   curl http://your-worker.workers.dev/api/vote/stats?workId=work_123 \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## 工作原理

### 投票流程（使用 Durable Objects）

```
用户投票请求
    ↓
Workers 路由处理
    ↓
VoteCounterService 获取 Durable Object 实例
    ↓
Durable Object 执行原子操作：
  - 检查是否已投票
  - 增加投票数
  - 记录投票者
    ↓
返回结果（强一致性保证）
```

### 每个作品有独立的计数器

- 使用 `workId` 作为 Durable Object 的 ID
- 每个作品都有自己独立的计数器实例
- 所有对该作品的投票操作都在同一个实例中执行（保证原子性）

## 优势

### ✅ 解决的问题

1. **原子性保证**：投票计数操作是原子的，不会丢失
2. **强一致性**：读取的数据始终是最新的
3. **并发安全**：多个用户同时投票不会冲突
4. **数据准确**：投票数完全准确，不会出现计数错误

### 📊 性能

- **延迟**：与 Workers KV 相当（边缘计算）
- **成本**：免费额度内完全免费（每天 30,000 请求）
- **扩展性**：支持高并发投票

## 注意事项

### 1. 首次部署

首次部署时，Wrangler 会自动创建 Durable Objects 类。如果遇到错误，可能需要手动创建：

```bash
wrangler durable-objects create VoteCounter
```

### 2. 数据迁移

如果之前使用 KV 存储投票数据，需要迁移：

1. 旧数据在 KV 中（`vote:count:{workId}`）
2. 新数据在 Durable Objects 中
3. 可以编写迁移脚本，将 KV 数据导入 Durable Objects

### 3. 开发环境

本地开发时，Durable Objects 会自动创建模拟实例，无需额外配置。

## 故障排查

### 问题：部署失败，提示 Durable Objects 未找到

**解决方案**：
```bash
# 手动创建 Durable Objects 类
wrangler durable-objects create VoteCounter
```

### 问题：投票数不准确

**检查**：
1. 确认使用的是 Durable Objects（检查日志）
2. 确认没有同时使用 KV 的投票计数逻辑

### 问题：性能问题

**优化**：
1. Durable Objects 有内存缓存，性能应该很好
2. 如果遇到问题，检查是否有大量并发请求

## 成本

### 免费额度
- 每天 30,000 个请求（免费）
- 前 10 GB 存储（免费）

### 付费部分（超出免费额度）
- 每百万请求：约 $0.15
- 每 GB 存储：约 $0.20/月

### 年会投票场景估算
- 500 人 × 10 票 = 5,000 次投票
- 完全在免费额度内 ✅

## 下一步

1. 部署并测试
2. 监控投票数据的准确性
3. 如果一切正常，可以考虑移除 KV 中的投票计数逻辑（保留投票记录用于查询）
