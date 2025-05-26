/**
 * 环境配置管理
 * 支持手动切换开发/正式环境，方便开发调试
 */

// ==================== 环境配置开关 ====================
// 手动环境切换开关 - 开发时可以手动指定环境
// 设置为 null 时自动根据小程序版本判断环境
// 设置为 'development' 或 'production' 时强制使用指定环境
const MANUAL_ENV = null; // 可选值: null, 'development', 'production'

// ==================== 环境配置定义 ====================
const environments = {
  // 开发环境配置
  development: {
    name: '开发环境',
    baseUrl: "https://and-tech.cn",
    ysUrl: "https://and-tech.cn/yishao-api/",
    memory: "http://alex.and-tech.cn/memory",
    assetsBaseUrl: "http://oss.and-tech.cn",
    // 开发环境特有配置
    debug: true,
    logLevel: 'debug'
  },
  
  // 正式环境配置
  production: {
    name: '正式环境',
    baseUrl: "https://yavin.and-tech.cn",
    ysUrl: "https://yavin.and-tech.cn/yishao-api/",
    memory: "http://alex.and-tech.cn/memory",
    assetsBaseUrl: "http://cdn.and-tech.cn",
    // 正式环境特有配置
    debug: false,
    logLevel: 'error'
  }
};

// ==================== 环境判断逻辑 ====================
/**
 * 获取当前运行环境
 * @returns {string} 'development' | 'production'
 */
function getCurrentEnvironment() {
  // 如果手动指定了环境，直接返回
  if (MANUAL_ENV) {
    console.log(`🔧 手动指定环境: ${MANUAL_ENV}`);
    return MANUAL_ENV;
  }
  
  // 根据小程序版本自动判断
  const envVersion = wx.getAccountInfoSync().miniProgram.envVersion;
  
  switch (envVersion) {
    case 'develop':
      return 'development';
    case 'trial':
    case 'release':
      return 'production';
    default:
      console.warn(`未知的小程序环境: ${envVersion}，默认使用开发环境`);
      return 'development';
  }
}

// ==================== 配置导出 ====================
const currentEnv = getCurrentEnvironment();
const config = environments[currentEnv];

// 添加当前环境信息到配置中
config.currentEnv = currentEnv;
config.envVersion = wx.getAccountInfoSync().miniProgram.envVersion;

/**
 * 全局配置导出
 */
module.exports = {
  // 当前环境配置
  config,
  
  // 向后兼容的配置项
  memory: config.memory,
  assetsBaseUrl: config.assetsBaseUrl,
  
  // 环境管理工具
  environments,
  getCurrentEnvironment,
  
  // 环境切换工具函数
  isDevelopment: () => currentEnv === 'development',
  isProduction: () => currentEnv === 'production',
  
  // 获取指定环境的配置
  getEnvironmentConfig: (env) => environments[env] || environments.development
};
