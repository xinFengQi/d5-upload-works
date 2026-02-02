/**
 * 独立执行：初始化/创建数据库与表结构
 * 部署后首次可执行：node db/init.js
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const db = new Database(DB_PATH);
const schemaPath = path.join(__dirname, 'schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');
db.exec(sql);
db.close();
console.log('Database initialized at', DB_PATH);
