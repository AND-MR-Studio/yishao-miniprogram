// pages/dialog.js
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    soupId: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 输入框的值 
    inputValue: '',
    // 对话消息列表
    messages: [],
    keyboardHeight: 0,
    focus: false,
    isPeekingSoup: false, // 控制是否偷看汤面（透明对话区域）
    animationData: {}, // 动画数据
    isFullyVisible: false // 是否完全显示
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 监听键盘高度变化
      wx.onKeyboardHeightChange(res => {
        this.setData({
          keyboardHeight: res.height
        });
      });
      
      // 创建动画实例
      this.animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease',
      });
    },
    
    detached() {
      // 保存对话内容
      this.saveDialogContent();
      
      // 清除长按查看汤面的定时器
      if (this.peekTimer) {
        clearTimeout(this.peekTimer);
        this.peekTimer = null;
      }
    }
  },

  /**
   * 数据监听器
   */
  observers: {
    'visible': function(visible) {
      // 确保animation已初始化后再执行动画
      if (visible) {
        if (this.animation) {
          this.showDialog();
        } else {
          // 延迟到下一个渲染周期，确保animation已初始化
          setTimeout(() => {
            this.showDialog();
          }, 50);
        }
      } else {
        if (this.animation) {
          this.hideDialog();
        }
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 显示对话组件
     */
    showDialog() {
      // 从底部滑入
      this.animation.translateY(0).opacity(1).step();
      this.setData({
        animationData: this.animation.export()
      });
      
      // 300ms后标记为完全可见
      setTimeout(() => {
        this.setData({ isFullyVisible: true });
      }, 300);
    },
    
    /**
     * 隐藏对话组件
     */
    hideDialog() {
      // 先保存对话内容
      this.saveDialogContent();
      
      // 标记为不完全可见
      this.setData({ isFullyVisible: false });
      
      // 向底部滑出
      this.animation.translateY('100%').opacity(0).step();
      this.setData({
        animationData: this.animation.export()
      });
      
      // 通知父组件已关闭
      setTimeout(() => {
        this.triggerEvent('close');
      }, 300);
    },
    
    /**
     * 保存对话内容
     */
    saveDialogContent() {
      const dialogArea = this.selectComponent('#dialogArea');
      if (dialogArea) {
        // 检查是否有变化且需要保存
        if (dialogArea.hasChanged && dialogArea.hasChanged()) {
          dialogArea.saveMessages();
        }
      }
    },
    
    /**
     * 处理关闭按钮点击
     */
    handleClose() {
      this.hideDialog();
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
            console.log('汤底已显示，准备关闭对话页面');
            // 触发汤底事件给父组件
            this.triggerEvent('showTruth', { soupId: this.properties.soupId });
            // 关闭对话组件
            this.hideDialog();
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

    /**
     * 长按处理 - 查看汤面
     */
    handleLongPress() {
      // 设置完全透明以查看底层的汤面
      this.setData({ 
        isPeekingSoup: true
      });
      
      // 通知父组件我们正在查看汤面
      this.triggerEvent('peekSoup', { isPeeking: true });
      
      // 5秒后自动恢复
      this.peekTimer = setTimeout(() => {
        this.setData({ isPeekingSoup: false });
        this.triggerEvent('peekSoup', { isPeeking: false });
      }, 5000);
    },
    
    /**
     * 触摸结束 - 恢复对话区域
     */
    handleTouchEnd() {
      if (this.data.isPeekingSoup) {
        clearTimeout(this.peekTimer);
        this.setData({ isPeekingSoup: false });
        // 通知父组件结束查看汤面
        this.triggerEvent('peekSoup', { isPeeking: false });
      }
    }
  }
})