// pages/mine/mine.js
// 定义常量
const USER_INFO_KEY = 'userInfo';
const DEFAULT_AVATAR_URL = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

// 引入API模块
const api = require('../../utils/api');

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
    showUserInfoModal: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getUserInfo();
    this.getRemainingAnswers();
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
    try {
      // 从本地存储获取用户信息
      const userInfo = wx.getStorageSync(USER_INFO_KEY);
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
      return userInfo;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
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
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;

    // 上传头像
    const config = {
      url: api.user_update_url,
      filePath: avatarUrl
    };

    api.request(config).then(res => {
      if (res.success && res.data) {
        // 更新用户信息
        const updateConfig = {
          url: api.user_update_url,
          method: 'POST',
          data: {
            "avatarUrl": res.data.url
          }
        };

        api.request(updateConfig);

        // 更新本地存储
        const userInfo = this.getUserInfo() || {};
        userInfo.avatarUrl = res.data.url;
        wx.setStorageSync(USER_INFO_KEY, userInfo);

        // 更新页面数据
        this.setData({
          userInfo: userInfo
        });
      }
    });
  },

  /**
   * 处理昵称输入
   */
  onInputNickname(e) {
    const value = e.detail.value;

    // 如果是在昵称输入框完成事件，直接更新昵称
    if (e.type === 'nicknamereview') {
      const updateConfig = {
        url: api.user_update_url,
        method: 'POST',
        data: {
          "nickName": value
        }
      };

      api.request(updateConfig);

      // 更新本地存储
      const userInfo = this.getUserInfo() || {};
      userInfo.nickName = value;
      wx.setStorageSync(USER_INFO_KEY, userInfo);

      // 更新页面数据
      this.setData({
        userInfo: userInfo
      });
    }
  },

  /**
   * 打开用户信息设置弹窗
   */
  openUserInfoModal() {
    this.setData({
      showUserInfoModal: true
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
  confirmUserInfo() {
    // 直接关闭弹窗，因为头像和昵称已经在各自的事件中处理了
    this.closeUserInfoModal();

    // 显示登录成功提示
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 2000
    });
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
  handleLogin(callback) {
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        const config = {
          url: api.user_login_url + '?code=' + res.code,
          method: 'POST',
          data: {
            userInfo: {
              avatarUrl: this.data.defaultAvatarUrl,
              nickName: ''
            }
          }
        };

        api.request(config).then(res => {
          if (res.success && res.data) {
            // 构建用户信息
            const userInfo = {
              avatarUrl: res.data.userInfo?.avatarUrl || this.data.defaultAvatarUrl,
              nickName: res.data.userInfo?.nickName || '',
              openId: res.data.openid,
              loginTime: new Date().getTime()
            };

            // 保存到本地存储
            wx.setStorageSync(USER_INFO_KEY, userInfo);
            wx.setStorageSync('loginTimestamp', new Date().getTime());

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

            // 如果有回调函数，执行回调
            if (typeof callback === 'function') {
              callback(userInfo);
            }
          } else {
            wx.showToast({
              title: '登录失败，请重试',
              icon: 'none'
            });
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
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
    if (this.data.isLoggingOut) return;

    // 已登录，执行退出操作
    this.setData({ isLoggingOut: true }); // 设置标志位
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用退出登录接口
          const config = {
            url: api.user_login_url + '/logout',
            method: 'POST'
          };

          api.request(config).then(() => {
            this.doLogout();
          }).catch(() => {
            // 即使接口调用失败，也清除本地登录信息
            this.doLogout();
          });
        }
        // 无论是确认还是取消，都重置标志位
        this.setData({ isLoggingOut: false });
      },
      fail: () => this.setData({ isLoggingOut: false })
    });
  },

  /**
   * 执行退出登录操作
   */
  doLogout() {
    // 清除本地存储
    wx.removeStorageSync(USER_INFO_KEY);
    wx.removeStorageSync('loginTimestamp');

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
  },


  /**
   * 防止滚动穿透
   */
  catchTouchMove() {
    return false;
  },


})