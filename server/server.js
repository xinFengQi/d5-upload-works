/**
 * Node 服务入口
 * 数据目录：data/app.db（部署时务必挂载持久化卷，避免重新部署导致数据丢失）
 */
const app = require('./app');

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Data directory: ./data (mount this in production to persist SQLite)');
});
