// app.js
const { 
  config, 
  isDevelopment, 
  isProduction, 
  getCurrentEnvironment,
  environments 
} = require('./config/config');

App({
  onLaunch() {
    // 根据运行环境设置全局常量
    this.globalData.config = config;
    
    // 环境信息输出
    const currentEnv = getCurrentEnvironment();
    const envVersion = wx.getAccountInfoSync().miniProgram.envVersion;
    
    console.log('==================== 环境配置信息 ====================');
    console.log('🏷️  小程序版本:', envVersion);
    console.log('🌍 当前环境:', config.name);
    console.log('🔧 环境标识:', currentEnv);
    console.log('🌐 基础URL:', config.baseUrl);
    console.log('🥄 一勺服务URL:', config.ysUrl);
    console.log('💾 Memory服务URL:', config.memory);
    console.log('📁 资源基础URL:', config.assetsBaseUrl);
    console.log('🐛 调试模式:', config.debug ? '开启' : '关闭');
    console.log('📝 日志级别:', config.logLevel);
    console.log('================================================');
    
    // 开发环境提示
    if (isDevelopment()) {
      console.log('🚀 开发模式已启用，如需切换到正式环境，请修改 config/config.js 中的 MANUAL_ENV 配置');
    }
    
    // 存储环境工具函数到全局数据
    this.globalData.isDevelopment = isDevelopment;
    this.globalData.isProduction = isProduction;
    this.globalData.getCurrentEnvironment = getCurrentEnvironment;
    this.globalData.environments = environments;
  },

  globalData: {
    userInfo: null,
    config: {},
    // 环境工具函数
    isDevelopment: null,
    isProduction: null,
    getCurrentEnvironment: null,
    environments: null
  }
})
