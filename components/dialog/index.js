// components/dialog/index.js
const dialogService = require('../../utils/dialogService');
const simpleTypeAnimation = require('../../utils/typeAnimation');
const userService = require('../../utils/userService');
const soupService = require('../../utils/soupService');
const agentService = require('../../utils/agentService');
const eventUtils = require('../../utils/eventUtils');

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

      // 通过tip-module显示加载提示
      eventUtils.showTip('加载中...', ['正在加载对话记录，请稍候...']);

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

        // 隐藏加载提示
        eventUtils.hideTip();

        // 滚动到底部
        this.scrollToBottom();

        return result.messages;
      } catch (error) {
        console.error('加载对话记录失败:', error);

        // 显示错误提示
        eventUtils.showTip('加载失败', ['无法加载对话记录，请稍后再试']);

        // 3秒后隐藏错误提示
        setTimeout(() => {
          eventUtils.hideTip();
        }, 3000);

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

    async handleSend(e) {
      // 处理文本消息
      const { value } = e.detail;

      // 如果正在执行打字机动画，显示提示并返回
      if (this.data.isAnimating) {
        // 只有当有内容时才显示提示
        if (value && value.trim()) {
          // 使用tip-module显示提示
          eventUtils.showTip('请稍等', ['正在回复中，请稍候...']);

          // 2秒后隐藏提示
          setTimeout(() => {
            eventUtils.hideTip();
          }, 2000);
        }
        return;
      }

      // 检查消息是否为空
      if (!value || !value.trim()) return;

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
      const dialogId = this.properties.dialogId || '';
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

      // 添加用户消息并设置发送状态
      const messages = [...this.data.messages, userMessageWithStatus];
      this.setData({
        messages,
        isSending: true // 标记为发送中
      }, () => {
        this.scrollToBottom();
      });

      // 触发用户发送消息事件，用于提示模块更新
      eventUtils.emitEvent('userSentMessage', {
        messageId: userMessage.id,
        content: userMessage.content
      });

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

        // 使用打字机效果，保持isSending为true
        const updatedMessages = [...messages, {
          id: replyMessage.id,
          role: 'assistant',
          content: '',
          status: 'typing',
          timestamp: replyMessage.timestamp
        }];

        this.setData({
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          isAnimating: true,
          // 不重置isSending，因为从用户角度看仍在"发送"过程中
          typingText: '',
          scrollToView: 'scrollBottom'
        });

        // 打字机动画完成后才重置isSending
        await this.typeAnimator.start(replyMessage.content);

        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = replyMessage;

        this.setData({
          messages: finalMessages,
          animatingMessageIndex: -1,
          isSending: false, // 动画完成后重置发送状态
          typingText: ''
        });
      } catch (error) {
        console.error('发送消息失败:', error);

        // 从消息列表中移除失败的消息
        const updatedMessages = this.data.messages.filter(msg => msg.id !== userMessage.id);

        this.setData({
          messages: updatedMessages,
          isSending: false // 出错时也要重置状态
        });

        // 使用tip-module显示错误提示
        eventUtils.showTip('发送失败', [error.message || '消息发送失败，请稍后再试']);

        // 3秒后隐藏错误提示
        setTimeout(() => {
          eventUtils.hideTip();
        }, 3000);
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

    /**
     * 处理测试Agent API事件
     * 使用当前输入内容和汤面数据发送测试请求到Agent API，并将结果直接显示在对话界面中
     * @param {Object} e 事件对象
     */
    async handleTestAgent(e) {
      // 处理文本消息
      const { value } = e.detail;

      // 如果正在执行打字机动画，显示提示并返回
      if (this.data.isAnimating) {
        // 只有当有内容时才显示提示
        if (value && value.trim()) {
          // 使用tip-module显示提示
          eventUtils.showTip('请稍等', ['正在回复中，请稍候...']);

          // 2秒后隐藏提示
          setTimeout(() => {
            eventUtils.hideTip();
          }, 2000);
        }
        return;
      }

      // 检查消息是否为空
      if (!value || !value.trim()) return;

      // 获取必要参数
      const soupId = this.properties.soupId || '';
      const dialogId = this.properties.dialogId || '';
      const userId = this.properties.userId || '';

      // 检查必要参数
      if (!dialogId) {
        console.error('发送失败: 缺少对话ID');
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
        return;
      }

      if (!userId) {
        console.error('发送失败: 缺少用户ID');
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
        return;
      }

      if (!soupId) {
        console.error('发送失败: 缺少汤面ID');
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
        return;
      }

      // 直接创建用户消息对象，不使用dialogService
      const userMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: value.trim(),
        timestamp: Date.now()
      };

      // 添加状态属性
      const userMessageWithStatus = {
        ...userMessage,
        status: 'sending'
      };

      // 添加用户消息并设置发送状态
      // 注意：这里不触发 wx.eventCenter.emit('userSentMessage') 事件，避免其他组件响应
      const messages = [...this.data.messages, userMessageWithStatus];
      this.setData({
        messages,
        isSending: true // 标记为发送中
      }, () => {
        this.scrollToBottom();
      });

      try {
        // 获取汤面数据
        const soupData = await soupService.getSoup(soupId);
        if (!soupData) {
          throw new Error('无法获取汤面数据');
        }

        // 构建包含历史对话的消息数组
        let historyMessages = [];

        // 从当前对话记录中提取历史消息
        // 注意：此时this.data.messages已经包含了当前用户消息
        // 获取除了最后一条消息之外的所有历史消息
        const previousMessages = this.data.messages.slice(0, -1).filter(msg =>
          msg.role === 'user' || msg.role === 'assistant'
        );

        // 添加历史消息（如果有）
        if (previousMessages.length > 0) {
          // 将历史消息转换为API所需格式
          historyMessages = previousMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));
        }

        // 添加当前用户消息（从this.data.messages的最后一条获取）
        const currentUserMessage = this.data.messages[this.data.messages.length - 1];
        historyMessages.push({
          role: currentUserMessage.role,
          content: currentUserMessage.content
        });

        console.log('发送消息历史:', historyMessages);

        // 调用agentService的sendAgent方法
        // 注意：agentService现在会自动保存对话到云端
        const response = await agentService.sendAgent({
          messages: historyMessages,
          soup: soupData,
          userId: userId,
          dialogId: dialogId
          // saveToCloud: true  // 默认为true，可以省略
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

        // 使用打字机效果，保持isSending为true
        const updatedMessages = [...messages, {
          id: replyMessage.id,
          role: 'assistant',
          content: '',
          status: 'typing',
          timestamp: replyMessage.timestamp
        }];

        this.setData({
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          isAnimating: true,
          // 不重置isSending，因为从用户角度看仍在"发送"过程中
          typingText: '',
          scrollToView: 'scrollBottom'
        });

        // 打字机动画完成后才重置isSending
        await this.typeAnimator.start(replyMessage.content);

        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = replyMessage;

        this.setData({
          messages: finalMessages,
          animatingMessageIndex: -1,
          isSending: false, // 动画完成后重置发送状态
          typingText: ''
        });

      } catch (error) {
        console.error('发送消息失败:', error);

        // 从消息列表中移除失败的消息
        const updatedMessages = this.data.messages.filter(msg => msg.id !== userMessage.id);

        this.setData({
          messages: updatedMessages,
          isSending: false // 出错时也要重置状态
        });

        // 使用tip-module显示错误提示
        eventUtils.showTip('发送失败', [error.message || '消息发送失败，请稍后再试']);

        // 3秒后隐藏错误提示
        setTimeout(() => {
          eventUtils.hideTip();
        }, 3000);
      }
    },

    // 偷看功能相关方法
    handleLongPress() {
      // 设置偷看模式
      this.setData({ peekMode: true });

      // 使用eventCenter发送偷看状态变更事件
      eventUtils.emitEvent('peekingStatusChange', {
        isPeeking: true
      });
    },

    handleTouchEnd() {
      // 如果当前处于偷看模式，恢复正常显示
      if (this.data.peekMode) {
        this.setData({ peekMode: false });

        // 使用eventCenter发送偷看状态变更事件
        eventUtils.emitEvent('peekingStatusChange', {
          isPeeking: false
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
