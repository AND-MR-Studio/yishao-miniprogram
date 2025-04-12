// pages/dialog.js
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 当前汤面ID
    currentSoupId: '',
    // 输入框的值 
    inputValue: '',
    // 对话消息列表
    messages: [],
    keyboardHeight: 0,
    focus: false,
    isPeekingSoup: false // 控制是否偷看汤面（透明对话区域）
  },

  /**
   * 页面实例方法：设置当前使用的汤面ID
   * 供index页面调用
   */
  setSoupId(soupId) {
    if (!soupId) return;
    
    // 如果当前已有相同的soupId，不需要重新加载
    if (soupId === this.data.currentSoupId) return;
    
    // 设置当前汤面ID
    this.setData({ 
      currentSoupId: soupId
    });
    
    // 加载汤面数据
    this._fetchSoupData(soupId);
    
    // 加载历史消息
    this._loadHistoryMessages(soupId);
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取页面参数中的soupId
    const { soupId } = options;

    if (soupId) {
      // 保存当前汤面ID
      this.setData({
        currentSoupId: soupId
      });

      // 尝试加载历史对话记录
      this._loadHistoryMessages(soupId);

      // 从服务获取对应的汤面数据
      this._fetchSoupData(soupId);
    }
    
    // 监听键盘高度变化
    wx.onKeyboardHeightChange(res => {
      this.setData({
        keyboardHeight: res.height
      });
    });
  },

  /**
   * 加载历史对话记录 - 包含初始系统消息
   * @param {string} soupId 汤面ID
   * @private
   */
  _loadHistoryMessages(soupId) {
    if (!soupId) return;
    
    // 添加初始化系统消息
    const initialSystemMessages = [
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
      },
      {
        type: 'system',
        content: '长按对话区域显示汤面。'
      }
    ];
    
    dialogService.loadDialogMessages({
      soupId: soupId,
      success: (messages) => {
        // 将初始化消息添加到已加载消息的前面
        const combinedMessages = [...initialSystemMessages, ...(messages || [])];
        
        // 更新页面状态中的消息列表
        this.setData({ messages: combinedMessages });
        
        // 由于此时dialog-area组件可能尚未创建，使用setTimeout延迟设置
        setTimeout(() => {
          const dialogArea = this.selectComponent('#dialogArea');
          if (dialogArea) {
            dialogArea.setMessages(combinedMessages);
          }
        }, 300);
      }
    });
  },

  /**
   * 处理发送按钮点击事件
   */
  handleSend(e) {
    const { value } = e.detail;
    
    // 检查是否输入了"汤底"关键词
    if (value && value.trim() === '汤底') {
      // 添加系统消息
      const dialogArea = this.selectComponent('#dialogArea');
      if (dialogArea) {
        // 获取当前消息列表
        const currentMessages = dialogArea.getMessages();
        
        // 添加用户消息（手动添加，不通过handleUserMessage方法）
        const userMessage = {
          type: 'user',
          content: value.trim()
        };
        
        // 添加特殊回复
        const systemMessage = {
          type: 'system',
          content: '你喝到了汤底'
        };
        
        // 更新消息列表（同时添加用户消息和系统回复）
        const updatedMessages = [...currentMessages, userMessage, systemMessage];
        
        // 设置回组件
        dialogArea.setMessages(updatedMessages);
        
        // 滚动到底部
        this.scrollToBottom();
        
        // 显示汤底的逻辑可以保留在对话页面，不再需要跳转到主页
        console.log('汤底已显示，不再跳转主页');
      }
      return;
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
   * 处理放弃当前汤面的事件
   */
  handleAbandonSoup() {
    // 清除当前汤面的对话记录
    if (this.data.currentSoupId) {
      dialogService.deleteDialogMessages(this.data.currentSoupId);
    }
    
    try {
      // 使用id选择器查找导航栏组件，确保关闭设置面板
      const navBar = this.selectComponent('#navBar');
      if (navBar && navBar.onSettingClose) {
        // 关闭设置面板
        navBar.onSettingClose();
      }
    } catch (e) {
      // 关闭设置面板失败
    }
    
    // 不再需要跳转到主页
    console.log('放弃当前汤面，但不跳转主页');
    
    // 可以在这里添加加载新汤面的逻辑
    this._loadDefaultSoup();
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
   * 汤面动画完成事件处理函数 - 已不需要，保留空函数以便引用
   */
  onSoupAnimationComplete() {
    // 已移除soup-display组件，此方法不再需要
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

    // 如果没有当前汤面ID，加载默认汤面
    if (!this.data.currentSoupId) {
      this._loadDefaultSoup();
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
      // 获取最新消息列表
      const messages = dialogArea.getMessages();
      const soupId = this.data.currentSoupId;
      
      // 无论是否有变化，都进行保存以确保数据安全
      if (messages && messages.length && soupId) {
        dialogService.saveDialogMessages(soupId, messages);
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
      path: `/pages/dialog/dialog?soupId=${this.data.currentSoupId}`
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