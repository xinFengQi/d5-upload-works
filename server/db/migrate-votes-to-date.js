/**
 * 单独执行：将旧 votes 表迁移为带 vote_date 的新结构（每人每天每作品一票，中国时区）
 * 用法：在 server 目录下执行 node db/migrate-votes-to-date.js
 * 若 votes 表已有 vote_date 列则跳过；否则会重建表并迁移数据。
 */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

function hasColumn(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === column);
}

if (!fs.existsSync(DB_PATH)) {
  console.log('数据库文件不存在:', DB_PATH, '，无需迁移');
  process.exit(0);
}

const db = new Database(DB_PATH);
const hasVotes = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='votes'").get();
if (!hasVotes) {
  console.log('votes 表不存在，无需迁移');
  db.close();
  process.exit(0);
}
if (hasColumn(db, 'votes', 'vote_date')) {
  console.log('votes 表已包含 vote_date 列，无需迁移');
  db.close();
  process.exit(0);
}

console.log('开始迁移 votes 表：添加 vote_date，主键改为 (work_id, user_id, vote_date)...');
try {
  db.exec(`
    CREATE TABLE votes_new (
      work_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote_date TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (work_id, user_id, vote_date),
      FOREIGN KEY (work_id) REFERENCES works(id),
      FOREIGN KEY (user_id) REFERENCES users(userid)
    )
  `);
  db.exec(`
    INSERT INTO votes_new (work_id, user_id, vote_date, created_at)
    SELECT work_id, user_id,
      strftime('%Y-%m-%d', created_at/1000, 'unixepoch', '+8 hours'),
      created_at
    FROM votes
  `);
  db.exec('DROP TABLE votes');
  db.exec('ALTER TABLE votes_new RENAME TO votes');
  db.exec('CREATE INDEX IF NOT EXISTS idx_votes_work ON votes(work_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_votes_user_date ON votes(user_id, vote_date)');
  console.log('votes 表迁移完成');
} catch (e) {
  console.error('迁移失败:', e);
  db.close();
  process.exit(1);
}
db.close();
console.log('完成');
