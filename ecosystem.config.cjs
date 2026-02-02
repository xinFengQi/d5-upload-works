/**
 * PM2 进程守护配置
 * 使用：在项目根目录执行 pm2 start ecosystem.config.cjs
 * 工作目录为 server/，便于加载 .env 和 data/
 */
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'd5-works',
      script: 'server.js',
      cwd: path.join(__dirname, 'server'),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 8080,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      error_file: path.join(__dirname, 'logs', 'pm2-err.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      merge_logs: true,
    },
  ],
};
