/**
 * 请求参数校验（防滥用、防异常值）
 */

const WORK_ID_MAX_LENGTH = 128;

/**
 * 规范化 workId：须为非空字符串且长度不超过上限，否则返回 null
 * @param {*} workId - 来自 req.body / req.query / req.params
 * @returns {string|null}
 */
function normalizeWorkId(workId) {
  if (workId == null) return null;
  const s = String(workId).trim();
  if (s.length === 0 || s.length > WORK_ID_MAX_LENGTH) return null;
  return s;
}

module.exports = { normalizeWorkId, WORK_ID_MAX_LENGTH };
