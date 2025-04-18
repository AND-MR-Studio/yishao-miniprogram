// pages/mine/mine.js
// 引入模拟登录相关函数
const {
  simulateLogin,
  getUserInfo,
  updateUserInfo,
  clearLoginInfo,
  handleAvatarChoose,
  DEFAULT_AVATAR_URL
} = require('../../utils/login.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    remainingAnswers: 0,
    defaultAvatarUrl: DEFAULT_AVATAR_URL,
    buttonConfig: {
      type: 'light',
      text: '登录'
    },
    isLoggingOut: false,
    // 用户信息设置弹窗
    showUserInfoModal: false,
    tempAvatarUrl: '',
    tempNickName: ''
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
    // 使用login.js中的getUserInfo函数获取用户信息
    const userInfo = getUserInfo();
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
    try {
      // 使用login.js中的handleAvatarChoose函数处理头像选择
      const updatedUserInfo = await handleAvatarChoose(e);

      // 更新页面数据
      if (updatedUserInfo) {
        this.setData({
          userInfo: updatedUserInfo,
          tempAvatarUrl: updatedUserInfo.avatarUrl || this.data.defaultAvatarUrl
        });
      }
    } catch (error) {
      wx.showToast({
        title: error.message || '头像设置失败',
        icon: 'error'
      });
    }
  },

  /**
   * 处理昵称输入
   */
  onInputNickname(e) {
    this.setData({
      tempNickName: e.detail.value
    });
  },

  /**
   * 打开用户信息设置弹窗
   */
  openUserInfoModal() {
    const userInfo = getUserInfo() || {};
    this.setData({
      showUserInfoModal: true,
      tempAvatarUrl: userInfo.avatarUrl || this.data.defaultAvatarUrl,
      tempNickName: userInfo.nickName || ''
    });
  },

  /**
   * 关闭用户信息设置弹窗
   */
  closeUserInfoModal() {
    this.setData({
      showUserInfoModal: false
    });
  },

  /**
   * 确认用户信息设置
   */
  async confirmUserInfo() {
    try {
      if (this.data.tempNickName || this.data.tempAvatarUrl) {
        // 更新用户信息
        const updatedUserInfo = await updateUserInfo({
          nickName: this.data.tempNickName,
          avatarUrl: this.data.tempAvatarUrl
        });

        // 更新页面数据
        this.setData({
          userInfo: updatedUserInfo,
          showUserInfoModal: false
        });

        // 在用户设置完成后显示登录成功提示
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        this.closeUserInfoModal();

        // 即使用户没有设置信息，也显示登录成功提示
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      wx.showToast({
        title: error.message || '设置失败',
        icon: 'error'
      });
    }
  },

  /**
   * 跳过用户信息设置
   */
  skipUserInfo() {
    this.closeUserInfoModal();

    // 在用户跳过设置后显示登录成功提示
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 2000
    });
  },

  /**
   * 处理登录
   */
  handleLogin() {
    return new Promise(async (resolve, reject) => {
      try {
        // 使用login.js中的simulateLogin函数进行模拟登录，但不显示成功提示
        const userInfo = await simulateLogin(undefined, false, false);

        // 更新页面数据
        this.setData({
          userInfo: userInfo,
          buttonConfig: {
            type: 'unlight',
            text: '退出登录'
          }
        });

        // 直接显示用户信息设置弹窗
        this.openUserInfoModal();

        resolve(userInfo);
      } catch (error) {
        wx.showToast({
          title: error.message || '登录失败',
          icon: 'error'
        });
        reject(error);
      }
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
          // 使用login.js中的clearLoginInfo函数清除登录信息
          clearLoginInfo();
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

  },



  /**
   * 防止滚动穿透
   */
  catchTouchMove() {
    return false;
  }
})