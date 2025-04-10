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
    isPeekingSoup: false, // 控制是否偷看汤面（透明对话区域）
    userQuestionCount: 0, // 记录用户提问次数
    lastInteractionTime: 0, // 上次交互时间戳
  },

  /**
   * 页面实例方法：设置当前使用的汤面ID
   * 供index页面调用
   */
  setSoupId(soupId) {
    if (!soupId) return;
    
    // 如果当前已有相同的soupId，不需要重新加载
    if (soupId === this.data.currentSoupId) return;
    
    // 重置提示定时器
    this._resetIdleTimer();
    
    // 设置当前汤面ID - 同时更新soupConfig.soupId以便传递给组件
    this.setData({ 
      currentSoupId: soupId,
      'soupConfig.soupId': soupId
    });
    
    // 重置对话状态
    dialogService.resetDialogState();
    
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
        currentSoupId: soupId,
        'soupConfig.soupId': soupId
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
    
    // 启动提示定时器
    this._startIdleTimer();
  },

  /**
   * 启动长时间未提问检测定时器
   * @private
   */
  _startIdleTimer() {
    // 先清除现有定时器
    this._resetIdleTimer();

    // 设置定时器，每15秒检查一次是否长时间未提问
    this.idleCheckTimer = setInterval(() => {
      this._checkUserIdle();
    }, 15000); // 15秒检查一次
    
    // 更新交互时间
    dialogService.updateInteractionTime();
    
    console.log('启动空闲检测定时器');
  },

  /**
   * 重置长时间未提问检测定时器
   * @private
   */
  _resetIdleTimer() {
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }

    if (this.idleHintTimer) {
      clearTimeout(this.idleHintTimer);
      this.idleHintTimer = null;
    }
  },

  /**
   * 检查用户是否长时间未提问
   * @private
   */
  _checkUserIdle() {
    // 获取dialog-area组件实例
    const dialogArea = this.selectComponent('#dialogArea');
    if (!dialogArea) return;
    
    // 获取当前消息列表
    const currentMessages = dialogArea.getMessages();
    
    // 不连续显示提示，确保至少间隔一定时间
    if (!this.idleHintTimer) {
      // 准备显示提示
      this.idleHintTimer = setTimeout(() => {
        // 使用dialogService检查是否需要显示空闲提示
        const hintMessage = dialogService.checkIdleAndGenerateHint(currentMessages);
        
        if (hintMessage) {
          // 更新消息列表
          const updatedMessages = [...currentMessages, hintMessage];
          
          // 设置回组件
          dialogArea.setMessages(updatedMessages);
          
          // 滚动到底部确保提示消息可见
          this.scrollToBottom();
        }
        
        this.idleHintTimer = null;
      }, 500);
    }
  },
  
  /**
   * 测试强制显示空闲提示（仅用于调试）
   * @private
   */
  _testShowIdleHint() {
    const dialogArea = this.selectComponent('#dialogArea');
    if (!dialogArea) return;
    
    // 获取当前消息列表
    const currentMessages = dialogArea.getMessages();
    
    // 使用dialogService强制生成提示
    const hintMessage = dialogService.forceIdleHint();
    
    // 更新消息列表
    const updatedMessages = [...currentMessages, hintMessage];
    
    // 设置回组件
    dialogArea.setMessages(updatedMessages);
    
    // 滚动到底部确保提示消息可见
    this.scrollToBottom();
    
    console.log('已强制显示空闲提示');
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
    
    // 更新交互时间
    dialogService.updateInteractionTime();
    
    // 检查是否是测试命令
    if (value && value.trim() === '测试提示') {
      this._testShowIdleHint();
      this.setData({ inputValue: '' });
      return;
    }
    
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
        
        // 设置汤面ID和汤底信息到全局，以便在主页显示
        const app = getApp();
        if (app.globalData) {
          // 创建全局数据对象（如果不存在）
          app.globalData = app.globalData || {};
          
          // 获取汤面数据（优先使用现有数据或同步获取）
          let truthData = null;
          
          // 确保汤面数据完整
          if (this.data.currentSoupData && this.data.currentSoupData.truth) {
            truthData = JSON.parse(JSON.stringify(this.data.currentSoupData));
          } else {
            // 尝试同步获取数据
            const soupData = soupService.getSoupById(this.data.currentSoupId);
            if (soupData && soupData.truth) {
              truthData = JSON.parse(JSON.stringify(soupData));
            }
          }
          
          // 如果成功获取数据，设置到全局变量
          if (truthData) {
            app.globalData.showTruth = true;
            app.globalData.isCorrect = true;
            app.globalData.truthSoupId = this.data.currentSoupId;
            app.globalData.truthData = truthData;
            
            console.log('成功设置汤底数据：', {
              id: truthData.soupId,
              title: truthData.title,
              truth: truthData.truth
            });
          } else {
            // 无法获取完整数据，设置最小必要信息
            console.log('无法获取完整汤底数据，仅设置ID');
            app.globalData.showTruth = true;
            app.globalData.isCorrect = true;
            app.globalData.truthSoupId = this.data.currentSoupId;
          }
        }
        
        // 短暂延迟后跳转到主页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      }
      return;
    }
    
    // 获取dialog-area组件实例
    const dialogArea = this.selectComponent('#dialogArea');
    if (dialogArea) {
      // 获取当前消息列表
      const currentMessages = dialogArea.getMessages();
      
      // 调用组件的handleUserMessage方法处理用户消息
      dialogArea.handleUserMessage(value);
      
      // 使用dialogService检查是否需要显示第三次提问提示
      const hintMessage = dialogService.updateQuestionCountAndCheckHint(currentMessages);
      
      // 如果需要显示提示消息
      if (hintMessage) {
        // 延迟添加提示，让回答先显示
        setTimeout(() => {
          // 重新获取最新消息列表（包含刚添加的用户消息和系统回复）
          const updatedMessages = dialogArea.getMessages();
          
          // 添加绿色提示消息
          const finalMessages = [...updatedMessages, hintMessage];
          
          // 设置回组件
          dialogArea.setMessages(finalMessages);
          
          // 滚动到底部确保提示消息可见
          this.scrollToBottom();
        }, 500);
      }
      
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
    
    // 返回首页前确保等待设置面板关闭
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 100);
  },

  /**
   * 处理输入事件
   */
  handleInput(e) {
    // 更新交互时间
    dialogService.updateInteractionTime();
    
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
    
    // 重新启动提示定时器
    this._startIdleTimer();

    // 检查全局变量中是否有待处理的soupId
    if (getApp().globalData && getApp().globalData.pendingSoupId) {
      const soupId = getApp().globalData.pendingSoupId;
      delete getApp().globalData.pendingSoupId; // 使用后删除
      this.setSoupId(soupId);
    } else if (!this.data.currentSoupId) {
      // 如果没有soupId，尝试加载默认汤面
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
    
    // 清除提示定时器
    this._resetIdleTimer();
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
    
    // 清除提示定时器
    this._resetIdleTimer();
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
    dialogService.updateInteractionTime();
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
    dialogService.updateInteractionTime();
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
          currentSoupId: soupId,
          'soupConfig.soupId': soupId 
        });
        
        // 加载汤面数据
        this._fetchSoupData(soupId);
        
        // 加载历史消息
        this._loadHistoryMessages(soupId);
      }
    });
  },

  /**
   * 从服务获取汤面数据
   * @param {string} soupId 汤面ID
   * @private
   */
  _fetchSoupData(soupId) {
    if (!soupId) return;
    
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