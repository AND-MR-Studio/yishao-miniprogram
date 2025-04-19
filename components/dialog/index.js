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
    loading: false,
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
    },

    detached() {
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
        this.showDialog();
        // 当对话框显示时，如果已有 soupId 则加载对话记录
        if (this.properties.soupId || dialogService.getCurrentSoupId()) {
          console.log('对话框显示，开始加载对话记录');
          // 等待一帧再加载，确保属性已经更新
          wx.nextTick(() => {
            this.loadDialogMessages();
          });
        } else {
          console.log('对话框显示，但没有 soupId，仅加载初始化消息');
          // 如果没有 soupId，则只加载初始化消息
          const initialMessages = dialogService.getInitialSystemMessages();
          this.setData({ messages: initialMessages });
        }
      } else {
        this.hideDialog();
      }
    },
    'soupId': function(soupId) {
      // 当soupId变化且对话框可见时，重新加载对话记录
      if (soupId && this.data.visible && !this.data.isAnimating) {
        console.log('soupId 变化，重新加载对话记录:', soupId);
        // 等待一帧再加载，确保属性已经更新
        wx.nextTick(() => {
          this.loadDialogMessages();
        });
      }
    }
  },

  methods: {
    async showDialog() {
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
      } catch (error) {
        console.error('显示对话组件出错:', error);
        this.setData({ isAnimating: false });
      }
    },

    async hideDialog() {
      if (this.data.isAnimating || !this.data.isFullyVisible) return;
      this.setData({ isAnimating: true });

      if (!this.animation) return;

      try {
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



    handleClose() {
      this.triggerEvent('close');
    },

    // 加载对话记录
    async loadDialogMessages() {
      console.log('尝试加载对话记录，当前属性:', this.properties);

      // 从 dialogService 获取当前汤面ID
      const serviceSoupId = dialogService.getCurrentSoupId();

      // 优先使用组件属性中的 soupId，如果没有则使用 dialogService 中的
      const soupId = this.properties.soupId || serviceSoupId;

      console.log('最终使用的 soupId:', soupId, '组件属性 soupId:', this.properties.soupId, 'dialogService soupId:', serviceSoupId);

      if (!soupId) {
        console.error('加载对话记录失败: 缺少soupId');
        // 加载初始化消息
        const initialMessages = dialogService.getInitialSystemMessages();
        this.setData({
          messages: initialMessages,
          loading: false
        });
        return;
      }

      // 设置加载状态
      this.setData({ loading: true });

      try {
        console.log('开始加载对话记录:', soupId);

        // 从服务器获取对话记录
        const messages = await dialogService.getDialogMessages(soupId);

        console.log(`成功加载 ${messages.length} 条对话记录`);

        // 更新到页面
        this.setData({
          messages: messages,
          loading: false
        });

        // 滚动到底部
        this.scrollToBottom();
      } catch (error) {
        console.error('加载对话记录失败:', error);

        // 出错时加载初始化消息
        const initialMessages = dialogService.getInitialSystemMessages();
        this.setData({
          messages: initialMessages,
          loading: false
        });
      }
    },

    // 滚动到底部
    scrollToBottom() {
      wx.nextTick(() => {
        wx.createSelectorQuery()
          .in(this)
          .select('#dialogScroll')
          .node()
          .exec(res => {
            if (res && res[0] && res[0].node) {
              const scrollView = res[0].node;
              scrollView.scrollIntoView({
                selector: '.message:last-child',
                animated: true
              });
            }
          });
      });
    },

    async handleSend(e) {
      // 处理文本消息
      const { value } = e.detail;
      if (!value || !value.trim() || this.data.isAnimating) return;

      // 创建用户消息对象
      const userMessage = {
        id: `msg_${Date.now()}`,
        type: 'user',
        content: value.trim(),
        status: 'sending',
        timestamp: Date.now()
      };

      // 添加用户消息
      const messages = [...this.data.messages, userMessage];
      this.setData({ messages });

      // 设置当前汤面ID
      const soupId = this.properties.soupId || '';
      dialogService.setCurrentSoupId(soupId);

      try {
        // 发送消息到服务器并获取回复
        const reply = await dialogService.sendMessage({
          message: userMessage.content,
          soupId
        });

        // 更新用户消息状态
        this.updateMessageStatus(userMessage.id, 'sent');

        // 创建回复消息
        const replyMessage = {
          ...reply,
          status: 'sent'
        };

        if (!this.properties.enableTyping) {
          // 不使用打字机效果时，直接添加完整回复
          const finalMessages = [...messages, replyMessage];
          this.setData({ messages: finalMessages });
          // 不再保存对话记录到本地，而是依赖服务器存储
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

        // 不再保存对话记录到本地，而是依赖服务器存储
      } catch (error) {
        console.error('发送消息失败:', error);
        this.updateMessageStatus(userMessage.id, 'error');
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

    handleVoiceEnd(e) {
      // 结束录音时的处理
      console.log('结束录音', e.detail);
      this.triggerEvent('messageStatusChange', {
        status: 'recordEnd',
        message: null
      });

      // 在当前实现中，我们不处理语音消息
      // 文本消息和语音消息统一处理
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
