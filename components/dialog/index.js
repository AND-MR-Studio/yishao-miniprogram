// components/dialog/index.js
const dialogService = require('../../utils/dialogService');
const typeAnimation = require('../../utils/typeAnimation');
const userService = require('../../utils/userService');

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
    dialogId: {
      type: String,
      value: ''
    },
    userId: {
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
    animationData: {},
    isFullyVisible: false,
    loading: false,
    isAnimating: false,
    displayLines: [],
    animatingMessageIndex: -1, // 当前正在执行动画的消息索引
    _previousDialogId: '' // 用于跟踪dialogId变化，避免重复加载
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
        // 显示对话框
        this.showDialog();

        // 如果有dialogId，确保对话记录已加载
        // 统一在这里处理加载，避免多处触发
        const dialogId = this.properties.dialogId;
        if (dialogId && dialogId !== this.data._previousDialogId) {
          this.data._previousDialogId = dialogId;
          // 确保在动画开始后加载对话记录
          wx.nextTick(() => {
            this.loadDialogMessages();
          });
        }
      } else {
        // 隐藏对话框
        this.hideDialog();
      }
    },

    // 简化soupId和dialogId的观察器
    // 只在特定条件下触发加载
    'soupId, dialogId': function(soupId, dialogId) {
      // 当属性变化且对话框可见且不在动画中时，重新加载对话记录
      if (this.data.visible && !this.data.isAnimating) {
        // 如果有dialogId，优先使用dialogId加载
        if (dialogId && dialogId !== this.data._previousDialogId) {
          console.log('dialogId变化，加载对话记录:', dialogId);
          this.data._previousDialogId = dialogId;

          wx.nextTick(() => {
            this.loadDialogMessages();
          });
        }
        // 如果没有dialogId但有soupId，使用soupId加载初始消息
        else if (soupId && !dialogId) {
          wx.nextTick(() => {
            this.loadDialogMessages();
          });
        }
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
        // 初始化动画 - 只设置透明度为0
        this.animation.opacity(0).step({ duration: 0 });
        this.setData({
          animationData: this.animation.export(),
          visible: true // 先设置为可见，但透明度为0
        });

        // 等待下一帧
        await new Promise(resolve => wx.nextTick(resolve));

        // 执行显示动画 - 只改变透明度，实现原地渐变显示
        this.animation.opacity(1).step();
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

        // 执行隐藏动画 - 只使用透明度动画
        this.animation.opacity(0).step();
        this.setData({ animationData: this.animation.export() });

        // 等待动画完成
        await new Promise(resolve => setTimeout(resolve, 300));

        // 完全隐藏元素，确保不会阻挡点击
        this.setData({
          isAnimating: false,
          visible: false
        });
        this.triggerEvent('close');
      } catch (error) {
        console.error('隐藏对话组件出错:', error);
        this.setData({
          isAnimating: false,
          visible: false
        });
        this.triggerEvent('close');
      }
    },

    handleClose() {
      this.triggerEvent('close');
    },

    /**
     * 加载对话记录
     * 统一处理对话记录的加载逻辑，避免重复加载
     * @returns {Promise<Array>} 加载的消息数组
     */
    async loadDialogMessages() {
      // 防止重复加载
      if (this.data.loading) {
        console.log('正在加载对话记录，跳过重复加载');
        return;
      }

      // 优先使用组件属性中的 dialogId，如果没有则使用 dialogService 中的
      const dialogId = this.properties.dialogId || dialogService.getCurrentDialogId();
      const soupId = this.properties.soupId || dialogService.getCurrentSoupId();

      // 设置加载状态
      this.setData({ loading: true });

      try {
        // 确保服务层也知道当前的 dialogId 和 soupId
        if (soupId) {
          dialogService.setCurrentSoupId(soupId);
        }

        let messages = [];

        if (!dialogId) {
          console.log('缺少 dialogId，仅加载初始化消息');
          // 加载初始化消息
          messages = dialogService.getInitialSystemMessages();
        } else {
          // 设置当前对话ID
          dialogService.setCurrentDialogId(dialogId);

          // 从服务器获取对话记录
          messages = await dialogService.getDialogMessages(dialogId);
        }

        // 更新到页面
        this.setData({
          messages: messages,
          loading: false
        });

        // 滚动到底部
        this.scrollToBottom();

        return messages;
      } catch (error) {
        console.error('加载对话记录失败:', error);

        // 出错时加载初始化消息
        const initialMessages = dialogService.getInitialSystemMessages();
        this.setData({
          messages: initialMessages,
          loading: false
        });

        return initialMessages;
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

      // 获取必要参数
      const soupId = this.properties.soupId || '';
      const dialogId = this.properties.dialogId || dialogService.getCurrentDialogId();
      const userId = this.properties.userId || '';

      // 检查必要参数
      if (!dialogId) {
        console.error('发送消息失败: 缺少对话ID');
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
        return;
      }

      if (!userId) {
        console.error('发送消息失败: 缺少用户ID');
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
        return;
      }

      // 设置当前海龟汤ID和对话ID
      dialogService.setCurrentSoupId(soupId);
      dialogService.setCurrentDialogId(dialogId);

      // 更新用户回答过的汤记录
      if (soupId) {
        try {
          await userService.updateAnsweredSoup(soupId);
        } catch (err) {
          console.error('更新用户回答汤记录失败:', err);
          // 失败不影响用户体验，继续执行
        }
      }

      // 使用服务层处理用户输入
      const { userMessage } = dialogService.handleUserInput(value.trim());

      // 添加状态属性
      const userMessageWithStatus = {
        ...userMessage,
        status: 'sending'
      };

      // 添加用户消息
      const messages = [...this.data.messages, userMessageWithStatus];
      this.setData({ messages });

      try {
        // 发送消息到服务器并获取回复
        const reply = await dialogService.sendMessage({
          message: userMessage.content,
          userId: userId,
          dialogId: dialogId,
          messageId: userMessage.id // 传递用户消息 ID
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
          return;
        }

        // 使用打字机效果
        const updatedMessages = [...messages, {
          id: replyMessage.id,
          role: 'agent',
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

    // 偷看相关功能已移除，准备重构
  }
});
