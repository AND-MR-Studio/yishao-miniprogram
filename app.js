// app.js

// 加载业务拦截器
require('./utils/IntercepterUtils');

const {
  isDevelopment, 
  isProduction, 
  getCurrentEnvironment
} = require('./config/env');

App({
  onLaunch() {
    // 输出环境信息
    this.logEnvironmentInfo();
  },
  
  /**
   * 输出环境信息
   */
  logEnvironmentInfo() {
    const currentEnv = getCurrentEnvironment();
    const envVersion = wx.getAccountInfoSync().miniProgram.envVersion;
    
    console.log('==================== 环境配置信息 ====================');
    console.log('🏷️ 小程序版本:', envVersion);
    console.log('🔧 环境标识:', currentEnv);
    console.log('================================================');
    
    // 开发环境提示
    if (isDevelopment()) {
      console.log('🚀 开发模式已启用，如需切换到正式环境，请修改 config/config.js 中的 MANUAL_ENV 配置');
    }
  },

  // 全局数据
  globalData: {
    isDevelopment,
    isProduction
  },
  
  // API配置
  api: {
  }
})
