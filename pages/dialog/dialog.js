// pages/dialog.js
const soupService = require('../../utils/soupService');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 页面配置
    soupConfig: {
      soupId: '',  // 从index页面传入的汤面ID
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
    // 对话消息列表
    messages: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取页面参数中的soupId
    const { soupId } = options;
    
    if (!soupId) {
      // 如果没有传入soupId，返回上一页
      wx.navigateBack();
      return;
    }
    
    // 保存当前汤面ID
    this.setData({
      currentSoupId: soupId,
      // 添加初始系统消息 - 拆分为三条独立的消息，每条单独应用样式
      messages: [
        {
          type: 'system',
          content: '欢迎来到一勺海龟汤。'
        },
        {
          type: 'system',
          content: '你需要通过提问来猜测谜底，'
        },
        {
          type: 'system',
          content: '我只会回答"是"、"否"或"不确定"。'
        }
      ]
    });

    // 从服务获取对应的汤面数据
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
  },

  /**
   * 处理发送按钮点击事件
   */
  handleSend(e) {
    const { value } = e.detail;
    if (!value.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    // 添加用户消息
    const newMessages = [...this.data.messages, {
      type: 'user',
      content: value
    }];

    // 模拟系统回复（这里应该替换为实际的回复逻辑）
    const responses = ['是', '否', '不确定'];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // 不需要添加前缀，WXML会处理
    newMessages.push({
      type: 'system',
      content: randomResponse
    });

    // 更新消息列表并清空输入框
    this.setData({
      messages: newMessages,
      inputValue: ''
    }, () => {
      // 在setData的回调中获取组件并滚动
      const dialogArea = this.selectComponent('dialog-area');
      if (dialogArea) {
        setTimeout(() => {
          dialogArea.scrollToBottom();
        }, 100);
      }
    });
  },

  /**
   * 处理语音按钮点击事件
   */
  handleVoice() {
    // TODO: 在这里处理语音输入的逻辑
    console.log('语音输入');
  },

  /**
   * 处理输入事件
   */
  handleInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
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
  }
});