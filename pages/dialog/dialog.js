// pages/dialog.js
const soupService = require('../../utils/soupService');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 页面配置
    soupConfig: {
      soupId: '',  // 不指定则随机获取，设为'default'显示默认汤面
      autoPlay: false,  // 是否自动播放动画
      staticMode: true  // 静态模式(不显示动画)
    },
    // 当前汤面ID
    currentSoupId: '',
    // 当前汤面数据
    currentSoupData: null,
    // 输入框的值
    inputValue: '',
    // 输入框焦点状态
    inputFocus: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取页面参数中的soupId
    const { soupId } = options;
    
    // 保存当前汤面ID
    this.setData({
      currentSoupId: soupId || ''
    });

    // 如果有soupId，直接从服务获取对应的汤面数据
    if (soupId) {
      soupService.getSoupData({
        soupId: soupId,
        success: (soupData) => {
          if (soupData) {
            // 保存完整的汤面数据到页面状态
            this.setData({
              currentSoupData: soupData
            });
            
            // 获取soup-display组件实例并设置数据
            const soupDisplay = this.selectComponent('#soupDisplay');
            if (soupDisplay) {
              soupDisplay.setCurrentSoup(soupData);
            }
          }
        }
      });
    }
  },

  /**
   * 汤面动画播放完成事件处理
   */
  onSoupAnimationComplete() {
    // 动画播放完成的处理逻辑
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 页面初次渲染完成的处理逻辑
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1  // 设置选中第二个tab
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 页面隐藏时的处理逻辑
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 页面卸载时的处理逻辑
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    // 分享逻辑
  },

  /**
   * 处理发送按钮点击事件
   */
  handleSend() {
    const { inputValue } = this.data;
    if (!inputValue.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    // TODO: 在这里处理发送消息的逻辑
    console.log('发送消息:', inputValue);

    // 清空输入框
    this.setData({
      inputValue: ''
    });
  },

  /**
   * 处理语音按钮点击事件
   */
  handleVoice() {
    // TODO: 在这里处理语音输入的逻辑
    console.log('语音输入');
  },

  // 处理输入事件
  handleInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },
})