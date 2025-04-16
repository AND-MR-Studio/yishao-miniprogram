// 小程序全局应用实例
App({
  // 全局数据
  globalData: {
    // 是否正在检查登录状态
    isCheckingSession: false,
    // 用于页面间通信的临时数据
    pendingSoupId: null
  },

  /**
   * 当小程序初始化完成时触发
   */
  onLaunch: function() {
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   * @param {Function} callback 回调函数
   */
  checkLoginStatus: function(callback) {
    // 避免重复检查
    if (this.globalData.isCheckingSession) {
      typeof callback === 'function' && callback(false);
      return;
    }
    
    this.globalData.isCheckingSession = true;
    
    try {
      // 检查登录态是否过期
      wx.checkSession({
        success: () => {
          // 登录态有效
          this.globalData.isCheckingSession = false;
          typeof callback === 'function' && callback(true);
        },
        fail: () => {
          // 登录态过期，清理本地存储的登录信息
          console.log('登录态已过期');
          this.clearLoginInfo();
          this.globalData.isCheckingSession = false;
          typeof callback === 'function' && callback(false);
        }
      });
    } catch (error) {
      console.error('检查登录状态失败:', error);
      this.globalData.isCheckingSession = false;
      typeof callback === 'function' && callback(false);
    }
  },

  /**
   * 更新用户信息
   * @param {Object} userInfo 用户信息
   */
  updateUserInfo: function(userInfo) {
    if (!userInfo) return;
    
    try {
      // 更新存储
      wx.setStorageSync('userInfo', userInfo);
      // 更新登录时间戳
      wx.setStorageSync('loginTimestamp', new Date().getTime());
    } catch (error) {
      console.error('更新用户信息失败:', error);
    }
  },

  /**
   * 清除登录信息
   */
  clearLoginInfo: function() {
    try {
      // 清除存储
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('sessionKey');
      wx.removeStorageSync('loginTimestamp');
    } catch (error) {
      console.error('清除登录信息失败:', error);
    }
  }
})
