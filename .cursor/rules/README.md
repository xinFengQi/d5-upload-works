# Cursor 项目规则

本目录包含项目的 Cursor AI 规则，用于指导 AI 理解和生成符合当前项目规范的代码。

## 项目说明

本项目为 **Node 服务端 + 静态前端** 的作品上传系统：

- **服务端**：`server/`（Express + SQLite + OSS + 钉钉）
- **前端**：`frontend/public/`（静态 HTML/JS）
- 部署时数据目录 `server/data/` 需持久化，详见 `server/DEPLOY.md`。

## 规则文件说明

### 始终应用 (Always Apply)
- **project-overview.mdc**：项目概述、目录结构、核心模块与数据持久化说明
- **code-standards.mdc**：代码规范、错误处理与 API 响应格式
- **security.mdc**：密钥管理、API 安全、数据验证、会话与日志安全

### 按上下文/文件应用
- **environment.mdc**：环境变量规范（`server/.env`、`server/**/*.js`）
- **routes.mdc**：API 路由规范（`server/routes/**/*.js`、`server/app.js`）
- **services.mdc**：服务层与数据库规范（`server/services/**/*.js`、`server/db/**/*.js`）
- **types.mdc**：数据结构与约定（`server/**/*.js`）

## 规则类型

1. **Always Apply**：核心架构与规范，每次会话生效
2. **Apply via globs**：匹配到对应文件时生效（路由、服务、环境、类型等）

更多说明见 [Cursor 规则文档](https://cursor.com/docs/context/rules)。
