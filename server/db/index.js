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

function initSchema(db) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
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
