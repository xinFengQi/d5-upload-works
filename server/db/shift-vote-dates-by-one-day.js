/**
 * 将 votes 表中所有 vote_date 向过去平移一天（例如 2026-02-04 → 2026-02-03），便于今天可继续投票测试
 * 用法：在 server 目录下执行 node db/shift-vote-dates-by-one-day.js
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
  console.error('数据库文件不存在:', DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);
const hasVotes = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='votes'").get();
if (!hasVotes) {
  console.error('votes 表不存在');
  db.close();
  process.exit(1);
}
if (!hasColumn(db, 'votes', 'vote_date')) {
  console.error('votes 表无 vote_date 列，请先执行 vote_date 迁移');
  db.close();
  process.exit(1);
}

try {
  // SQLite: date(vote_date, '-1 day') 向过去一天
  const result = db.prepare(`
    UPDATE votes SET vote_date = date(vote_date, '-1 day')
  `).run();
  console.log('已将全部投票日期向过去平移一天，影响行数:', result.changes);
} catch (e) {
  console.error('执行失败:', e);
  db.close();
  process.exit(1);
}
db.close();
console.log('完成');
