// pages/mine/mine.js
// const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    remainingAnswers: 0,
    defaultAvatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
    // 汤面列表相关
    showSoupList: false,
    soupList: [],
    // 用户汤面记录
    userSoupHistory: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getUserInfo();
    this.getRemainingAnswers();
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
        selected: 2  // 第三个tab是我的页面
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
        userInfo: userInfo
      });
    } else {
      this.setData({
        userInfo: null
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
    // 暂时禁用汤面列表功能
    wx.showToast({
      title: '功能暂时不可用',
      icon: 'none'
    });
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
    // 暂时禁用汤面选择功能
    wx.showToast({
      title: '功能暂时不可用',
      icon: 'none'
    });
    return;
  },

  /**
   * 添加到用户历史记录
   * @param {string} soupId 汤面ID
   * @private
   */
  _addToUserSoupHistory(soupId) {
    // 暂时禁用添加历史记录功能
    return;
  },

  /**
   * 防止滚动穿透
   */
  catchTouchMove() {
    return false;
  }
})