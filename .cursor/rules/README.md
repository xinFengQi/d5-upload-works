# Cursor 项目规则

本目录包含项目的 Cursor AI 规则文件，用于指导 AI 助手理解和生成符合项目规范的代码。

## 规则文件说明

### 始终应用 (Always Apply)
这些规则会在每个聊天会话中自动应用：

- **project-overview.mdc**: 项目概述、技术栈和整体架构说明
- **code-standards.mdc**: TypeScript 代码规范、错误处理和响应格式标准
- **security.mdc**: 安全规范（密钥管理、API 安全、数据验证）

### 智能应用 (Apply Intelligently)
这些规则会根据上下文自动应用：

- **environment.mdc**: 环境变量配置规范（在编辑 env.ts、.dev.vars、wrangler.toml 时应用）

### 特定文件应用 (Apply to Specific Files)
这些规则在匹配特定文件模式时应用：

- **routes.mdc**: 路由处理规范和 API 端点设计（应用于 `routes/**/*.ts` 和 `router.ts`）
- **services.mdc**: 服务层设计规范和实现标准（应用于 `services/**/*.ts`）
- **types.mdc**: TypeScript 类型定义规范（应用于 `types/**/*.ts`）

## 规则类型说明

根据 Cursor 官方文档，规则类型包括：

1. **Always Apply**: 始终应用，适用于核心规范和架构说明
2. **Apply Intelligently**: 智能应用，根据描述判断相关性
3. **Apply to Specific Files**: 特定文件应用，使用 `globs` 模式匹配
4. **Apply Manually**: 手动应用，在聊天中使用 `@rule-name` 引用

## 如何添加新规则

1. 在 `.cursor/rules/` 目录下创建新的 `.md` 或 `.mdc` 文件
2. 使用 frontmatter 配置规则元数据：
   ```markdown
   ---
   description: "规则描述"
   alwaysApply: false
   globs:
     - "**/pattern/**/*.ts"
   ---
   ```
3. 在 Cursor Settings → Rules 中查看和管理规则

## 规则最佳实践

- 保持规则聚焦和可操作
- 控制在 500 行以内
- 提供具体示例或参考文件
- 避免模糊的指导
- 引用文件而不是复制内容

更多信息请参考 [Cursor 规则文档](https://cursor.com/cn/docs/context/rules)
