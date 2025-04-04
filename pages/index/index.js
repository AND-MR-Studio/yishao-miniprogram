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
    // 控制按钮显示
    showStartButton: false,
    showNextButton: false,
    // 防止多次点击
    isNavigating: false
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

    // 恢复导航状态
    this.setData({
      isNavigating: false
    });

    // 获取当前汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      // 检查当前汤面是否已查看过
      const isCurrentSoupViewed = soupDisplay.isCurrentSoupViewed();
      
      // 如果当前汤面已查看过，直接显示按钮，不触发动画
      if (isCurrentSoupViewed) {
        this.setData({
          showStartButton: true,
          showNextButton: true
        });
      }
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
    // 只显示第一个按钮
    wx.nextTick(() => {
      this.setData({
        showStartButton: true
      });
    });
  },

  /**
   * 开始喝汤按钮动画完成事件
   */
  onStartButtonAnimationEnd() {
    console.log('开始喝汤按钮动画完成');
    // 显示下一个按钮
    this.setData({
      showNextButton: true
    });
  },

  /**
   * 开始喝汤按钮点击事件
   */
  onStartSoup() {
    // 防止重复点击
    if (this.data.isNavigating) return;
    
    // 设置导航状态
    this.setData({
      isNavigating: true
    });

    // 获取当前汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    const currentSoupData = soupDisplay.getSoupData();
    
    // 将当前汤面标记为已查看
    soupDisplay.markCurrentSoupAsViewed();
    
    // 延迟跳转，确保果冻动画效果显示完成
    setTimeout(() => {
      // 使用更简洁的方式传递数据
      wx.navigateTo({
        url: `/pages/dialog/dialog?soupId=${currentSoupData.soupId}`,
        success: (res) => {
          // 通过eventChannel向dialog页面传送完整数据
          res.eventChannel.emit('acceptDataFromOpenerPage', currentSoupData);
        },
        fail: () => {
          // 导航失败时重置状态
          this.setData({
            isNavigating: false
          });
        }
      });
    }, 300); // 延迟300ms等待动画
  },

  /**
   * 下一个按钮点击事件
   */
  onNextSoup() {
    // 防止重复点击
    if (this.data.isNavigating) return;
    
    // 获取soup-display组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      // 标记当前汤面已回答（在dialog页面回到主页后调用）
      if (!soupDisplay.isCurrentSoupAnswered()) {
        soupDisplay.markCurrentSoupAsAnswered();
      }
      
      // 设置按钮为可见状态，不立即隐藏
      // 添加一个标志防止重复操作
      this.setData({
        isNavigating: true
      });
      
      // 延迟隐藏按钮，等待按钮动画完成
      setTimeout(() => {
        // 隐藏按钮
        this.setData({
          showStartButton: false,
          showNextButton: false
        });
        
        // 加载下一个汤面并重置动画
        // 延迟加载，确保当前汤面的按钮消失动画完成
        setTimeout(() => {
          soupDisplay.resetAnimation();
          soupDisplay.loadSoupData();
          
          // 重置导航状态，允许下一次操作
          this.setData({
            isNavigating: false
          });
        }, 300);
      }, 300); // 延迟300ms等待按钮动画
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
      if (value && !this.data.showStartButton) {
        this.setData({
          showStartButton: true,
          showNextButton: true
        });
      }
    }
  },
})