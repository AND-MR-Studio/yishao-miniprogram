// pages/dialog.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 页面配置
    soupConfig: {
      // 是否只使用默认汤面
      useDefaultOnly: false,
      // 自动播放动画
      autoPlay: true
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面加载完成，组件会自动处理汤面加载
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
        selected: 1
      });
    }
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
   * 汤面加载开始回调
   */
  onSoupLoadStart() {
    console.log('汤面数据开始加载');
  },

  /**
   * 汤面加载成功回调
   */
  onSoupLoadSuccess(e) {
    console.log('汤面数据加载成功:', e.detail.soupData);
  },

  /**
   * 汤面加载失败回调
   */
  onSoupLoadFail(e) {
    console.log('汤面数据加载失败:', e.detail.error);
  },

  /**
   * 汤面加载完成回调
   */
  onSoupLoadComplete() {
    console.log('汤面数据加载完成');
  },

  /**
   * 汤面内容变化回调
   */
  onSoupContentChange(e) {
    console.log('汤面内容已更新:', e.detail);
  },

  /**
   * 汤面动画开始回调
   */
  onSoupAnimationStart() {
    console.log('汤面动画开始播放');
  },

  /**
   * 汤面动画完成回调
   */
  onSoupAnimationComplete() {
    console.log('汤面动画播放完成');
  }
})