// app.js
const { config } = require('./config/config');

App({
  onLaunch() {
    // 根据运行环境设置全局常量
    this.globalData.config = config;
    console.log('当前环境:', wx.getAccountInfoSync().miniProgram.envVersion);
    console.log('基础URL:', this.globalData.config.baseUrl);
    console.log('一勺服务URL:', this.globalData.config.ysUrl);

  },

  globalData: {
    userInfo: null,
    config: {}
  }
})
