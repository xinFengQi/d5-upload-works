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

/** 创建并返回新的数据库连接（内部使用，对外请用 getDb 单例） */
function createConnection() {
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
      for (const col of ['vote_open_start', 'vote_open_end', 'score_open_start', 'score_open_end']) {
        if (!hasColumn(db, 'screen_config', col)) {
          db.exec(`ALTER TABLE screen_config ADD COLUMN ${col} INTEGER`);
        }
      }
    }
    const hasWorks = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='works'").get();
    if (hasWorks && !hasColumn(db, 'works', 'category')) {
      db.exec('ALTER TABLE works ADD COLUMN category TEXT');
    }
    const hasJudgeScores = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='judge_scores'").get();
    if (!hasJudgeScores) {
      db.exec(`CREATE TABLE judge_scores (
        work_id TEXT NOT NULL,
        judge_email TEXT NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 100),
        creativity_score INTEGER,
        art_score INTEGER,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (work_id, judge_email),
        FOREIGN KEY (work_id) REFERENCES works(id)
      )`);
      db.exec('CREATE INDEX IF NOT EXISTS idx_judge_scores_work ON judge_scores(work_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_judge_scores_judge ON judge_scores(judge_email)');
    } else if (!hasColumn(db, 'judge_scores', 'creativity_score')) {
      db.exec('ALTER TABLE judge_scores ADD COLUMN creativity_score INTEGER');
      db.exec('ALTER TABLE judge_scores ADD COLUMN art_score INTEGER');
    }
    const hasWorkJudgeScore = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='work_judge_score'").get();
    if (!hasWorkJudgeScore) {
      db.exec(`CREATE TABLE work_judge_score (
        work_id TEXT PRIMARY KEY,
        score REAL NOT NULL,
        judge_count INTEGER NOT NULL DEFAULT 0,
        creativity_score REAL,
        art_score REAL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (work_id) REFERENCES works(id)
      )`);
    } else if (!hasColumn(db, 'work_judge_score', 'creativity_score')) {
      db.exec('ALTER TABLE work_judge_score ADD COLUMN creativity_score REAL');
      db.exec('ALTER TABLE work_judge_score ADD COLUMN art_score REAL');
    }
    const hasWorkJudgeScoreNow = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='work_judge_score'").get();
    if (hasWorkJudgeScoreNow) {
      const count = db.prepare('SELECT COUNT(*) AS c FROM work_judge_score').get().c;
      if (count === 0) {
        const hasCreativity = hasColumn(db, 'work_judge_score', 'creativity_score');
        if (hasCreativity) {
          db.prepare(`
            INSERT INTO work_judge_score (work_id, score, judge_count, updated_at, creativity_score, art_score)
            SELECT work_id, AVG(score), COUNT(*), MAX(created_at), AVG(COALESCE(creativity_score, score/2.0)), AVG(COALESCE(art_score, score/2.0)) FROM judge_scores GROUP BY work_id
          `).run();
        } else {
          db.prepare(`
            INSERT INTO work_judge_score (work_id, score, judge_count, updated_at)
            SELECT work_id, AVG(score), COUNT(*), MAX(created_at) FROM judge_scores GROUP BY work_id
          `).run();
        }
      }
    }
    // 投票表按天：旧表无 vote_date 时迁移为 (work_id, user_id, vote_date)，中国时区日期
    const hasVotes = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='votes'").get();
    if (hasVotes && !hasColumn(db, 'votes', 'vote_date')) {
      console.log('[db] 开始迁移 votes 表：添加 vote_date，主键改为 (work_id, user_id, vote_date)');
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
      console.log('[db] votes 表迁移完成');
    }
  } catch (e) {
    console.error('Migration error:', e);
  }
}

let dbInstance = null;

function getDbInstance() {
  if (!dbInstance) {
    dbInstance = createConnection();
    initSchema(dbInstance);
  }
  return dbInstance;
}

module.exports = {
  getDb: getDbInstance,
  hasColumn,
  DB_PATH,
  DATA_DIR,
  initSchema,
};
