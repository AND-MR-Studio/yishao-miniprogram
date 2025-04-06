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
    messages: [],
    userInput: '',
    isLoading: false,
    canSend: true,
    keyboardHeight: 0,
    viewBottomHeight: 0,
    focus: false,
    dialogId: '', // 当前对话ID
    soupTitle: '', // 当前汤面标题
    isPeekingSoup: false // 控制是否偷看汤面（透明对话区域）
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
      currentSoupId: soupId
    });

    // 从服务获取对应的汤面数据
    soupService.getSoupData({
      soupId: soupId,
      success: (soupData) => {
        if (soupData) {
          // 保存完整的汤面数据到页面状态
          this.setData({
            currentSoupData: soupData,
            'soupConfig.soupId': soupId
          });

          // 获取soup-display组件实例并设置数据
          const soupDisplay = this.selectComponent('#soupDisplay');
          if (soupDisplay) {
            soupDisplay.setCurrentSoup(soupData);
          }
        }
      }
    });
    
    // 监听键盘高度变化
    wx.onKeyboardHeightChange(res => {
      this.setData({
        keyboardHeight: res.height
      });
    });
    
    // 初始化对话
    this.initDialog();
  },

  /**
   * 初始化对话消息
   * 不再设置初始消息，交由组件内部处理
   */
  initDialog() {
    // 初始消息由dialog-area组件内部创建和管理
    // 这里可以进行其他初始化操作
    
    // 延迟一小段时间后检查组件是否已经创建了消息，如果有则滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 200);
  },

  /**
   * 处理发送按钮点击事件
   */
  handleSend(e) {
    const { value } = e.detail;
    
    // 获取dialog-area组件实例
    const dialogArea = this.selectComponent('#dialogArea');
    if (dialogArea) {
      // 调用组件的handleUserMessage方法处理用户消息
      dialogArea.handleUserMessage(value);
      // 注意：input-bar组件现在会自动清空输入框，不需要在这里处理
      
      // 发送消息后主动调用滚动
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  },

  /**
   * 处理消息列表变化事件
   */
  handleMessagesChange(e) {
    // 从事件中获取更新后的消息列表并更新页面状态
    const { messages } = e.detail;
    this.setData({ messages }, () => {
      // 消息更新后滚动到底部
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    });
  },

  /**
   * 滚动到对话区域底部
   * 使用组件内部提供的方法
   */
  scrollToBottom() {
    // 使用组件实例方法调用组件内部的滚动方法
    const dialogArea = this.selectComponent('#dialogArea');
    if (dialogArea) {
      dialogArea.scrollToBottom();
      console.log('调用组件内部滚动方法');
    } else {
      console.error('未找到dialog-area组件实例');
    }
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

  onSoupAnimationComplete() {
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

  // 输入框获取焦点
  handleFocus() {
    this.setData({
      focus: true
    });
  },

  // 输入框失去焦点
  handleBlur() {
    this.setData({
      focus: false
    });
  },

  // 长按处理 - 查看汤面
  handleLongPress() {
    this.setData({ isPeekingSoup: true });
    
    // 3秒后自动恢复
    this.peekTimer = setTimeout(() => {
      this.setData({ isPeekingSoup: false });
    }, 5000);
  },
  
  // 触摸结束 - 恢复对话区域
  handleTouchEnd() {
    if (this.data.isPeekingSoup) {
      clearTimeout(this.peekTimer);
      this.setData({ isPeekingSoup: false });
    }
  }
});