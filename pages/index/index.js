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
    },
    // 控制按钮显示
    showButtons: false
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
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 汤面动画完成回调 - 控制按钮显示
   */
  onSoupAnimationComplete() {
    console.log('汤面动画播放完成');
    // 显示按钮
    this.setData({
      showButtons: true
    });
  },

  /**
   * 开始喝汤按钮点击事件
   */
  onStartSoup() {
    console.log('开始喝汤按钮点击');
    // 获取汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      // 调用汤面组件的方法
      soupDisplay.startAnimation && soupDisplay.startAnimation();
    }
  },

  /**
   * 下一个按钮点击事件
   */
  onNextSoup() {
    console.log('下一个按钮点击');
    // 获取汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      // 调用汤面组件的方法
      soupDisplay.loadSoupData && soupDisplay.loadSoupData();
    }
  }
})