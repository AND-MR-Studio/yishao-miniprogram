// pages/mine/mine.js
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');
const loginService = require('../../utils/login');

// 定义用户信息存储的KEY常量
const USER_INFO_KEY = 'userInfo';
// 定义登录态存储的KEY常量（实际使用中会由服务端返回）
const SESSION_KEY = 'sessionKey';
// 登录态有效期（毫秒），默认为7天
const SESSION_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    remainingAnswers: 0,
    defaultAvatarUrl: loginService.DEFAULT_AVATAR_URL,
    buttonConfig: {
      type: 'light',
      text: '登录'
    },
    isLoggingOut: false,
    // 汤面列表相关
    showSoupList: false,
    soupList: [],
    // 用户汤面记录
    userSoupHistory: [],
    // 用户状态
    hasUserInfo: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取全局应用实例
    this.app = getApp();
    
    // 检查本地存储中的用户信息
    this._refreshUserInfoUI();
    this.getRemainingAnswers();
    // 获取汤面列表
    this._loadSoupList();
    // 获取用户汤面历史
    this._loadUserSoupHistory();
    
    // 检查登录态是否过期
    this._checkLoginStatus();
  },

  /**
   * 刷新用户信息UI
   * @private
   */
  _refreshUserInfoUI() {
    const userInfo = loginService.getUserInfo();
    
    // 更新页面显示数据
    this.setData({
      userInfo: userInfo,
      hasUserInfo: !!userInfo,
      buttonConfig: userInfo ? {
        type: 'unlight',
        text: '退出登录'
      } : {
        type: 'light',
        text: '登录'
      }
    });
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
    this._refreshUserInfoUI();
    this.getRemainingAnswers();
    
    // 检查登录状态
    this._checkLoginStatus();
  },

  /**
   * 检查登录状态
   * @private
   */
  _checkLoginStatus() {
    // 如果当前没有用户信息，不需要检查
    if (!this.data.userInfo) {
      return;
    }
    
    // 检查登录态是否过期
    loginService.checkSession().then(isValid => {
      if (!isValid) {
        // 登录态已失效，清除登录信息
        loginService.clearLoginInfo();
        
        // 更新UI
        this._refreshUserInfoUI();
        
        // 提示用户
        wx.showToast({
          title: '登录已过期，请重新登录',
          icon: 'none'
        });
      }
    }).catch(() => {
      // 检查失败，视为登录态过期，清除登录信息
      loginService.clearLoginInfo();
      this._refreshUserInfoUI();
    });
  },

  /**
   * 处理头像选择
   */
  onChooseAvatar(e) {
    // 使用login.js中的handleAvatarChoose函数处理头像选择
    loginService.handleAvatarChoose(e)
      .then(userInfo => {
        // 如果返回有效的用户信息，则更新页面数据
        if (userInfo && userInfo.avatarUrl) {
          this.setData({
            userInfo: userInfo,
            hasUserInfo: true,
            buttonConfig: {
              type: 'unlight',
              text: '退出登录'
            }
          });
          
          // 头像设置成功提示
          wx.showToast({
            title: '头像设置成功',
            icon: 'success',
            duration: 1500
          });
        }
      })
      .catch(err => {
        console.error('头像选择处理失败:', err);
        wx.showToast({
          title: '头像设置失败',
          icon: 'none',
          duration: 1500
        });
      });
  },

  /**
   * 更新页面UI（用于登录成功后）
   * @param {Object} userInfo 用户信息
   * @private
   */
  _updateLoginUI(userInfo) {
    if (!userInfo) return;
    
    this.setData({
      userInfo: userInfo,
      hasUserInfo: true,
      buttonConfig: {
        type: 'unlight',
        text: '退出登录'
      }
    });
  },

  /**
   * 模拟微信授权登录
   */
  handleSimulateLogin() {
    // 显示模拟的微信授权对话框
    wx.showModal({
      title: '微信授权提示',
      content: '申请获取以下权限\n获取你的公开信息(昵称、头像等)',
      confirmText: '允许',
      cancelText: '拒绝',
      success: (res) => {
        if (res.confirm) {
          // 用户点击允许，模拟授权成功
          console.log('用户允许授权');
          
          // 使用统一的登录处理函数
          loginService.simulateLogin()
            .then(userInfo => {
              // 更新页面数据
              this._updateLoginUI(userInfo);
            })
            .catch(err => {
              console.error('登录失败:', err);
            });
        } else {
          // 用户点击拒绝
          console.log('用户拒绝授权');
          wx.showToast({
            title: '您已取消授权登录',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 处理微信手机号授权登录
   */
  handleGetPhoneNumber(e) {
    console.log('获取手机号回调', e);
    
    // 用户拒绝授权
    if (e.detail.errMsg && e.detail.errMsg.indexOf('deny') > -1) {
      wx.showToast({
        title: '您已取消授权登录',
        icon: 'none'
      });
      return;
    }
    
    // 使用统一的登录处理函数，添加手机号信息
    loginService.simulateLogin({
      phoneNumber: '1380013****' // 模拟的手机号，实际应由服务端解密获取
    })
      .then(userInfo => {
        // 更新页面数据
        this._updateLoginUI(userInfo);
      })
      .catch(err => {
        console.error('登录失败:', err);
      });
  },

  /**
   * 处理登录
   */
  handleLogin() {
    // 已登录状态下，不再执行登录操作
    if (this.data.userInfo) {
      return;
    }

    // 调用wx.getUserProfile获取用户信息
    // 注意：根据微信最新规范，此API需要在用户主动触发才能调用
    wx.getUserProfile({
      desc: '获取你的公开信息(昵称、头像等)', // 声明获取用户个人信息后的用途
      success: (res) => {
        console.log('获取用户信息成功', res);
        
        // 使用统一的登录处理函数，添加用户资料
        loginService.simulateLogin({
          avatarUrl: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName
        })
          .then(userInfo => {
            // 更新页面数据
            this.setData({
              userInfo: userInfo,
              hasUserInfo: true,
              buttonConfig: {
                type: 'unlight',
                text: '退出登录'
              }
            });
          })
          .catch(err => {
            console.error('登录失败:', err);
          });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        // 用户拒绝授权
        wx.showToast({
          title: '您已取消授权登录',
          icon: 'none'
        });
      }
    });
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
          // 清除登录信息
          loginService.clearLoginInfo();
          
          // 更新UI
          this._refreshUserInfoUI();
          
          // 提示用户
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 2000
          });
        }
        // 重置标志位
        this.setData({ isLoggingOut: false });
      },
      fail: () => {
        // 发生错误时也要重置标志位
        this.setData({ isLoggingOut: false });
      }
    });
  },

  /**
   * 加载汤面列表
   * @private
   */
  _loadSoupList() {
    // 显示加载中提示
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
    
    soupService.getAllSoups((soups) => {
      // 隐藏加载提示
      wx.hideLoading();
      
      if (Array.isArray(soups) && soups.length > 0) {
        this.setData({ soupList: soups });
      } else {
        // 如果列表为空，可以显示提示
        wx.showToast({
          title: '暂无汤面数据',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 加载用户汤面历史记录
   * @private
   */
  _loadUserSoupHistory() {
    // 从本地存储获取用户记录
    const userSoupHistory = wx.getStorageSync('userSoupHistory') || [];
    
    // 格式化时间
    userSoupHistory.forEach(item => {
      if (item.timestamp) {
        item.formattedTime = this._formatTime(item.timestamp);
      }
    });
    
    this.setData({ userSoupHistory });
  },

  /**
   * 格式化时间戳
   * @param {number} timestamp 时间戳
   * @returns {string} 格式化后的时间
   * @private
   */
  _formatTime(timestamp) {
    if (!timestamp) return '';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date; // 时间差(毫秒)
    
    // 一分钟内
    if (diff < 60 * 1000) {
      return '刚刚';
    }
    
    // 一小时内
    if (diff < 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 1000)) + '分钟前';
    }
    
    // 一天内
    if (diff < 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
    }
    
    // 一周内
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
    }
    
    // 其他情况显示日期
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
  },

  /**
   * 处理查看历史记录
   */
  handleViewHistory() {
    if (this.data.soupList.length === 0) {
      this._loadSoupList();
    }
    this.setData({ showSoupList: true });
  },

  /**
   * 关闭汤面列表弹窗
   */
  closeSoupList() {
    this.setData({ showSoupList: false });
  },

  /**
   * 处理点击汤面项
   * @param {Object} e 事件对象
   */
  handleSoupItemClick(e) {
    const { soupId } = e.currentTarget.dataset;
    if (!soupId) return;
    
    // 关闭汤面列表弹窗
    this.closeSoupList();
    
    // 记录用户选择的汤面到历史记录
    this._addToUserSoupHistory(soupId);
    
    // 跳转到对话页面
    wx.switchTab({
      url: '/pages/dialog/dialog',
      success: () => {
        // 使用页面实例方法来传递参数给dialog页面
        const dialogPage = getCurrentPages().find(page => page.route === 'pages/dialog/dialog');
        if (dialogPage) {
          // 如果能获取到页面实例，直接设置参数
          dialogPage.setSoupId(soupId);
        } else {
          // 如果获取不到页面实例，使用全局变量暂存soupId
          getApp().globalData = getApp().globalData || {};
          getApp().globalData.pendingSoupId = soupId;
        }
      }
    });
  },

  /**
   * 添加到用户历史记录
   * @param {string} soupId 汤面ID
   * @private
   */
  _addToUserSoupHistory(soupId) {
    if (!soupId) {
      return;
    }
    
    const userSoupHistory = this.data.userSoupHistory || [];
    
    // 如果已存在，则移除旧记录
    const index = userSoupHistory.findIndex(item => item.soupId === soupId);
    if (index > -1) {
      userSoupHistory.splice(index, 1);
    }

    // 获取汤面信息
    const soupInfo = this.data.soupList.find(soup => soup.soupId === soupId);
    
    if (soupInfo) {
      const timestamp = new Date().getTime();
      
      // 添加到历史记录最前面
      userSoupHistory.unshift({
        soupId: soupId,
        title: soupInfo.title || '未命名汤面',
        timestamp: timestamp,
        formattedTime: this._formatTime(timestamp)
      });

      // 最多保存20条记录
      if (userSoupHistory.length > 20) {
        userSoupHistory.pop();
      }

      // 保存到本地存储
      wx.setStorageSync('userSoupHistory', userSoupHistory);
      this.setData({ userSoupHistory });
    } else {
      // 如果在本地找不到汤面信息，尝试重新加载汤面列表
      this._loadSoupList();
    }
  },

  /**
   * 防止滚动穿透
   */
  catchTouchMove() {
    return false;
  }
})