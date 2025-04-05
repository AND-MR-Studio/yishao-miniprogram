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
      autoPlay: true,
      // 静态模式（跳过动画）
      staticMode: false
    },
    // 控制按钮显示 - 使用单一变量控制
    showButtons: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面加载完成，组件会自动处理汤面加载
    // 确保按钮初始状态为隐藏
    this.setData({
      showButtons: false
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 获取当前汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    
    // 如果开启了静态模式，直接显示按钮
    if (this.data.soupConfig.staticMode && soupDisplay) {
      this.setData({
        showButtons: true
      });
    }
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
    
    // 不在onShow中检查动画状态，完全依靠组件的事件通知
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
    // 显示按钮，CSS会控制动画顺序
    wx.nextTick(() => {
      this.setData({
        showButtons: true
      });
    });
  },

  /**
   * 开始喝汤按钮点击事件
   */
  onStartSoup() {
    // 获取当前汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    const currentSoupData = soupDisplay.getSoupData();
    
    // 将当前汤面标记为已查看
    soupDisplay.markCurrentSoupAsViewed();
    
    // 跳转到对话页面
    wx.navigateTo({
      url: `/pages/dialog/dialog?soupId=${currentSoupData.soupId}`,
      success: (res) => {
        // 通过eventChannel向dialog页面传送完整数据
        res.eventChannel.emit('acceptDataFromOpenerPage', currentSoupData);
      }
    });
  },

  /**
   * 下一个按钮点击事件
   */
  onNextSoup() {
    // 获取soup-display组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      // 标记当前汤面已回答（在dialog页面回到主页后调用）
      if (!soupDisplay.isCurrentSoupAnswered()) {
        soupDisplay.markCurrentSoupAsAnswered();
      }
      
      // 隐藏按钮
      this.setData({
        showButtons: false
      });
      
      // 加载下一个汤面并重置动画
      soupDisplay.resetAnimation();
      soupDisplay.loadSoupData();
    }
  },

  /**
   * 阻止事件冒泡的空函数
   */
  catchEvent() {
    // 空函数，用于阻止事件冒泡
  },

  /**
   * 处理设置变化
   */
  handleSettingChange(e) {
    const { type, value } = e.detail;
    if (type === 'skipAnimation') {
      // 更新soup-display的静态模式
      this.setData({
        'soupConfig.staticMode': value
      });
      
      // 如果开启了跳过动画，直接显示按钮
      if (value && !this.data.showButtons) {
        this.setData({
          showButtons: true
        });
      }
    }
  },
})