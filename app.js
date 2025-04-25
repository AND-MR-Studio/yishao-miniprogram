// app.js
const { config } = require('./utils/config');

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    // 根据运行环境设置全局常量
    this.globalData.config = config;
    console.log('当前环境:', wx.getAccountInfoSync().miniProgram.envVersion);
    console.log('基础URL:', this.globalData.config.baseUrl);
    console.log('一勺服务URL:', this.globalData.config.ysUrl);

    // 添加调试日志，检查是否有自动登录逻辑
    console.log('app.js onLaunch 执行');
  },

  globalData: {
    userInfo: null,
    config: {}
  }
})
