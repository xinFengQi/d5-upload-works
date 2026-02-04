-- 用户表（钉钉用户信息）
CREATE TABLE IF NOT EXISTS users (
  userid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  mobile TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at INTEGER NOT NULL
);

-- 会话表（session token -> 用户）
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  userid TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (userid) REFERENCES users(userid)
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 登录 state（防 CSRF）
CREATE TABLE IF NOT EXISTS auth_states (
  state TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

-- 作品表
CREATE TABLE IF NOT EXISTS works (
  id TEXT PRIMARY KEY,
  userid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  creator_name TEXT,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (userid) REFERENCES users(userid)
);
CREATE INDEX IF NOT EXISTS idx_works_created ON works(created_at DESC);

-- 投票记录表（每人每天每作品一票，按中国时区；总票数为总人次）
CREATE TABLE IF NOT EXISTS votes (
  work_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (work_id, user_id, vote_date),
  FOREIGN KEY (work_id) REFERENCES works(id),
  FOREIGN KEY (user_id) REFERENCES users(userid)
);
CREATE INDEX IF NOT EXISTS idx_votes_work ON votes(work_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_date ON votes(user_id, vote_date);

-- 评委评分明细（每评委每作品一分数，用于计算作品维度汇总）
CREATE TABLE IF NOT EXISTS judge_scores (
  work_id TEXT NOT NULL,
  judge_email TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 100),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (work_id, judge_email),
  FOREIGN KEY (work_id) REFERENCES works(id)
);
CREATE INDEX IF NOT EXISTS idx_judge_scores_work ON judge_scores(work_id);
CREATE INDEX IF NOT EXISTS idx_judge_scores_judge ON judge_scores(judge_email);

-- 作品评委评分汇总（主键为作品，所有评委对该作品打分的平均分与人数）
CREATE TABLE IF NOT EXISTS work_judge_score (
  work_id TEXT PRIMARY KEY,
  score REAL NOT NULL,
  judge_count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (work_id) REFERENCES works(id)
);

-- 大屏与系统配置（单行）
CREATE TABLE IF NOT EXISTS screen_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  grid_layout TEXT NOT NULL DEFAULT '2x2',
  theme_json TEXT,
  max_votes_per_user INTEGER NOT NULL DEFAULT 1,
  judges_json TEXT,
  vote_open_start INTEGER,
  vote_open_end INTEGER,
  score_open_start INTEGER,
  score_open_end INTEGER,
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO screen_config (id, grid_layout, theme_json, max_votes_per_user, judges_json, vote_open_start, vote_open_end, score_open_start, score_open_end, updated_at)
VALUES (1, '2x2', '{"primaryColor":"#2563eb","primaryDark":"#1e40af","primaryLight":"#3b82f6","secondaryColor":"#64748b"}', 1, '[]', NULL, NULL, NULL, NULL, strftime('%s','now')*1000);
