// components/dialog/index.js
const simpleTypeAnimation = require('../../utils/typeAnimation');
const agentService = require('../../service/agentService');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { tipStore, chatStore } = require('../../stores/index');

Component({
  properties: {
    dialogId: {
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
    loading: false,
    isAnimating: false, // 用于打字机动画
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

      // 初始化简化版打字机动画实例
      this.typeAnimator = simpleTypeAnimation.createInstance(this, {
        typeSpeed: this.properties.typeSpeed,
        batchSize: 1, // 每个字符触发一次setData，平衡性能和动画效果
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

      // 创建chatStore绑定 - 只绑定需要的字段和操作
      this.chatStoreBindings = createStoreBindings(this, {
        store: chatStore,
        fields: ['messages', 'dialogId', 'userId', 'isLoading'],
        actions: []
      });

      // 将store实例保存到this中，方便直接访问
      this.tipStore = tipStore;
      this.chatStore = chatStore;
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

      if (this.chatStoreBindings) {
        this.chatStoreBindings.destroyStoreBindings();
      }
    }
  },

  observers: {
    'messages': function(messages) {
      // 当messages变化且不为空时，更新组件的消息列表
      if (messages && messages.length > 0) {
        this.setData({
          messages: messages,
          scrollToView: 'scrollBottom'
        }, () => {
          this.scrollToBottom();
        });
      }
    },
    'isPeeking': function(isPeeking) {
      // 当isPeeking属性变化时，更新组件的peekMode状态
      this.setData({ peekMode: isPeeking });
    },
    'isLoading': function(isLoading) {
      // 当isLoading状态变化时，更新组件的loading状态
      this.setData({ loading: isLoading });

      // 显示或隐藏加载提示
      if (isLoading) {
        this.showTip('加载中...', ['正在加载对话记录，请稍候...'], 0, true);
      } else {
        // 重置提示内容为默认内容
        this.tipStore.resetTipContent();
      }
    }
  },

  methods: {

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

    /**
     * 添加消息到对话并处理动画效果
     *
     * @param {Object|Array} messageData - 单个消息对象或消息数组
     * @param {Object} [options] - 配置选项
     * @param {boolean} [options.animate=false] - 是否使用打字机动画效果
     * @param {boolean} [options.notifyStore=true] - 是否通知父组件更新chatStore
     * @param {string} [options.replyRole='assistant'] - 回复消息的角色
     * @returns {Promise<Array>} 更新后的消息数组
     */
    async addMessages(messageData, options = {}) {
      // 默认选项
      const defaultOptions = {
        animate: false,
        notifyStore: true,
        replyRole: 'assistant'
      };

      const { animate, notifyStore, replyRole } = { ...defaultOptions, ...options };

      try {
        // 处理单个消息或消息对
        let userMessage, replyMessage, messages;

        if (Array.isArray(messageData)) {
          // 处理消息数组
          messages = [...this.data.messages, ...messageData];
        } else if (messageData.userMessage && messageData.replyMessage) {
          // 处理消息对
          userMessage = messageData.userMessage;
          replyMessage = messageData.replyMessage;

          // 添加用户消息
          messages = [...this.data.messages, userMessage];

          if (animate) {
            // 使用打字机动画效果
            return await this._animateReply(messages, replyMessage, replyRole, notifyStore);
          } else {
            // 直接添加回复消息
            messages = [...messages, replyMessage];
          }
        } else {
          // 处理单个消息
          messages = [...this.data.messages, messageData];
        }

        // 更新组件状态
        await new Promise(resolve => {
          this.setData({
            messages,
            scrollToView: 'scrollBottom'
          }, () => {
            this.scrollToBottom(true);
            resolve();
          });
        });

        // 直接更新chatStore（如果需要）
        if (notifyStore) {
          this.chatStore.updateState({ messages });
        }

        return messages;
      } catch (error) {
        console.error('添加消息失败:', error);

        // 错误处理 - 优雅降级
        // 确保至少显示消息，即使没有动画效果
        if (messageData.userMessage) {
          const fallbackMessages = [...this.data.messages, messageData.userMessage];

          if (messageData.replyMessage) {
            fallbackMessages.push(messageData.replyMessage);
          }

          this.setData({
            messages: fallbackMessages,
            isAnimating: false,
            animatingMessageIndex: -1,
            scrollToView: 'scrollBottom'
          }, () => {
            this.scrollToBottom(true);
          });

          // 即使出错也尝试更新chatStore
          if (notifyStore) {
            this.chatStore.updateState({ messages: fallbackMessages });
          }

          return fallbackMessages;
        }

        // 如果连降级处理也失败，则返回当前消息
        return this.data.messages;
      }
    },

    /**
     * 使用打字机动画效果显示回复消息
     *
     * @private
     * @param {Array} messages - 当前消息数组
     * @param {Object} replyMessage - 回复消息对象
     * @param {string} replyRole - 回复消息的角色
     * @param {boolean} notifyStore - 是否通知父组件更新chatStore
     * @returns {Promise<Array>} 更新后的消息数组
     */
    async _animateReply(messages, replyMessage, replyRole, notifyStore) {
      // 准备回复消息的打字机效果
      const typingMessage = {
        id: replyMessage.id,
        role: replyRole,
        content: '',
        status: 'typing',
        timestamp: replyMessage.timestamp
      };

      // 添加打字机效果的空消息
      const updatedMessages = [...messages, typingMessage];

      // 更新状态，开始动画
      await new Promise(resolve => {
        this.setData({
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          isAnimating: true,
          typingText: '',
          scrollToView: 'scrollBottom'
        }, resolve);
      });

      try {
        // 执行打字机动画
        await this.typeAnimator.start(replyMessage.content);

        // 更新为完整回复消息
        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = replyMessage;

        // 更新状态，结束动画
        await new Promise(resolve => {
          this.setData({
            messages: finalMessages,
            animatingMessageIndex: -1,
            isAnimating: false,
            typingText: ''
          }, resolve);
        });

        // 通知父组件更新chatStore（如果需要）
        if (notifyStore) {
          this.triggerEvent('messagesUpdated', { messages: finalMessages });
        }

        return finalMessages;
      } catch (error) {
        console.error('打字机动画失败:', error);

        // 错误处理 - 优雅降级
        // 直接显示完整消息，跳过动画
        const fallbackMessages = [...messages, replyMessage];

        this.setData({
          messages: fallbackMessages,
          animatingMessageIndex: -1,
          isAnimating: false,
          typingText: '',
          scrollToView: 'scrollBottom'
        }, () => {
          this.scrollToBottom(true);
        });

        // 即使动画失败也通知父组件（如果需要）
        if (notifyStore) {
          this.triggerEvent('messagesUpdated', { messages: fallbackMessages });
        }

        return fallbackMessages;
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

    /**
     * 刷新消息列表
     * 直接使用chatStore中的消息更新组件
     * @returns {Promise<Array>} 更新后的消息数组
     */
    async refreshMessages() {
      try {
        // 使用已绑定的chatStore
        if (!this.chatStore || !this.chatStore.messages) {
          console.error('无法获取chatStore或消息列表');
          return this.data.messages;
        }

        // 直接使用chatStore中的消息更新组件
        this.setData({
          messages: this.chatStore.messages,
          scrollToView: 'scrollBottom'
        }, () => {
          this.scrollToBottom(true);
        });

        return this.chatStore.messages;
      } catch (error) {
        console.error('刷新消息列表失败:', error);
        return this.data.messages;
      }
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

        const messages = await this.addMessages(userMessageWithStatus, { notifyStore: false });

        // 构建历史消息数组 - 使用chatStore中的消息或当前组件的消息
        const previousMessages = (this.chatStore.messages.length > 0 ? this.chatStore.messages : this.data.messages)
          .slice(0, -1)
          .filter(msg => msg.role === 'user' || msg.role === 'assistant');

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

        // 将消息添加到chatStore - 确保使用最新的chatStore.messages
        const updatedMessages = [...this.chatStore.messages, userMessageWithStatus, replyMessage];
        this.chatStore.updateState({ messages: updatedMessages });

        // 使用_animateReply方法显示带打字机效果的回复，但不再通知父组件
        await this._animateReply(
          messages,
          replyMessage,
          'assistant',
          false // 不再通知父组件更新chatStore，直接更新chatStore
        );

        // 重置发送状态
        this.setData({
          isSending: false
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

    // 偷看功能相关方法已移至页面级别管理
    // 组件只负责根据isPeeking属性更新UI状态


  }
});
