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
      } else {
        this.hideDialogAsync();
      }
    },

    'soupId': function(newId, oldId) {
      if (newId && newId !== oldId && this.data.visible) {
        this.setData({ messages: [] });
        this.initializeMessages();
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
        this.animation.translateY('100%').opacity(0).step({ duration: 0 });
        await new Promise(resolve => {
          this.setData({ animationData: this.animation.export() }, resolve);
        });

        await new Promise(resolve => wx.nextTick(resolve));

        this.animation.translateY(0).opacity(1).step();
        await new Promise(resolve => {
          this.setData({ animationData: this.animation.export() }, resolve);
        });

        await new Promise(resolve => setTimeout(resolve, 300));

        this.setData({
          isFullyVisible: true,
          isAnimating: false
        });

        await this.initializeMessages();
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
        this.saveDialogContent();
        this.setData({ isFullyVisible: false });

        this.animation.translateY('100%').opacity(0).step();
        await new Promise(resolve => {
          this.setData({ animationData: this.animation.export() }, resolve);
        });

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
        if (this.data.messages.length === 0) {
          const initialMessages = dialogService.getInitialSystemMessages();
          this.setData({
            messages: initialMessages,
            loading: false
          });
        }
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
      if (!value || !value.trim()) return;

      if (value.trim() === '汤底') {
        this.triggerEvent('showTruth', { soupId: this.properties.soupId });
        this.handleClose();
        return;
      }

      // 创建用户消息对象
      const userMessage = {
        type: 'user',
        content: value.trim()
      };

      // 添加用户消息
      const messages = [...this.data.messages, userMessage];
      await new Promise(resolve => {
        this.setData({ messages }, resolve);
      });

      // 生成回复
      const reply = dialogService.generateReply();

      if (!this.properties.enableTyping) {
        // 不使用打字机效果时，直接添加完整回复
        const finalMessages = [...messages, {
          type: 'normal',
          content: reply.content
        }];

        this.setData({ messages: finalMessages });
        this.triggerEvent('messagesChange', { messages: finalMessages });
        return;
      }

      // 使用打字机效果
      const updatedMessages = [...messages, {
        type: 'normal',
        content: ''
      }];

      this.setData({
        messages: updatedMessages,
        animatingMessageIndex: updatedMessages.length - 1,
        isAnimating: true
      });

      // 启动打字机动画
      await this.typeAnimator.start(reply.content);

      // 动画完成后更新消息内容
      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = {
        type: 'normal',
        content: reply.content
      };

      this.setData({
        messages: finalMessages,
        animatingMessageIndex: -1
      });

      this.triggerEvent('messagesChange', { messages: finalMessages });
    },

    async handleVoiceSend(e) {
      const { tempFilePath, duration } = e.detail;
      // 处理语音消息
      const voiceMessage = {
        type: 'voice',
        content: tempFilePath,
        duration: duration
      };

      // 添加语音消息
      const messages = [...this.data.messages, voiceMessage];
      await new Promise(resolve => {
        this.setData({ messages }, resolve);
      });

      // 生成回复
      const reply = dialogService.generateReply();

      if (!this.properties.enableTyping) {
        // 不使用打字机效果时，直接添加完整回复
        const finalMessages = [...messages, {
          type: 'normal',
          content: reply.content
        }];

        this.setData({ messages: finalMessages });
        this.triggerEvent('messagesChange', { messages: finalMessages });
        return;
      }

      // 使用打字机效果
      const updatedMessages = [...messages, {
        type: 'normal',
        content: ''
      }];

      this.setData({
        messages: updatedMessages,
        animatingMessageIndex: updatedMessages.length - 1,
        isAnimating: true
      });

      // 启动打字机动画
      await this.typeAnimator.start(reply.content);

      // 动画完成后更新消息内容
      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = {
        type: 'normal',
        content: reply.content
      };

      this.setData({
        messages: finalMessages,
        animatingMessageIndex: -1
      });

      this.triggerEvent('messagesChange', { messages: finalMessages });
    },

    handleMessagesChange(e) {
      const { messages } = e.detail;
      if (messages && messages.length) {
        this.setData({ messages });
      }
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
