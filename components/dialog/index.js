// components/dialog/index.js
const dialogService = require('../../utils/dialogService');
const typeAnimation = require('../../utils/typeAnimation');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    soupId: {
      type: String,
      value: ''
    },
    // 是否启用打字机效果
    enableTyping: {
      type: Boolean,
      value: true
    },
    // 打字机速度
    typeSpeed: {
      type: Number,
      value: 60
    }
  },

  data: {
    messages: [],
    keyboardHeight: 0,
    isPeekingSoup: false,
    animationData: {},
    isFullyVisible: false,
    loading: true,
    isAnimating: false,
    displayLines: [],
    animatingMessageIndex: -1 // 当前正在执行动画的消息索引
  },

  lifetimes: {
    attached() {
      wx.onKeyboardHeightChange(res => {
        this.setData({ keyboardHeight: res.height });
      });

      this.animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease',
      });

      // 初始化打字机动画实例
      this.typeAnimator = typeAnimation.createInstance(this, {
        typeSpeed: this.properties.typeSpeed,
        onAnimationComplete: () => {
          this.setData({ isAnimating: false });
        }
      });

      this.initializeMessages();
    },

    detached() {
      this.saveDialogContent();

      // 组件销毁时清理打字机动画资源
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
      }
    }
  },

  observers: {
    'visible': function(visible) {
      if (this.data.isAnimating) return;

      if (visible) {
        this.showDialogAsync();

        // 检查是否需要初始化消息
        if (this._needInitMessages) {
          this._needInitMessages = false;
          this.initializeMessages();
        }
      } else {
        this.hideDialogAsync();
      }
    },

    'soupId': function(newId, oldId) {
      // 确保 newId 不为 null 或 undefined
      newId = newId || '';
      oldId = oldId || '';

      // 如果当前汤面ID与新设置的ID相同，不需要重新初始化
      if (newId && newId !== oldId) {
        // 检查dialogService中的当前汤面ID是否与新ID相同
        const currentServiceId = dialogService.getCurrentSoupId();

        // 如果新ID与datalogService中的ID不同，才需要重新初始化
        if (newId !== currentServiceId) {
          console.log('汤面ID变化，需要重新初始化消息，新ID:', newId, '旧ID:', currentServiceId);
          this.setData({ messages: [] });

          // 如果组件可见，立即初始化消息
          if (this.data.visible) {
            this.initializeMessages();
          } else {
            // 如果组件不可见，标记需要在显示时初始化
            this._needInitMessages = true;
          }
        } else {
          console.log('汤面ID与datalogService中的ID相同，不需要重新初始化');
        }
      }
    }
  },

  methods: {
    async showDialogAsync() {
      if (this.data.isAnimating) return;
      this.setData({ isAnimating: true });

      if (!this.animation) {
        this.animation = wx.createAnimation({
          duration: 300,
          timingFunction: 'ease',
        });
      }

      try {
        // 初始化动画
        this.animation.translateY('100%').opacity(0).step({ duration: 0 });
        this.setData({ animationData: this.animation.export() });

        // 等待下一帧
        await new Promise(resolve => wx.nextTick(resolve));

        // 执行显示动画
        this.animation.translateY(0).opacity(1).step();
        this.setData({ animationData: this.animation.export() });

        // 等待动画完成
        await new Promise(resolve => setTimeout(resolve, 300));

        this.setData({
          isFullyVisible: true,
          isAnimating: false
        });

        // 如果消息为空或者需要初始化，则初始化消息
        if (this.data.messages.length === 0 || this._needInitMessages) {
          this._needInitMessages = false;
          await this.initializeMessages();
        }
      } catch (error) {
        console.error('显示对话组件出错:', error);
        this.setData({ isAnimating: false });
      }
    },

    async hideDialogAsync() {
      if (this.data.isAnimating || !this.data.isFullyVisible) return;
      this.setData({ isAnimating: true });

      if (!this.animation) return;

      try {
        // 保存对话内容
        this.saveDialogContent();
        this.setData({ isFullyVisible: false });

        // 执行隐藏动画
        this.animation.translateY('100%').opacity(0).step();
        this.setData({ animationData: this.animation.export() });

        // 等待动画完成
        await new Promise(resolve => setTimeout(resolve, 300));

        this.setData({ isAnimating: false });
        this.triggerEvent('close');
      } catch (error) {
        console.error('隐藏对话组件出错:', error);
        this.setData({ isAnimating: false });
        this.triggerEvent('close');
      }
    },

    async initializeMessages() {
      try {
        // 获取当前汤面ID
        const soupId = this.properties.soupId || '';
        const currentServiceId = dialogService.getCurrentSoupId();

        // 只有当ID与datalogService中的ID不同时，才需要重新设置
        if (soupId !== currentServiceId) {
          console.log('设置当前汤面ID:', soupId);
          dialogService.setCurrentSoupId(soupId);
        }

        // 如果没有汤面ID，使用空消息列表
        if (!soupId) {
          console.log('没有汤面ID，使用空消息列表');
          this.setData({
            messages: [],
            loading: false
          });
          return;
        }

        // 尝试从本地存储加载历史消息
        let historyMessages = [];
        try {
          console.log('尝试加载汤面ID为', soupId, '的历史消息');
          historyMessages = await dialogService.loadDialogMessagesAsync(soupId);
          console.log('加载到历史消息:', historyMessages.length, '条');
        } catch (loadError) {
          console.warn('加载历史消息失败:', loadError);
        }

        // 合并初始系统消息与历史消息
        const initialMessages = dialogService.combineWithInitialMessages(historyMessages);

        this.setData({
          messages: initialMessages,
          loading: false
        });
      } catch (error) {
        console.error('初始化消息出错:', error);
        this.setData({ loading: false });
      }
    },

    saveDialogContent() {
      if (this.data.messages && this.data.messages.length > 0 && this.properties.soupId) {
        dialogService.saveDialogMessages(this.properties.soupId, this.data.messages);
      }
    },

    handleClose() {
      this.triggerEvent('close');
    },

    async handleSend(e) {
      const { value } = e.detail;
      if (!value || !value.trim() || this.data.isAnimating) return;

      // 设置当前汤面ID
      const soupId = this.properties.soupId || '';
      dialogService.setCurrentSoupId(soupId);

      // 处理用户输入
      const result = dialogService.handleUserInput(value);

      // 如果是特殊关键词
      if (result.isSpecial && result.userMessage.content === '汤底') {
        this.triggerEvent('showTruth', { soupId });
        this.handleClose();
        return;
      }

      // 获取用户消息
      const userMessage = {
        ...result.userMessage,
        status: 'sending'
      };

      // 添加用户消息
      const messages = [...this.data.messages, userMessage];
      this.setData({ messages });

      // 通知页面消息状态变化
      this.triggerEvent('messageStatusChange', {
        status: 'sending',
        message: userMessage
      });

      try {
        // 发送消息到服务器并获取回复
        const reply = await dialogService.sendMessage({
          message: userMessage.content,
          soupId
        });

        const replyMessage = {
          ...reply,
          status: 'sent'
        };

        // 更新用户消息状态
        this.updateMessageStatus(userMessage.id, 'sent');

        if (!this.properties.enableTyping) {
          // 不使用打字机效果时，直接添加完整回复
          const finalMessages = [...messages, replyMessage];
          this.setData({ messages: finalMessages });
          this.triggerEvent('messagesChange', { messages: finalMessages });
          this.triggerEvent('messageStatusChange', {
            status: 'sent',
            message: replyMessage
          });
          return;
        }

        // 使用打字机效果
        const updatedMessages = [...messages, {
          id: replyMessage.id,
          type: 'normal',
          content: '',
          status: 'typing',
          timestamp: replyMessage.timestamp
        }];

        this.setData({
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          isAnimating: true
        });

        // 启动打字机动画
        await this.typeAnimator.start(replyMessage.content);

        // 动画完成后更新消息内容
        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = replyMessage;

        this.setData({
          messages: finalMessages,
          animatingMessageIndex: -1
        });

        this.triggerEvent('messagesChange', { messages: finalMessages });
        this.triggerEvent('messageStatusChange', {
          status: 'sent',
          message: replyMessage
        });
      } catch (error) {
        console.error('发送消息失败:', error);
        this.updateMessageStatus(userMessage.id, 'error');
        this.triggerEvent('messageStatusChange', {
          status: 'error',
          error: error.message
        });
      }
    },

    // 更新消息状态
    updateMessageStatus(messageId, newStatus) {
      const messages = [...this.data.messages];
      const index = messages.findIndex(msg => msg.id === messageId);

      if (index !== -1) {
        messages[index] = {
          ...messages[index],
          status: newStatus
        };

        this.setData({ messages });
      }
    },

    async handleVoiceSend(e) {
      const { tempFilePath, duration } = e.detail;
      if (this.data.isAnimating) return;

      // 设置当前汤面ID
      const soupId = this.properties.soupId || '';
      dialogService.setCurrentSoupId(soupId);

      // 处理语音消息
      const voiceMessage = {
        id: `msg_${Date.now()}`,
        type: 'voice',
        content: tempFilePath,
        duration: duration,
        status: 'sending',
        timestamp: Date.now()
      };

      // 添加语音消息
      const messages = [...this.data.messages, voiceMessage];
      this.setData({ messages });

      // 通知页面消息状态变化
      this.triggerEvent('messageStatusChange', {
        status: 'sending',
        message: voiceMessage
      });

      try {
        // 发送语音消息到服务器并获取回复
        const reply = await dialogService.sendMessage({
          message: '[voice]', // 语音消息标记
          soupId,
          voiceFile: tempFilePath,
          duration: duration
        });

        const replyMessage = {
          ...reply,
          status: 'sent'
        };

        // 更新语音消息状态
        this.updateMessageStatus(voiceMessage.id, 'sent');

        if (!this.properties.enableTyping) {
          // 不使用打字机效果时，直接添加完整回复
          const finalMessages = [...messages, replyMessage];
          this.setData({ messages: finalMessages });
          this.triggerEvent('messagesChange', { messages: finalMessages });
          this.triggerEvent('messageStatusChange', {
            status: 'sent',
            message: replyMessage
          });
          return;
        }

        // 使用打字机效果
        const updatedMessages = [...messages, {
          id: replyMessage.id,
          type: 'normal',
          content: '',
          status: 'typing',
          timestamp: replyMessage.timestamp
        }];

        this.setData({
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          isAnimating: true
        });

        // 启动打字机动画
        await this.typeAnimator.start(replyMessage.content);

        // 动画完成后更新消息内容
        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = replyMessage;

        this.setData({
          messages: finalMessages,
          animatingMessageIndex: -1
        });

        this.triggerEvent('messagesChange', { messages: finalMessages });
        this.triggerEvent('messageStatusChange', {
          status: 'sent',
          message: replyMessage
        });
      } catch (error) {
        console.error('发送语音消息失败:', error);
        this.updateMessageStatus(voiceMessage.id, 'error');
        this.triggerEvent('messageStatusChange', {
          status: 'error',
          error: error.message
        });
      }
    },

    handleMessagesChange(e) {
      const { messages } = e.detail;
      if (messages && messages.length) {
        this.setData({ messages });
      }
    },

    // 语音相关处理函数
    handleVoiceStart() {
      // 开始录音时的处理
      console.log('开始录音');
      this.triggerEvent('messageStatusChange', {
        status: 'recording',
        message: null
      });
    },

    handleVoiceEnd() {
      // 结束录音时的处理
      console.log('结束录音');
      this.triggerEvent('messageStatusChange', {
        status: 'recordEnd',
        message: null
      });
    },

    handleVoiceCancel() {
      // 取消录音时的处理
      console.log('取消录音');
      this.triggerEvent('messageStatusChange', {
        status: 'recordCancel',
        message: null
      });
    },

    // 偷看相关功能
    handleLongPress() {
      this.setData({ isPeekingSoup: true });
      this.triggerEvent('peekSoup', { isPeeking: true });
    },

    handleTouchEnd() {
      if (this.data.isPeekingSoup) {
        this.setData({ isPeekingSoup: false });
        this.triggerEvent('peekSoup', { isPeeking: false });
      }
    }
  }
});
