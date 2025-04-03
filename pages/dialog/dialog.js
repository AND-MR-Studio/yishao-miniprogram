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
      autoPlay: true,
      // 静态模式
      staticMode: true
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取页面参数中的soupId
    const { soupId } = options;
    
    // 获取数据通道
    const eventChannel = this.getOpenerEventChannel();
    // 监听数据传递事件
    eventChannel.on('acceptDataFromOpenerPage', (soupData) => {
      console.log('接收到的汤面数据：', soupData);
      // 获取soup-display组件实例并设置数据
      const soupDisplay = this.selectComponent('#soupDisplay');
      if (soupDisplay) {
        soupDisplay.setCurrentSoup(soupData);
      }
    });
  },

  /**
   * 汤面动画播放完成事件处理
   */
  onSoupAnimationComplete() {
    console.log('dialog页面汤面动画播放完成');
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

  }
})