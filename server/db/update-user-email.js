/**
 * 更新指定用户的邮箱
 * 运行：在项目根目录执行 node server/db/update-user-email.js <userid> <新邮箱>
 * 示例：node server/db/update-user-email.js admin admin@example.com
 */
const { getDb } = require('./index');

function main() {
  const userid = process.argv[2];
  const email = process.argv[3];

  if (!userid || !email) {
    console.log('用法: node server/db/update-user-email.js <userid> <新邮箱>');
    console.log('示例: node server/db/update-user-email.js admin admin@example.com');
    process.exit(1);
  }

  const db = getDb();
  const row = db.prepare('SELECT userid, name, email FROM users WHERE userid = ?').get(userid);

  if (!row) {
    console.log(`未找到 userid 为「${userid}」的用户。`);
    process.exit(1);
  }

  const newEmail = String(email).trim();
  db.prepare('UPDATE users SET email = ? WHERE userid = ?').run(newEmail, userid);

  console.log('更新成功：');
  console.log('  userid:', row.userid);
  console.log('  name:  ', row.name);
  console.log('  原邮箱:', row.email ?? '(空)');
  console.log('  新邮箱:', newEmail);
}

main();
