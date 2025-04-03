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
    showButtons: false,
    // 当前汤面是否已查看
    currentSoupViewed: false
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

    // 如果当前汤面已查看，直接显示按钮，不播放动画
    if (this.data.currentSoupViewed) {
      this.setData({
        showButtons: true
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
    // 获取当前汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    const currentSoupData = soupDisplay.getSoupData();
    
    // 标记当前汤面已查看
    this.setData({
      currentSoupViewed: true
    });
    
    // 使用更简洁的方式传递数据
    wx.navigateTo({
      url: `/pages/dialog/dialog?soupId=${currentSoupData.id}`,
      success: function(res) {
        // 通过eventChannel向dialog页面传送完整数据
        res.eventChannel.emit('acceptDataFromOpenerPage', currentSoupData);
      }
    });
  },

  /**
   * 下一个按钮点击事件
   */
  onNextSoup() {
    // 重置查看状态
    this.setData({
      currentSoupViewed: false,
      showButtons: false
    });
    
    // 获取soup-display组件实例并重置动画
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      soupDisplay.resetAnimation();
      soupDisplay.loadSoupData();
    }
  }
})