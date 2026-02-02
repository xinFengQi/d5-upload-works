/**
 * 单独执行：为已有 screen_config 表补充 max_votes_per_user、judges_json 列
 * 用法：在 server 目录下执行 node db/migrate.js
 */
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'app.db');

function hasColumn(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === column);
}

const db = new Database(DB_PATH);
const hasScreenConfig = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='screen_config'").get();
if (!hasScreenConfig) {
  console.log('screen_config 表不存在，无需迁移');
  db.close();
  process.exit(0);
}

let done = false;
if (!hasColumn(db, 'screen_config', 'max_votes_per_user')) {
  db.exec('ALTER TABLE screen_config ADD COLUMN max_votes_per_user INTEGER DEFAULT 1');
  db.prepare('UPDATE screen_config SET max_votes_per_user = 1 WHERE max_votes_per_user IS NULL').run();
  console.log('已添加列 max_votes_per_user');
  done = true;
}
if (!hasColumn(db, 'screen_config', 'judges_json')) {
  db.exec('ALTER TABLE screen_config ADD COLUMN judges_json TEXT');
  db.prepare('UPDATE screen_config SET judges_json = ? WHERE judges_json IS NULL').run('[]');
  console.log('已添加列 judges_json');
  done = true;
}
if (!done) console.log('表已包含所需列，无需迁移');
db.close();
console.log('迁移完成');
