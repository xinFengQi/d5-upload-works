/**
 * 中国时区（Asia/Shanghai）日期，用于投票「按天」规则
 */

/** 返回当前日期字符串 YYYY-MM-DD（中国时区） */
function getTodayDateChina() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}

module.exports = { getTodayDateChina };
