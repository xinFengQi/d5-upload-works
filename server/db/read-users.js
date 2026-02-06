/**
 * 读取用户信息并输出到控制台
 * 运行：在项目根目录执行 node server/db/read-users.js，或在 server 目录下 node db/read-users.js
 */
const { getDb } = require('./index');

function formatTime(ts) {
  if (ts == null) return '-';
  const n = Number(ts);
  if (Number.isNaN(n)) return '-';
  return new Date(n).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function main() {
  const db = getDb();
  const rows = db.prepare(
    'SELECT userid, name, avatar, mobile, email, role, created_at FROM users ORDER BY created_at DESC'
  ).all();

  if (rows.length === 0) {
    console.log('当前无用户数据。');
    return;
  }

  console.log(`共 ${rows.length} 条用户记录：\n`);
  rows.forEach((row, i) => {
    console.log(`--- 用户 ${i + 1} ---`);
    console.log('  userid:   ', row.userid ?? '-');
    console.log('  name:     ', row.name ?? '-');
    console.log('  avatar:   ', row.avatar ? '(有)' : '-');
    console.log('  mobile:   ', row.mobile ?? '-');
    console.log('  email:    ', row.email ?? '-');
    console.log('  role:     ', row.role ?? 'user');
    console.log('  created_at:', formatTime(row.created_at));
    console.log('');
  });
}

main();
