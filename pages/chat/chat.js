/**
 * 聊天页面 - 海龟汤对话与交互
 * 负责处理喝汤状态下的对话、提示和输入功能
 */
// ===== 导入依赖 =====
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { rootStore, chatStore, tipStore, CHAT_STATE } = require('../../stores/index');
const userService = require('../../service/userService');

Page({
  // ===== 页面数据 =====
  data: {
    // 页面状态 - 仅保留不由MobX管理的状态
    isAnimating: false, // 是否正在动画中 - 用于控制动画过程中的UI状态
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

      // 创建chatStore绑定 - 管理聊天相关的所有状态
      this.chatStoreBindings = createStoreBindings(this, {
        store: chatStore,
        fields: [
          'dialogId', 'chatState', 'soupId', 'soupData',
          'isPeeking', 'isSending', 'isAnimating', 'isLoading',
          'isDrinking', 'isTruth', 'messages', 'inputValue'
        ],
        actions: [
          'updateState', 'setPeekingStatus', 'setInputValue',
          'setAnimatingStatus', 'setSendingStatus', 'showTruth',
          'createDialog', 'fetchMessages', 'sendMessage', 'fetchSoupForChat'
        ]
      });

      // 创建tipStore绑定 - 管理提示信息状态
      this.tipStoreBindings = createStoreBindings(this, {
        store: tipStore,
        fields: ['visible', 'title', 'content'],
        actions: ['showTip', 'hideTip', 'setDefaultTip']
      });

      // 获取页面参数
      const soupId = options.soupId || '';
      const dialogId = options.dialogId || '';

      if (!soupId) {
        throw new Error('缺少汤面ID参数');
      }

      // 同步用户ID
      await this.syncUserId();

      // 获取汤面数据并初始化 - 使用chatStore的方法
      const soupData = await this.fetchSoupForChat(soupId);

      if (!soupData) {
        throw new Error('获取汤面数据失败');
      }

      // 设置chatStore的基本数据
      chatStore.updateState({
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
    if (this.chatStoreBindings) {
      this.chatStoreBindings.destroyStoreBindings();
    }
    if (this.tipStoreBindings) {
      this.tipStoreBindings.destroyStoreBindings();
    }
  },

  /**
   * 分享小程序给好友
   * 使用最新的微信小程序分享API
   * 只分享当前显示的soup-display组件内容
   * @returns {Object} 分享配置对象
   */
  onShareAppMessage() {
    // 获取当前汤面数据
    const shareSoup = chatStore.soupData;

    // 构建分享标题 - 使用汤面标题或默认标题
    const shareTitle = shareSoup?.title
      ? `这个海龟汤太难了：${shareSoup.title}`
      : "这个海龟汤太难了来帮帮我！";

    // 构建分享路径 - 确保带上soupId和dialogId参数
    const soupId = shareSoup?.id || '';
    const dialogId = chatStore.dialogId || '';
    const sharePath = `/pages/chat/chat?soupId=${soupId}&dialogId=${dialogId}`;

    // 构建分享图片 - 优先使用汤面图片，其次使用默认图片
    // 注意：图片必须是网络图片，且必须是https协议
    const imageUrl = shareSoup?.image || this.selectComponent('#soupDisplay')?.data.mockImage || require('../../config/api').default_share_image;

    return {
      title: shareTitle,
      path: sharePath,
      imageUrl: imageUrl,
      success: function(res) {
        // 分享成功的回调
        console.log('分享成功', res);
      },
      fail: function(res) {
        // 分享失败的回调
        console.log('分享失败', res);
      }
    };
  },

  /**
   * 分享小程序到朋友圈
   * 使用最新的微信小程序分享朋友圈API
   * 只分享当前显示的soup-display组件内容
   * @returns {Object} 分享配置对象
   */
  onShareTimeline() {
    // 获取当前汤面数据
    const shareSoup = chatStore.soupData;

    // 构建分享标题 - 使用汤面标题或默认标题
    const shareTitle = shareSoup?.title
      ? `这个海龟汤太难了：${shareSoup.title}`
      : "这个海龟汤太难了来帮帮我！";

    // 构建查询参数 - 朋友圈分享使用query而不是path
    const soupId = shareSoup?.id || '';
    const dialogId = chatStore.dialogId || '';
    const query = `soupId=${soupId}&dialogId=${dialogId}`;

    // 构建分享图片 - 优先使用汤面图片，其次使用默认图片
    const imageUrl = shareSoup?.image || this.selectComponent('#soupDisplay')?.data.mockImage || require('../../config/api').default_share_image;

    return {
      title: shareTitle,
      query: query,
      imageUrl: imageUrl
    };
  },

  // ===== 事件处理 =====
  /**
   * 处理长按开始事件
   * 用于偷看功能 - 页面级别管理
   */
  onLongPressStart() {
    // 使用MobX更新偷看状态
    this.setPeekingStatus(true);

    // 同时隐藏提示模块 - 使用action方法
    this.hideTip();
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
      // 使用action方法显示提示并重置内容
      this.setDefaultTip();
      this.showTip(tipStore.defaultTitle, tipStore.defaultContent);
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
   * 处理清理上下文事件
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
   * 处理显示汤底事件
   * @param {Object} e 事件对象
   */
  async onShowTruth(e) {
    try {
      // 使用chatStore显示汤底 - 不再需要传递soupId参数
      this.showTruth();
    } catch (error) {
      console.error('获取汤底失败:', error);
      this.showErrorToast('无法获取汤底，请重试');
    }
  },

  /**
   * 处理发送消息事件 - 统一处理所有消息发送
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

    // 使用chatStore的计算属性检查是否可以发送消息
    if (!chatStore.canSendMessage) {
      this.showTip('请稍等', ['正在回复中，请稍候...'], 2000);
      return;
    }

    try {
      // 更新用户回答过的汤记录
      try {
        const soupId = chatStore.soupData ? chatStore.soupData.id : '';
        if (soupId) {
          await userService.updateAnsweredSoup(soupId);
        }
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
      const result = await chatStore.sendMessage(userMessage.content);

      if (!result || !result.success) {
        throw new Error('发送消息失败');
      }

      // 获取对话组件并执行动画 - 只对AI助手消息应用动画
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        // 直接调用dialog组件的animateMessage方法
        await dialog.animateMessage(result.messageIndex);
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      this.showErrorToast(error.message || '发送失败，请重试');
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
   * 处理动画完成事件
   * @param {Object} e 事件对象
   */
  handleAnimationComplete(e) {
    const { messageIndex, success } = e.detail;
    console.log('动画完成:', messageIndex, success);
    // 动画完成后的处理逻辑
  }

});
