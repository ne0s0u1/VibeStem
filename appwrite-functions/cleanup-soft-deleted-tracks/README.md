# Cleanup Soft Deleted Tracks (Appwrite Function)

该函数用于清理 `tracks` 集合里已软删除超过 30 天的数据，并同步删除关联文件。

## 处理规则

- 仅处理满足以下条件的记录：
  - `isDeleted == true`
  - `deletedAt <= now - 30d`（可配置）
- 删除 `tracks` 文档前，先尝试删除关联文件：
  - 生成任务：`bucketId + fileId`（回退 `generated` bucket）
  - 分轨任务：`originalFileId`（uploads）、`stemVocalsId/stemDrumsId/stemBassId/stemOtherId`（stems）
  - 兼容旧字段：`fileId + bucketId`

## 目录

- 入口文件：`src/main.js`
- 依赖：`node-appwrite`

## Appwrite 控制台配置

### 1) 创建函数

- Runtime: `Node.js 18`
- Entrypoint: `src/main.js`
- Build Command: `npm install`

### 2) 设置环境变量

- `APPWRITE_DATABASE_ID`
- `APPWRITE_TRACKS_COLLECTION_ID`
- `APPWRITE_UPLOADS_BUCKET_ID`
- `APPWRITE_STEMS_BUCKET_ID`
- `APPWRITE_GENERATED_BUCKET_ID`

可选变量：

- `CLEANUP_RETENTION_DAYS`（默认 `30`）
- `CLEANUP_PAGE_SIZE`（默认 `100`）
- `CLEANUP_MAX_DOCS_PER_RUN`（默认 `500`）

### 3) 函数 Scopes

至少开启：

- `databases.read`
- `databases.write`
- `storage.read`
- `storage.write`

### 4) 定时触发（监控）

在 Function 的 Schedule 中设置每日执行，例如：

- `0 4 * * *`

## 手动验证

你可以先手动执行一次函数，检查返回 JSON：

- `docsDeleted`
- `filesDeleted`
- `docsFailed`
- `filesFailed`

如果 `docsFailed > 0`，去 Function Execution 的 Error 日志查看具体文档 ID。
