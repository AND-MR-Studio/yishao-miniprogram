/**
 * 聊天页面 - 海龟汤对话与交互
 * 负责处理喝汤状态下的对话、提示和输入功能
 */
// ===== 导入依赖 =====
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { rootStore, soupStore, chatStore, tipStore, CHAT_STATE } = require('../../stores/index');
const userService = require('../../service/userService');

Page({
  // ===== 页面数据 =====
  data: {
    // 页面状态
    isLoading: true,

    // 汤面数据 - 仅用于传递给soup-display组件
    soupData: null,

    // 交互相关
    isSending: false, // 是否正在发送消息
    isAnimating: false, // 是否正在动画中
  },

  // ===== 生命周期方法 =====
  /**
   * 页面加载时执行
   * 获取汤面数据并初始化对话
   * @param {Object} options - 页面参数，包含soupId和可能的dialogId
   */
  async onLoad(options) {
    try {
      // 创建rootStore绑定 - 用于获取用户ID
      this.rootStoreBindings = createStoreBindings(this, {
        store: rootStore,
        fields: ['userId'],
        actions: ['syncUserId']
      });

      // 创建soupStore绑定 - 用于获取汤面数据
      this.soupStoreBindings = createStoreBindings(this, {
        store: soupStore,
        fields: ['isLoading', 'soupData'],
        actions: ['fetchSoupById']
      });

      // 创建chatStore绑定 - 管理聊天相关的所有状态
      this.chatStoreBindings = createStoreBindings(this, {
        store: chatStore,
        fields: [
          'dialogId', 'chatState', 'soupId',
          'isPeeking', 'isSending', 'isReplying', 'isAnimating',
          'isDrinking', 'isTruth', 'messages', 'inputValue'
        ],
        actions: [
          'updateState', 'setPeekingStatus', 'setInputValue',
          'setAnimatingStatus', 'setSendingStatus', 'showTruth',
          'createDialog', 'fetchMessages', 'sendMessage'
        ]
      });

      // 创建tipStore绑定 - 管理提示信息状态
      this.tipStoreBindings = createStoreBindings(this, {
        store: tipStore,
        fields: ['visible', 'title', 'content'],
        actions: ['showTip', 'hideTip', 'setDefaultTip']
      });

      this.setData({ isLoading: true });

      // 获取页面参数
      const soupId = options.soupId || '';
      const dialogId = options.dialogId || '';

      if (!soupId) {
        throw new Error('缺少汤面ID参数');
      }

      // 同步用户ID
      await this.syncUserId();

      // 获取汤面数据并初始化
      const soupData = await this.fetchSoupById(soupId);

      if (!soupData) {
        throw new Error('获取汤面数据失败');
      }

      // 更新页面数据
      this.setData({
        soupData: soupData,
        isLoading: false
      });

      // 设置chatStore的基本数据
      chatStore.updateState({
        soupId: soupData.id,
        chatState: CHAT_STATE.DRINKING,
        dialogId: dialogId
      });

      // 确保tipStore的visible状态为true
      tipStore.visible = true;

      // 初始化对话
      if (dialogId) {
        // 使用现有对话ID，直接从chatStore加载消息
        await chatStore.fetchMessages();
      } else {
        // 创建新对话
        await chatStore.createDialog();
      }
    } catch (error) {
      console.error('页面加载失败:', error);
      this.showErrorToast('加载失败，请重试');
      this.setData({
        isLoading: false
      });
    }
  },

  /**
   * 创建新对话
   */
  async createNewDialog() {
    try {
      // 使用chatStore创建对话
      const success = await chatStore.createDialog();

      if (!success) {
        throw new Error('无法创建对话');
      }
    } catch (error) {
      console.error('创建对话失败:', error);
      this.showErrorToast('无法创建对话，请重试');
    }
  },

  /**
   * 页面加载完成时执行
   */
  onReady() {
    // 页面加载完成时的处理逻辑
    // 不再需要注册事件监听器，使用组件事件绑定替代
  },

  /**
   * 页面卸载时执行
   * 清理资源
   */
  onUnload() {
    // 清理MobX绑定
    if (this.rootStoreBindings) {
      this.rootStoreBindings.destroyStoreBindings();
    }
    if (this.soupStoreBindings) {
      this.soupStoreBindings.destroyStoreBindings();
    }
    if (this.chatStoreBindings) {
      this.chatStoreBindings.destroyStoreBindings();
    }
    if (this.tipStoreBindings) {
      this.tipStoreBindings.destroyStoreBindings();
    }
  },

  /**
   * 分享小程序
   */
  onShareAppMessage() {
    // 直接从store获取当前汤面ID和对话ID
    const soupId = soupStore.soupData ? soupStore.soupData.id : '';
    const dialogId = chatStore.dialogId || '';
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: `/pages/chat/chat?soupId=${soupId}&dialogId=${dialogId}`
    };
  },

  // ===== 事件处理 =====
  // 偷看状态现在由页面直接管理，不再需要处理组件事件

  // 消息更新现在由chatStore直接管理，不再需要处理组件事件

  /**
   * 处理长按开始事件
   * 用于偷看功能 - 页面级别管理
   */
  onLongPressStart() {
    // 使用MobX更新偷看状态
    this.setPeekingStatus(true);

    // 同时隐藏提示模块
    tipStore.visible = false;
  },

  /**
   * 处理长按结束事件
   * 用于偷看功能 - 页面级别管理
   */
  onLongPressEnd() {
    // 使用MobX更新偷看状态
    this.setPeekingStatus(false);

    // 恢复提示模块可见性 - 使用延迟确保状态更新后再显示提示
    setTimeout(() => {
      tipStore.visible = true;
      // 重置提示内容为默认值
      tipStore.resetTipContent();
    }, 100);
  },

  /**
   * 处理提示模块关闭事件
   */
  onTipModuleClose() {
    // 提示模块关闭时的处理逻辑已通过MobX管理，不需要额外处理
  },

  /**
   * 处理提示模块可见性变化事件
   * @param {Object} e 事件对象
   */
  onTipVisibleChange(e) {
    console.log('提示模块可见性变化:', e.detail.visible);
  },

  /**
   * 处理输入框内容变化事件
   * @param {Object} e 事件对象
   */
  handleInputChange(e) {
    const { value } = e.detail;
    // 使用MobX更新输入框的值
    this.setInputValue(value);
  },

  /**
   * 处理清理上下文确认事件
   * @param {Object} e 事件对象
   */
  async handleClearContextConfirm(e) {
    try {
      const { dialogId, userId } = e.detail;
      if (!dialogId || !userId) {
        console.error('清理上下文失败: 缺少必要参数');
        return;
      }

      // 使用dialogService清空对话消息
      const dialogService = require('../../service/dialogService');
      await dialogService.saveDialogMessages(dialogId, userId, []);

      // 刷新chatStore中的消息
      await this.fetchMessages();

      // 显示成功提示
      wx.showToast({
        title: '对话已清理',
        icon: 'success',
        duration: 1500
      });
    } catch (error) {
      console.error('清理上下文失败:', error);
      this.showErrorToast('清理失败，请重试');
    }
  },

  /**
   * 处理清理上下文事件
   * @param {Object} e 事件对象
   */
  async clearContext(e) {
    try {
      const { dialogId, userId } = e.detail;
      if (!dialogId || !userId) {
        console.error('清理上下文失败: 缺少必要参数');
        return;
      }

      // 使用dialogService清空对话消息
      const dialogService = require('../../service/dialogService');
      await dialogService.saveDialogMessages(dialogId, userId, []);

      // 刷新chatStore中的消息
      await this.fetchMessages();

      // 不再需要手动刷新对话组件，chatStore的变化会自动通知组件

      // 显示成功提示
      wx.showToast({
        title: '对话已清理',
        icon: 'success',
        duration: 1500
      });
    } catch (error) {
      console.error('清理上下文失败:', error);
      this.showErrorToast('清理失败，请重试');
    }
  },

  /**
   * 处理显示汤底事件
   * @param {Object} e 事件对象
   */
  async onShowTruth(e) {
    const { soupId } = e.detail;
    if (!soupId) return;

    try {
      // 使用chatStore显示汤底
      this.showTruth(soupId);
    } catch (error) {
      console.error('获取汤底失败:', error);
      this.showErrorToast('无法获取汤底，请重试');
    }
  },

  /**
   * 处理发送消息事件
   * @param {Object} e 事件对象
   */
  async handleSend(e) {
    const { value } = e.detail;
    if (!value || !value.trim()) return;

    // 验证消息长度不超过50个字
    if (value.length > 50) {
      wx.showToast({
        title: '消息不能超过50个字',
        icon: 'none'
      });
      return;
    }

    // 如果正在发送或动画中，显示提示并返回
    if (this.data.isSending || this.data.isAnimating) {
      this.showTip('请稍等', ['正在回复中，请稍候...'], 2000);
      return;
    }

    // 设置发送状态
    this.setData({ isSending: true });
    this.setSendingStatus(true);

    try {
      // 直接从store获取必要参数
      const soupId = soupStore.soupData ? soupStore.soupData.id : '';
      const dialogId = chatStore.dialogId;
      const userId = rootStore.userId;

      // 检查必要参数
      if (!dialogId) {
        throw new Error('缺少必要参数: dialogId (chatStore.dialogId)');
      }
      if (!userId) {
        throw new Error('缺少必要参数: userId (rootStore.userId)');
      }
      if (!soupId) {
        throw new Error('缺少必要参数: soupId (soupStore.soupData.id)');
      }

      // 更新用户回答过的汤记录
      try {
        await userService.updateAnsweredSoup(soupId);
      } catch (err) {
        console.error('更新用户回答汤记录失败:', err);
        // 失败不影响用户体验，继续执行
      }

      // 使用dialogService处理用户输入
      const dialogService = require('../../service/dialogService');
      const { userMessage } = dialogService.handleUserInput(value.trim());

      // 使用tipStore跟踪用户消息
      tipStore.trackUserMessage({
        messageId: userMessage.id,
        content: userMessage.content
      });

      // 直接使用chatStore发送消息
      const success = await chatStore.sendMessage(userMessage.content);

      if (!success) {
        throw new Error('发送消息失败');
      }

      // 不再需要手动刷新对话组件，chatStore的变化会自动通知组件

    } catch (error) {
      console.error('发送消息失败:', error);
      this.showErrorToast(error.message || '发送失败，请重试');
    } finally {
      // 重置发送状态
      this.setData({ isSending: false });
      this.setSendingStatus(false);
    }
  },

  /**
   * 处理测试代理事件
   * @param {Object} e 事件对象
   */
  async handleTestAgent(e) {
    const { value } = e.detail;
    if (!value || !value.trim()) return;

    // 验证消息长度不超过50个字
    if (value.length > 50) {
      wx.showToast({
        title: '消息不能超过50个字',
        icon: 'none'
      });
      return;
    }

    // 如果正在发送或动画中，显示提示并返回
    if (this.data.isSending || this.data.isAnimating) {
      this.showTip('请稍等', ['正在回复中，请稍候...'], 2000);
      return;
    }

    // 设置发送状态
    this.setData({
      isSending: true,
      isAnimating: false
    });

    try {
      // 直接从store获取必要参数
      const soupId = soupStore.soupData ? soupStore.soupData.id : '';
      const dialogId = chatStore.dialogId;
      const userId = rootStore.userId;
      const soupData = soupStore.soupData;

      // 详细日志，帮助调试
      console.log('调试参数(从store获取):', {
        soupId,
        dialogId,
        userId,
        soupData: soupData ? '存在' : '不存在'
      });

      // 检查必要参数
      if (!dialogId) {
        throw new Error('缺少必要参数: dialogId (chatStore.dialogId)');
      }
      if (!userId) {
        throw new Error('缺少必要参数: userId (rootStore.userId)');
      }
      if (!soupId) {
        throw new Error('缺少必要参数: soupId (soupStore.soupData.id)');
      }
      if (!soupData) {
        throw new Error('缺少必要参数: soupData (soupStore.soupData)');
      }

      // 创建用户消息对象
      const userMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: value.trim(),
        timestamp: Date.now()
      };

      // 直接调用agentService发送请求
      const agentService = require('../../service/agentService');

      // 构建历史消息数组
      const historyMessages = chatStore.messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // 添加当前用户消息
      historyMessages.push({
        role: userMessage.role,
        content: userMessage.content
      });

      // 先将用户消息添加到消息列表
      const messagesWithUser = [...chatStore.messages, userMessage];
      chatStore.updateState({ messages: messagesWithUser });

      // 调用Agent API
      const response = await agentService.sendAgent({
        messages: historyMessages,
        soup: soupStore.soupData, // 直接使用soupStore.soupData
        userId: userId,
        dialogId: dialogId
      });

      // 创建回复消息
      const replyMessage = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        status: 'sent',
        timestamp: response.timestamp
      };

      // 更新消息列表，添加回复消息
      const updatedMessages = [...messagesWithUser, replyMessage];
      chatStore.updateState({ messages: updatedMessages });

      // 获取对话组件
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        // 如果启用了打字机效果，为最后一条消息添加动画
        this.setData({ isAnimating: true });
        await dialog.animateMessage(updatedMessages.length - 1);
        this.setData({ isAnimating: false });
      }

    } catch (error) {
      console.error('处理Agent请求失败:', error);
      this.showErrorToast(error.message || '发送失败，请重试');
    } finally {
      // 重置发送状态
      this.setData({ isSending: false });
    }
  },

  // ===== 辅助方法 =====
  /**
   * 显示错误提示
   * @param {string} message 错误信息
   */
  showErrorToast(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 处理消息点击事件
   * @param {Object} e 事件对象
   */
  handleMessageTap(e) {
    const { message, index } = e.detail;
    console.log('消息被点击:', message, index);
    // 可以在这里添加点击消息的处理逻辑
  },

  /**
   * 处理消息长按事件
   * @param {Object} e 事件对象
   */
  handleMessageLongPress(e) {
    const { message, index } = e.detail;
    console.log('消息被长按:', message, index);
    // 可以在这里添加长按消息的处理逻辑，如复制文本等
    wx.showActionSheet({
      itemList: ['复制文本'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 复制文本
          wx.setClipboardData({
            data: message.content,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 处理动画完成事件
   * @param {Object} e 事件对象
   */
  handleAnimationComplete(e) {
    const { messageIndex, success } = e.detail;
    console.log('动画完成:', messageIndex, success);
    // 动画完成后的处理逻辑
  }

});
