/**
 * 工具函数模块
 */

/**
 * 格式化日期时间
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期时间字符串
 */
const formatTime = date => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`;
};

/**
 * 格式化数字，保证两位数
 * @param {number} n - 需要格式化的数字
 * @returns {string} 格式化后的字符串
 */
const formatNumber = n => {
  n = n.toString();
  return n[1] ? n : `0${n}`;
};

module.exports = {
  formatTime
};
