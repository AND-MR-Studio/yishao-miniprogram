// pages/dialog.js
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 输入框的值 
    inputValue: '',
    // 对话消息列表
    messages: [],
    keyboardHeight: 0,
    focus: false,
    isPeekingSoup: false // 控制是否偷看汤面（透明对话区域）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 监听键盘高度变化
    wx.onKeyboardHeightChange(res => {
      this.setData({
        keyboardHeight: res.height
      });
    });
  },

  /**
   * 处理发送按钮点击事件
   */
  handleSend(e) {
    const { value } = e.detail;
    
    // 检查是否有内容
    if (!value || !value.trim()) {
      return;
    }
    
    // 使用dialogService处理用户输入
    const inputResult = dialogService.handleUserInput(value.trim());
    
    // 处理特殊关键词
    if (inputResult.isSpecial) {
      // 获取dialog-area组件实例
      const dialogArea = this.selectComponent('#dialogArea');
      if (dialogArea) {
        // 获取当前消息列表
        const currentMessages = dialogArea.getMessages();
        
        // 创建新的消息列表（添加用户消息和系统回复）
        const updatedMessages = [
          ...currentMessages, 
          inputResult.userMessage, 
          inputResult.reply
        ];
        
        // 设置回组件
        dialogArea.setMessages(updatedMessages);
        
        // 滚动到底部
        this.scrollToBottom();
        
        // 特殊处理"汤底"关键词
        if (value.trim() === '汤底') {
          console.log('汤底已显示，不再跳转主页');
        }
        
        return;
      }
    }
    
    // 获取dialog-area组件实例
    const dialogArea = this.selectComponent('#dialogArea');
    if (dialogArea) {
      // 调用组件的handleUserMessage方法处理用户消息
      dialogArea.handleUserMessage(value);
      
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
    if (messages && messages.length) {
      this.setData({ messages });
    }
  },

  /**
   * 滚动到对话区域底部
   */
  scrollToBottom() {
    // 使用组件实例方法调用组件内部的滚动方法
    const dialogArea = this.selectComponent('#dialogArea');
    if (dialogArea) {
      dialogArea.scrollToBottom();
    }
  },

  /**
   * 处理语音按钮点击事件
   */
  handleVoice() {
    // TODO: 在这里处理语音输入的逻辑
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
    // 页面隐藏时保存对话内容
    const dialogArea = this.selectComponent('#dialogArea');
    if (dialogArea) {
      // 检查是否有变化且需要保存
      if (dialogArea.hasChanged && dialogArea.hasChanged()) {
        dialogArea.saveMessages();
      }
    }
    
    // 清除长按查看汤面的定时器
    if (this.peekTimer) {
      clearTimeout(this.peekTimer);
      this.peekTimer = null;
    }
  },
  
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 页面卸载时保存对话内容
    const dialogArea = this.selectComponent('#dialogArea');
    if (dialogArea) {
      // 检查是否有变化且需要保存
      if (dialogArea.hasChanged && dialogArea.hasChanged()) {
        dialogArea.saveMessages();
      }
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    // 分享逻辑
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: '/pages/dialog/dialog'
    };
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
    
    // 5秒后自动恢复
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
  },

});