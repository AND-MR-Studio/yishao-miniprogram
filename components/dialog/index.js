// components/dialog/index.js
const dialogService = require('../../utils/dialogService');
const simpleTypeAnimation = require('../../utils/typeAnimation');
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
    typingText: '', // 简化版打字机文本
    animatingMessageIndex: -1, // 当前正在执行动画的消息索引
    _previousDialogId: '', // 用于跟踪dialogId变化，避免重复加载
    peekMode: false, // 是否处于偷看模式
    scrollToView: 'scrollBottom' // 滚动到底部的视图ID
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

      // 初始化简化版打字机动画实例
      this.typeAnimator = simpleTypeAnimation.createInstance(this, {
        typeSpeed: this.properties.typeSpeed,
        batchSize: 1, // 每5个字符触发一次setData，平衡性能和动画效果
        onComplete: () => {
          this.setData({ isAnimating: false });
          // 动画完成后确保滚动到底部
          this.scrollToBottom(true);
        },
        onUpdate: () => {
          // 每次打字机更新时强制滚动到底部，忽略节流
          this.scrollToBottom(true);
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
        // 只有在没有消息时才加载
        if (!this.data.messages.length) {
          this.loadDialogMessages();
        }
      } else {
        this.hideDialog();
      }
    },
    'dialogId': function(dialogId) {
      // 只有当dialogId变化且有效且对话框可见时，才重新加载对话记录
      if (dialogId &&
          dialogId !== this.data._previousDialogId &&
          this.data.visible &&
          !this.data.isAnimating) {

        console.log('dialogId变化，加载对话记录:', dialogId);
        this.data._previousDialogId = dialogId;

        this.loadDialogMessages();
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
        // 一次性设置所有状态，减少重绘
        this.animation.opacity(0).step({ duration: 0 });
        this.setData({
          animationData: this.animation.export(),
          visible: true
        });

        // 执行显示动画
        setTimeout(() => {
          this.animation.opacity(1).step();
          this.setData({
            animationData: this.animation.export(),
            isFullyVisible: true,
            isAnimating: false
          });
        }, 50);
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

    // 加载对话记录
    async loadDialogMessages() {
      // 如果正在加载，不重复加载
      if (this.data.loading) return Promise.resolve(this.data.messages);

      // 优先使用组件属性中的 dialogId
      const dialogId = this.properties.dialogId || dialogService.getCurrentDialogId();
      const soupId = this.properties.soupId || dialogService.getCurrentSoupId();

      // 设置加载状态
      this.setData({ loading: true });

      try {
        let messages;

        if (!dialogId) {
          console.log('缺少 dialogId，返回空消息数组');
          // 返回空消息数组
          messages = [];
        } else {
          // 确保服务层也知道当前的 dialogId 和 soupId
          dialogService.setCurrentDialogId(dialogId);
          if (soupId) {
            dialogService.setCurrentSoupId(soupId);
          }

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

        // 出错时返回空消息数组
        this.setData({
          messages: [],
          loading: false
        });

        return [];
      }
    },

    // 滚动到底部 - 优化版，减少setData调用
    scrollToBottom(force = false) {
      // 使用节流技术，避免短时间内多次触发滚动
      // 但如果是强制滚动（如打字机效果中），则忽略节流
      if (this._scrollThrottled && !force) return;

      this._scrollThrottled = true;

      // 使用scroll-into-view属性滚动到底部
      this.setData({
        scrollToView: 'scrollBottom'
      });

      // 100ms后重置节流标志（减少延迟，提高响应速度）
      setTimeout(() => {
        this._scrollThrottled = false;
      }, 100);
    },

    async handleSend(e) {
      // 处理文本消息
      const { value } = e.detail;
      if (!value || !value.trim() || this.data.isAnimating) return;

      // 验证消息长度不超过50个字
      if (value.length > 50) {
        wx.showToast({
          title: '消息不能超过50个字',
          icon: 'none'
        });
        return;
      }

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
      this.setData({ messages }, () => {
        // 添加消息后滚动到底部
        this.scrollToBottom();
      });

      // 触发用户发送消息事件，用于提示模块更新
      if (wx.eventCenter) {
        wx.eventCenter.emit('userSentMessage', {
          messageId: userMessage.id,
          content: userMessage.content
        });
      }

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
          this.setData({
            messages: finalMessages,
            scrollToView: 'scrollBottom' // 确保滚动到底部
          });
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

        // 一次性设置所有状态，减少setData调用
        this.setData({
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          isAnimating: true,
          typingText: '', // 重置打字机文本
          scrollToView: 'scrollBottom' // 确保滚动到底部
        }, () => {
          // 在状态更新后立即强制滚动到底部
          wx.nextTick(() => {
            this.scrollToBottom(true);
          });
        });

        // 启动简化版打字机动画
        await this.typeAnimator.start(replyMessage.content);

        // 动画完成后更新消息内容 - 一次性更新所有状态
        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = replyMessage;

        this.setData({
          messages: finalMessages,
          animatingMessageIndex: -1,
          typingText: '' // 清空打字机文本
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

        this.setData({
          messages,
          scrollToView: 'scrollBottom' // 确保滚动到底部
        });
      }
    },

    handleMessagesChange(e) {
      const { messages } = e.detail;
      if (messages && messages.length) {
        this.setData({
          messages,
          scrollToView: 'scrollBottom' // 确保滚动到底部
        });
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

    // 偷看功能相关方法
    handleLongPress(e) {
      // 触发长按事件，传递给页面处理
      this.triggerEvent('longpress', e);

      // 设置偷看模式
      this.setData({ peekMode: true });
    },

    handleTouchEnd(e) {
      // 如果当前处于偷看模式，恢复正常显示
      if (this.data.peekMode) {
        this.setData({ peekMode: false });
        // 触发触摸结束事件，传递给页面处理
        this.triggerEvent('touchend', e);
      }
    }
  }
});
