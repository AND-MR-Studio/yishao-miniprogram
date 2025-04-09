// pages/mine/mine.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    remainingAnswers: 0,
    defaultAvatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
    buttonConfig: {
      type: 'light',
      text: '登录'
    },
    isLoggingOut: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getUserInfo();
    this.getRemainingAnswers();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }
    // 每次显示页面时更新数据
    this.getUserInfo();
    this.getRemainingAnswers();
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        buttonConfig: {
          type: 'unlight',
          text: '退出登录'
        }
      });
    } else {
      this.setData({
        userInfo: null,
        buttonConfig: {
          type: 'light',
          text: '登录'
        }
      });
    }
  },

  /**
   * 获取剩余回答次数
   */
  getRemainingAnswers() {
    // 假设从本地存储或者调用API获取剩余次数
    const remainingAnswers = wx.getStorageSync('remainingAnswers') || 0;
    this.setData({
      remainingAnswers: remainingAnswers
    });
  },

  /**
   * 处理头像选择
   */
  async onChooseAvatar(e) {
    // 用户取消选择时不做处理
    if (e.detail.errMsg && e.detail.errMsg.includes('fail cancel')) {
      return;
    }

    const { avatarUrl } = e.detail;
    if (!avatarUrl) {
      wx.showToast({
        title: '获取头像失败',
        icon: 'error'
      });
      return;
    }
    
    try {
      // 检查是否已登录
      const isLoggedIn = wx.getStorageSync('userInfo');
      if (!isLoggedIn) {
        // 未登录，先进行登录
        await this.handleLogin();
      }

      // 更新头像
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.avatarUrl = avatarUrl;
      
      // 保存到本地存储
      wx.setStorageSync('userInfo', userInfo);
      
      // 更新页面数据
      this.setData({
        userInfo: userInfo
      });

      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('更新头像失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'error'
      });
    }
  },

  /**
   * 处理登录
   */
  handleLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              // 这里应该调用你的后端接口，使用code换取用户信息
              // const { data } = await wx.request({ ... });
              
              // 示例：模拟后端返回的用户信息
              const mockUserInfo = {
                nickName: '游客' + Math.floor(Math.random() * 10000),
                avatarUrl: this.data.defaultAvatarUrl // 使用 data 中定义的默认头像
              };

              // 保存用户信息到本地
              wx.setStorageSync('userInfo', mockUserInfo);
              this.setData({
                userInfo: mockUserInfo,
                buttonConfig: {
                  type: 'unlight',
                  text: '退出登录'
                }
              });

              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });

              resolve(mockUserInfo);
            } catch (error) {
              console.error('登录失败:', error);
              reject(error);
            }
          } else {
            console.error('登录失败:', res);
            reject(new Error('登录失败'));
          }
        },
        fail: reject
      });
    });
  },

  /**
   * 处理退出登录
   */
  handleLogout() {
    // 如果未登录，则执行登录操作
    if (!this.data.userInfo) {
      this.handleLogin();
      return;
    }

    // 如果正在退出登录，则不再显示弹窗
    if (this.data.isLoggingOut) {
      return;
    }

    // 已登录，执行退出操作
    this.setData({ isLoggingOut: true }); // 设置标志位
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo');
          // 重置数据
          this.setData({
            userInfo: null,
            remainingAnswers: 0,
            buttonConfig: {
              type: 'light',
              text: '登录'
            }
          });
          // 提示用户
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 2000
          });
        }
        // 无论是确认还是取消，都重置标志位
        this.setData({ isLoggingOut: false });
      },
      fail: () => {
        // 发生错误时也要重置标志位
        this.setData({ isLoggingOut: false });
      }
    });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})