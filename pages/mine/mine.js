// pages/mine/mine.js
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');
const { request } = require('../../utils/api');  // 更新引用路径

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
    isLoggingOut: false,
    // 汤面列表相关
    showSoupList: false,
    soupList: [],
    // 用户汤面记录
    userSoupHistory: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    this.getUserInfo();
    this.getRemainingAnswers();

    // 确保soupService已初始化
    if (!soupService.isIdsLoaded) {
      await soupService.loadSoupIds();
    }

    // 获取汤面列表
    await this._loadSoupList();
    // 获取用户汤面历史
    this._loadUserSoupHistory();
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
      // 显示加载提示
      wx.showLoading({
        title: '登录中...',
        mask: true
      });

      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              // 调用后端登录接口
              const response = await request({
                url: '/api/user/login',
                method: 'POST',
                data: {
                  code: res.code,
                  userInfo: {
                    nickName: '游客' + Math.floor(Math.random() * 10000),
                    avatarUrl: this.data.defaultAvatarUrl
                  }
                }
              });

              if (response.success) {
                const { userInfo, openid } = response.data;

                // 保存用户信息到本地
                const userData = {
                  ...userInfo,
                  openid
                };

                wx.setStorageSync('userInfo', userData);
                this.setData({
                  userInfo: userData,
                  buttonConfig: {
                    type: 'unlight',
                    text: '退出登录'
                  }
                });

                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                });

                resolve(userData);
              } else {
                throw new Error(response.error || '登录失败');
              }
            } catch (error) {
              wx.showToast({
                title: error.message || '登录失败',
                icon: 'error'
              });
              reject(error);
            }
          } else {
            wx.showToast({
              title: '登录失败',
              icon: 'error'
            });
            reject(new Error('登录失败'));
          }
        },
        fail: (error) => {
          wx.showToast({
            title: '登录失败',
            icon: 'error'
          });
          reject(error);
        },
        complete: () => {
          wx.hideLoading();
        }
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

  },

  /**
   * 加载汤面列表
   * @private
   */
  async _loadSoupList() {
    // 显示加载中提示
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    try {
      // 获取所有汤面ID
      const soupIds = await soupService.getAllSoupIds();

      // 获取每个汤面的详细数据
      const soups = [];
      for (const id of soupIds) {
        const soup = await soupService.getSoupById(id);
        if (soup) {
          soups.push(soup);
        }
      }

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
    } catch (error) {
      console.error('加载汤面列表失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
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

    // 保存soupId到全局变量
    getApp().globalData = getApp().globalData || {};
    getApp().globalData.pendingSoupId = soupId;
    getApp().globalData.openDialogDirectly = true;

    // 跳转到首页
    wx.switchTab({
      url: '/pages/index/index'
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