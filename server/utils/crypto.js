const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 时序安全的字符串比较，防止管理员密码等通过侧信道被逐字符猜测
 */
function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  if (bufA.length === 0) return true;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { generateToken, timingSafeEqualStr };
