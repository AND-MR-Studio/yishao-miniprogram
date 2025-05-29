/**
 * 聊天页面 - 海龟汤对话与交互
 * 负责处理喝汤状态下的对话、提示和输入功能
 */
// ===== 导入依赖 =====
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { rootStore, chatStore, tipStore, settingStore, CHAT_STATE, TIP_STATE, tipConfig } = require('../../stores/index');

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
    try {      // 创建rootStore绑定 - 用于获取用户ID和userStore方法
      this.rootStoreBindings = createStoreBindings(this, {
        store: rootStore,
        fields: ['userId'],
        actions: ['syncUserInfo']
      });

      // 创建userStore绑定 - 用于用户相关操作
      this.userStoreBindings = createStoreBindings(this, {
        store: rootStore.userStore,
        actions: ['updateAnsweredSoup']
      });

      // 创建settingStore绑定 - 用于引导层状态管理
      this.settingStoreBindings = createStoreBindings(this, {
        store: settingStore,
        fields: ['showGuide'],
        actions: ['toggleGuide']
      });

      // 创建chatStore绑定 - 管理聊天相关的所有状态
      this.chatStoreBindings = createStoreBindings(this, {
        store: chatStore,
        fields: [
          'dialogId', 'chatState', 'soupId', 'soupData',
          'isPeeking', 'canSendMessage', 'messages', 'inputValue'
        ],
        actions: [
          'setPeekingStatus', 'setInputValue', 'setLoadingState', 'restoreChatState',
          'showTruth', 'getChatData', 'fetchMessages', 'sendMessage'
        ]
      });

      // 创建soupStore绑定 - 管理汤面交互状态
      this.soupStoreBindings = createStoreBindings(this, {
        store: rootStore.soupStore,
        fields: ['isLiked', 'isFavorite', 'likeCount', 'favoriteCount'],
        actions: ['fetchSoup', 'toggleLike', 'toggleFavorite']
      });

      // 创建tipStore绑定 - 管理提示信息状态
      this.tipStoreBindings = createStoreBindings(this, {
        store: tipStore,
        fields: ['visible', 'title', 'content', 'state'],
        actions: ['showTip', 'hideTip', 'setDefaultTip', 'showSpecialTip']
      });

      // 获取页面参数
      const soupId = options.soupId || '';
      const dialogId = options.dialogId || '';

      if (!soupId) {
        throw new Error('缺少汤面ID参数');
      }

      // 同步用户ID
      await rootStore.userStore.syncUserInfo();      // 获取汤面数据并初始化 - 使用soupStore的方法
      const soupData = await rootStore.soupStore.fetchSoup(soupId);

      if (!soupData) {
        throw new Error('获取汤面数据失败');
      }

      // 设置chatStore的基本数据
      chatStore.chatState = CHAT_STATE.DRINKING;
      chatStore.dialogId = dialogId;

      // 确保tipStore显示默认提示
      tipStore.showTip(tipConfig.defaultTitle, tipConfig.defaultContent, 0, TIP_STATE.DEFAULT);

      // 初始化对话 - 使用新的getChatData方法
      if (dialogId) {
        // 使用现有对话ID，设置到chatStore并加载消息
        chatStore.dialogId = dialogId;
        await chatStore.fetchMessages();
      } else {
        // 获取聊天数据（后端处理对话创建逻辑）
        await chatStore.getChatData(rootStore.userStore.userId, soupId);
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
      // 使用chatStore获取聊天数据
      const success = await chatStore.getChatData(rootStore.userStore.userId, chatStore.soupId);

      if (!success) {
        throw new Error('无法获取聊天数据');
      }
    } catch (error) {
      console.error('获取聊天数据失败:', error);
      this.showErrorToast('无法获取聊天数据，请重试');
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
    if (this.userStoreBindings) {
      this.userStoreBindings.destroyStoreBindings();
    }
    if (this.settingStoreBindings) {
      this.settingStoreBindings.destroyStoreBindings();
    }
    if (this.chatStoreBindings) {
      this.chatStoreBindings.destroyStoreBindings();
    }
    if (this.soupStoreBindings) {
      this.soupStoreBindings.destroyStoreBindings();
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
    // 获取当前汤面数据 - 从soupStore获取
    const shareSoup = rootStore.soupStore.soupData;

    // 构建分享标题 - 使用汤面标题或默认标题
    const shareTitle = shareSoup?.title
      ? `这个海龟汤太难了：${shareSoup.title}`
      : "这个海龟汤太难了来帮帮我！";

    // 构建分享路径 - 确保带上soupId和dialogId参数
    const soupId = shareSoup?.id || '';
    const dialogId = chatStore.dialogId || '';
    const sharePath = `/pages/chat/chat?soupId=${soupId}&dialogId=${dialogId}`;

    // 构建分享图片 - 优先使用汤面图片，其次使用配图，最后使用默认图片
    // 注意：图片必须是网络图片，且必须是https协议
    const imageUrl = shareSoup?.image || this.selectComponent('#soupDisplay')?.data.coverUrl;

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
    // 获取当前汤面数据 - 从soupStore获取
    const shareSoup = rootStore.soupStore.soupData;

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
    }    try {      // 更新用户回答过的汤记录 - 通过 userStore 而不是直接调用 userService
      try {
        const soupId = rootStore.soupStore.soupData ? rootStore.soupStore.soupData.id : '';
        if (soupId) {
          await this.updateAnsweredSoup(soupId);
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
  },

  /**
   * 处理设置面板变化事件
   * @param {Object} e 事件对象
   */
  handleSettingChange(e) {
    const { type, value } = e.detail;
    console.log('设置变化:', type, value);
    // 处理设置变化
  },

  /**
   * 处理显示引导事件
   * 通过nav-bar组件转发的setting组件事件
   */
  onShowGuide() {
    // 调用settingStore的toggleGuide方法显示引导层
    settingStore.toggleGuide(true);
  },
  /**
   * 处理关闭引导事件
   * 引导层组件的关闭事件
   */
  onCloseGuide() {
    // 调用settingStore的toggleGuide方法隐藏引导层
    settingStore.toggleGuide(false);
  }

});
