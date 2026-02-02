/**
 * SQLite 数据库连接与初始化
 * 数据文件路径：data/app.db（部署时需挂载持久化卷，避免重新部署丢失数据）
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDb() {
  ensureDataDir();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

function hasColumn(db, table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === column);
}

function initSchema(db) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
  // 兼容旧库：为 screen_config 补充新列（若表已存在且缺列则执行）
  try {
    const hasScreenConfig = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='screen_config'").get();
    if (hasScreenConfig) {
      if (!hasColumn(db, 'screen_config', 'max_votes_per_user')) {
        db.exec('ALTER TABLE screen_config ADD COLUMN max_votes_per_user INTEGER DEFAULT 1');
        db.prepare('UPDATE screen_config SET max_votes_per_user = 1 WHERE max_votes_per_user IS NULL').run();
      }
      if (!hasColumn(db, 'screen_config', 'judges_json')) {
        db.exec('ALTER TABLE screen_config ADD COLUMN judges_json TEXT');
        db.prepare('UPDATE screen_config SET judges_json = ? WHERE judges_json IS NULL').run('[]');
      }
    }
    const hasJudgeScores = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='judge_scores'").get();
    if (!hasJudgeScores) {
      db.exec(`CREATE TABLE judge_scores (
        work_id TEXT NOT NULL,
        judge_email TEXT NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 100),
        created_at INTEGER NOT NULL,
        PRIMARY KEY (work_id, judge_email),
        FOREIGN KEY (work_id) REFERENCES works(id)
      )`);
      db.exec('CREATE INDEX IF NOT EXISTS idx_judge_scores_work ON judge_scores(work_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_judge_scores_judge ON judge_scores(judge_email)');
    }
  } catch (e) {
    console.error('Migration error:', e);
  }
}

let dbInstance = null;

function getDbInstance() {
  if (!dbInstance) {
    dbInstance = getDb();
    initSchema(dbInstance);
  }
  return dbInstance;
}

module.exports = {
  getDb: getDbInstance,
  DB_PATH,
  DATA_DIR,
  initSchema,
};
