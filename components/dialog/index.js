// components/dialog/index.js
const dialogService = require('../../service/dialogService');
const simpleTypeAnimation = require('../../utils/typeAnimation');
const userService = require('../../service/userService');
const agentService = require('../../service/agentService');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { tipStore } = require('../../stores/tipStore');

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
    // 打字机速度
    typeSpeed: {
      type: Number,
      value: 60
    },
    // 是否处于偷看模式 - 由父组件通过MobX管理
    isPeeking: {
      type: Boolean,
      value: false
    }
  },

  data: {
    messages: [],
    keyboardHeight: 0,
    animationData: {},
    isFullyVisible: false,
    loading: false,
    isAnimating: false,
    isSending: false, // 是否正在发送消息
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

      // 创建tipStore绑定
      this.tipStoreBindings = createStoreBindings(this, {
        store: tipStore,
        fields: [],
        actions: ['showTip', 'hideTip', 'trackUserMessage']
      });

      // 将tipStore实例保存到this中，方便直接访问
      this.tipStore = tipStore;
    },

    detached() {
      // 组件销毁时清理打字机动画资源
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
      }

      // 清理MobX绑定
      if (this.tipStoreBindings) {
        this.tipStoreBindings.destroyStoreBindings();
      }
    }
  },

  observers: {
    'visible': function(visible) {
      if (this.data.isAnimating) return;

      if (visible) {
        this.showDialog();
        // 不再自动加载消息，由外部控制加载时机
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
    },
    'isPeeking': function(isPeeking) {
      // 当isPeeking属性变化时，更新组件的peekMode状态
      this.setData({ peekMode: isPeeking });
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
      const dialogId = this.properties.dialogId;

      if (!dialogId) {
        console.log('缺少 dialogId，返回空消息数组');
        return [];
      }

      // 设置加载状态
      this.setData({ loading: true });

      // 通过tipStore显示加载提示，并同步到chatStore
      this.showTip('加载中...', ['正在加载对话记录，请稍候...'], 0, true);

      try {
        // 从服务器获取对话记录
        const result = await dialogService.getDialogMessages(dialogId);

        // 使用Promise包装setData，确保UI更新完成
        await new Promise(resolve => {
          this.setData({
            messages: result.messages,
            loading: false
          }, resolve);
        });

        // 不再隐藏加载提示，保持提示可见
        // 只更新提示内容为默认内容
        this.tipStore.resetTipContent();

        // 滚动到底部
        this.scrollToBottom();

        return result.messages;
      } catch (error) {
        console.error('加载对话记录失败:', error);

        // 显示错误提示，并同步到chatStore
        this.showTip('加载失败', ['无法加载对话记录，请稍后再试'], 3000, true);

        // 出错时返回空消息数组
        await new Promise(resolve => {
          this.setData({
            messages: [],
            loading: false
          }, resolve);
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

    // 添加消息到对话
    addMessage(message) {
      if (!message) return;

      const messages = [...this.data.messages, message];
      this.setData({
        messages,
        scrollToView: 'scrollBottom'
      }, () => {
        this.scrollToBottom();
      });

      return messages;
    },

    // 添加用户消息和回复
    async addUserMessageAndReply(userMessage, replyMessage) {
      if (!userMessage || !replyMessage) return;

      // 添加用户消息
      const messages = this.addMessage(userMessage);

      // 准备回复消息的打字机效果
      const typingMessage = {
        id: replyMessage.id,
        role: 'assistant',
        content: '',
        status: 'typing',
        timestamp: replyMessage.timestamp
      };

      // 添加打字机效果的空消息
      const updatedMessages = [...messages, typingMessage];
      this.setData({
        messages: updatedMessages,
        animatingMessageIndex: updatedMessages.length - 1,
        isAnimating: true,
        typingText: '',
        scrollToView: 'scrollBottom'
      });

      // 执行打字机动画
      await this.typeAnimator.start(replyMessage.content);

      // 更新为完整回复消息
      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = replyMessage;

      this.setData({
        messages: finalMessages,
        animatingMessageIndex: -1,
        isAnimating: false,
        typingText: ''
      });
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

    /**
     * 刷新消息列表
     * 从chatStore获取最新消息并更新组件
     */
    refreshMessages() {
      try {
        // 获取chatStore
        const { chatStore } = require('../../stores/chatStore');
        if (!chatStore || !chatStore.messages) {
          console.error('无法获取chatStore或消息列表');
          return;
        }

        // 更新消息列表
        this.setData({
          messages: chatStore.messages,
          scrollToView: 'scrollBottom'
        }, () => {
          this.scrollToBottom();
        });
      } catch (error) {
        console.error('刷新消息列表失败:', error);
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

    /**
     * 处理测试Agent API事件
     * 该方法将由页面调用，不再直接处理输入
     * @param {Object} params 参数对象，包含用户消息、历史消息等
     */
    async processAgentRequest(params) {
      if (this.data.isAnimating) {
        this.showTip('请稍等', ['正在回复中，请稍候...'], 2000, true);
        return false;
      }

      try {
        const { userMessage, soupData, userId, dialogId } = params;

        if (!userMessage || !soupData || !userId || !dialogId) {
          throw new Error('缺少必要参数');
        }

        // 添加状态属性
        const userMessageWithStatus = {
          ...userMessage,
          status: 'sending'
        };

        // 添加用户消息
        this.setData({
          isSending: true // 标记为发送中
        });

        const messages = this.addMessage(userMessageWithStatus);

        // 构建历史消息数组
        const previousMessages = this.data.messages.slice(0, -1).filter(msg =>
          msg.role === 'user' || msg.role === 'assistant'
        );

        // 转换为API所需格式
        const historyMessages = previousMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // 添加当前用户消息
        historyMessages.push({
          role: userMessage.role,
          content: userMessage.content
        });

        // 调用Agent API
        const response = await agentService.sendAgent({
          messages: historyMessages,
          soup: soupData,
          userId: userId,
          dialogId: dialogId
        });

        // 更新用户消息状态
        this.updateMessageStatus(userMessage.id, 'sent');

        // 创建回复消息
        const replyMessage = {
          id: response.id,
          role: 'assistant',
          content: response.content,
          status: 'sent',
          timestamp: response.timestamp
        };

        // 使用打字机效果显示回复
        const typingMessage = {
          id: replyMessage.id,
          role: 'assistant',
          content: '',
          status: 'typing',
          timestamp: replyMessage.timestamp
        };

        const updatedMessages = [...messages, typingMessage];
        this.setData({
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          isAnimating: true,
          typingText: '',
          scrollToView: 'scrollBottom'
        });

        // 执行打字机动画
        await this.typeAnimator.start(replyMessage.content);

        // 更新为完整回复消息
        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = replyMessage;

        this.setData({
          messages: finalMessages,
          animatingMessageIndex: -1,
          isSending: false,
          typingText: ''
        });

        return true;
      } catch (error) {
        console.error('处理Agent请求失败:', error);

        // 移除失败的用户消息
        if (params?.userMessage?.id) {
          const updatedMessages = this.data.messages.filter(msg => msg.id !== params.userMessage.id);
          this.setData({
            messages: updatedMessages,
            isSending: false
          });
        } else {
          this.setData({ isSending: false });
        }

        // 显示错误提示
        this.showTip('发送失败', [error.message || '消息发送失败，请稍后再试'], 3000, true);
        return false;
      }
    },

    // 偷看功能相关方法
    handleLongPress() {
      // 设置偷看模式
      this.setData({ peekMode: true });

      // 直接触发事件通知父组件
      this.triggerEvent('peekingStatusChange', {
        isPeeking: true
      });
    },

    handleTouchEnd() {
      // 如果当前处于偷看模式，恢复正常显示
      if (this.data.peekMode) {
        this.setData({ peekMode: false });

        // 直接触发事件通知父组件
        // 确保在下一个渲染周期发送事件，避免可能的时序问题
        wx.nextTick(() => {
          this.triggerEvent('peekingStatusChange', {
            isPeeking: false
          });
        });
      }
    },

    /**
     * 处理清理上下文事件
     * 清空当前对话的所有消息记录
     * @param {Object} e 事件对象
     */
    async clearContext(e) {
      try {
        const dialogId = e?.detail?.dialogId || this.properties.dialogId;
        if (!dialogId) {
          console.error('清理上下文失败: 缺少对话ID');
          return;
        }

        // 显示确认弹窗
        wx.showModal({
          title: '提示',
          content: '确定要清理当前对话上下文吗？这将删除当前对话的所有记录。',
          success: async (res) => {
            if (res.confirm) {
              try {
                // 获取用户ID
                const userId = await userService.getUserId();
                if (!userId) {
                  console.error('清理上下文失败: 无法获取用户ID');
                  return;
                }

                // 清空对话消息
                this.setData({ messages: [] });

                // 保存空消息数组到服务器
                try {
                  await dialogService.saveDialogMessages(dialogId, userId, []);
                  console.log('对话上下文已清理');

                  // 显示成功提示
                  wx.showToast({
                    title: '对话已清理',
                    icon: 'success',
                    duration: 1500
                  });
                } catch (error) {
                  console.error('保存清空的对话记录失败:', error);
                }
              } catch (error) {
                console.error('清理上下文失败:', error);
              }
            }
          }
        });
      } catch (error) {
        console.error('清理上下文失败:', error);
      }
    }
  }
});
