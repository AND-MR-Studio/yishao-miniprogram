/**
 * URL配置管理模块
 * 实现环境隔离的URL配置
 * 支持开发环境和生产环境的配置切换
 */

// 导入环境配置
const { 
  isDevelopment,
} = require('./env');


// 导入环境配置文件
const devConfig = require('./api-dev');
const prodConfig = require('./api-prod');

/**
 * 获取当前环境的URL配置
 * @returns {Object} 当前环境的URL配置
 */
const getUrlConfig = () => {
  console.log('getUrlConfig isDev:', isDevelopment);
  return isDevelopment ? devConfig : prodConfig;
};

/**
 * 获取指定服务的基础URL
 * @param {string} service - 服务名称 (soup, agent, dialog, user, asset)
 * @returns {string} 服务基础URL
 */
const getServiceBaseUrl = (service) => {
  const config = getUrlConfig();
  const serviceConfig = config[service];
  
  if (!serviceConfig) {
    console.error(`未找到服务配置: ${service}`);
    return '';
  }
  
  return serviceConfig.url;
};


module.exports = {
  // 配置获取
  getServiceBaseUrl,
};