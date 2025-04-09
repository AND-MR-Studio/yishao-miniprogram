// pages/dialog.js
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');

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
    // 对话消息列表
    messages: [],
    keyboardHeight: 0,
    focus: false,
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

    // 告知dialogService当前的soupId
    dialogService.setCurrentSoupId(soupId);

    // 尝试加载历史对话记录
    this._loadHistoryMessages(soupId);

    // 从服务获取对应的汤面数据
    soupService.getSoupData({
      soupId: soupId,
      success: (soupData) => {
        if (soupData) {
          // 保存完整的汤面数据到页面状态
          this.setData({
            currentSoupData: soupData,
            'soupConfig.soupId': soupId,
            soupTitle: soupData.title || '未命名汤面' // 保存汤面标题
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
  },

  /**
   * 加载历史对话记录
   * @param {string} soupId 汤面ID
   * @private
   */
  _loadHistoryMessages(soupId) {
    dialogService.loadDialogMessages({
      soupId: soupId,
      success: (messages) => {
        // 添加初始化系统消息（但不存储）
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
   * 汤面动画完成事件处理函数
   */
  onSoupAnimationComplete() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }

    // 从dialogService获取当前选中的汤面ID
    const soupId = dialogService.getCurrentSoupId();
    
    // 如果有选中的汤面ID，则加载对应的汤面数据
    if (soupId) {
      // 如果soupId变更，或者当前页面没有加载汤面，则加载新的汤面
      if (soupId !== this.data.currentSoupId || !this.data.currentSoupId) {
        console.log('加载汤面ID:', soupId);
        
        // 设置当前汤面ID
        this.setData({ 
          currentSoupId: soupId
        });
        
        // 加载汤面数据
        this._fetchSoupData(soupId);
        
        // 加载历史消息
        this._tryLoadHistoryMessages(soupId);
      }
    } else {
      // 如果没有选中的汤面ID，尝试加载默认汤面
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
    
    // 保存后清除当前对话服务中的汤面ID
    dialogService.clearCurrentSoupId();
    
    // 页面隐藏时清除当前页面状态，确保下次通过tabBar切换回来时能重新加载
    // 这样从我的页面点击不同汤面时，可以正确加载新的汤面
    this.setData({
      currentSoupId: '', // 清空当前汤面ID，强制下次onShow时重新加载
      'soupConfig.soupId': ''
    });
    
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
      path: '/pages/index/index'
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

  /**
   * 尝试加载历史消息
   * @param {string} soupId 汤面ID
   * @private
   */
  _tryLoadHistoryMessages(soupId) {
    dialogService.loadDialogMessages({
      soupId: soupId,
      success: (messages) => {
        if (messages && messages.length) {
          // 合并系统消息和历史消息
          const systemMessages = this._getInitialSystemMessages(soupId);
          const allMessages = [...systemMessages, ...messages];
          
          this.setData({
            messages: allMessages
          });
          
          console.log('已加载历史消息:', messages.length);
        } else {
          // 没有历史消息，只加载系统初始消息
          const systemMessages = this._getInitialSystemMessages(soupId);
          this.setData({
            messages: systemMessages
          });
          
          console.log('无历史消息，加载系统消息');
        }
      }
    });
  },

  /**
   * 加载默认汤面
   * @private
   */
  _loadDefaultSoup() {
    soupService.getAllSoups((soups) => {
      if (soups && soups.length > 0) {
        const defaultSoup = soups[0];
        const soupId = defaultSoup.soupId;
        
        // 设置当前汤面ID
        this.setData({ 
          currentSoupId: soupId 
        });
        
        // 同步到dialogService
        dialogService.setCurrentSoupId(soupId);
        
        // 加载汤面数据
        this._fetchSoupData(soupId);
        
        // 加载历史消息
        this._tryLoadHistoryMessages(soupId);
      }
    });
  },

  /**
   * 获取初始化系统消息
   * @param {string} soupId 汤面ID
   * @private
   */
  _getInitialSystemMessages(soupId) {
    return [
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
  },

  /**
   * 从服务获取汤面数据
   * @param {string} soupId 汤面ID
   * @private
   */
  _fetchSoupData(soupId) {
    soupService.getSoupData({
      soupId: soupId,
      success: (soupData) => {
        if (soupData) {
          // 保存完整的汤面数据到页面状态
          this.setData({
            currentSoupData: soupData,
            'soupConfig.soupId': soupId,
            soupTitle: soupData.title || '未命名汤面' // 保存汤面标题
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
});