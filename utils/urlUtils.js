/**
 * URL工具模块
 * 提供URL处理相关的工具函数
 */
const urlConfig = require('../config/url');

/**
 * 获取完整的API URL
 * @param {string} mark - 业务标记
 * @param {string} path - API路径
 * @returns {string} 完整的API URL
 */
const getFullUrl = (mark, path) => {
  if (!mark) {
    console.error('未提供基础URL');
    return '';
  }
  
  if (!path) {
    console.error('未提供API路径');
    return '';
  }
  const baseUrl = urlConfig.getServiceBaseUrl(mark);
  return formatUrl(baseUrl, path);
};

/**
 * 获取资源URL
 * @param {string} baseUrl - 资源基础URL
 * @param {string} path - 资源路径
 * @param {string} filename - 文件名
 * @returns {string} 完整的资源URL
 */
const getAssetUrl = (baseUrl, path, filename) => {
  const assetPath = path ? formatUrl(path, filename) : filename;
  return formatUrl(baseUrl, assetPath);
};

/**
 * 格式化URL路径
 * 确保baseUrl不以斜杠结尾，path以斜杠开头
 * @param {string} baseUrl - 基础URL
 * @param {string} path - 路径
 * @returns {string} 格式化后的完整URL
 */
const formatUrl = (baseUrl, path) => {
  if (!baseUrl) {
    console.error('未提供基础URL');
    return '';
  }
  
  if (!path) {
    console.error('未提供路径');
    return baseUrl;
  }
  
  const formattedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${formattedBaseUrl}${formattedPath}`;
};

module.exports = {
  getFullUrl,
  getAssetUrl
};

