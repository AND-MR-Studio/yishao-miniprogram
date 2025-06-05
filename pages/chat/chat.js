/**
 * 聊天页面 - 海龟汤对话与交互
 * 负责处理喝汤状态下的对话、提示和输入功能
 */
// ===== 导入依赖 =====
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { rootStore, settingStore, CHAT_STATE } = require('../../stores/index');

Page({
  // ===== 页面数据 =====
  data: {
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
        fields: ['userId', 'soupId', 'soupData'],
        actions: []
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
      
      // 创建chatStore绑定 - 更新方法名
      this.chatStoreBindings = createStoreBindings(this, {
        store: rootStore.chatStore,
        fields: ['messages', 'chatState', 'inputValue', 'canSendMessage', 'dialogId', 'isPeeking'],
        actions: ['processConversation', 'setChatState', 'setInputValue', 'addUserMessage', 'addAgentMessage']
      });
      
      // 创建tipStore绑定 - 管理提示信息状态
      this.tipStoreBindings = createStoreBindings(this, {
        store: rootStore.tipStore,
        fields: ['visible', 'title', 'content', 'state'],
        actions: ['showTip', 'hideTip', 'setDefaultTip', 'showSpecialTip']
      });

      // 同步用户ID - 这是必要的UI初始化操作
      await rootStore.userStore.syncUserInfo();      // 确保tipStore显示默认提示
      rootStore.tipStore.setDefaultTip();
      rootStore.tipStore.showTip();

      // 初始化聊天数据 - 通过chatStore统一处理
      await rootStore.chatStore.getChatData(options.soupId, options.dialogId);
    } catch (error) {
      console.error('页面加载失败:', error);
      this.showErrorToast('加载失败，请重试');
    }
  },

  /**
   * 页面加载完成时执行
   */
  onReady() {
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
    // 获取当前汤面数据 - 从rootStore获取
    const shareSoup = this.soupData;

    // 构建分享标题 - 使用汤面标题或默认标题
    const shareTitle = shareSoup?.title
      ? `这个海龟汤太难了：${shareSoup.title}`
      : "这个海龟汤太难了来帮帮我！";

    // 构建分享路径 - 确保带上soupId和dialogId参数
    const soupId = this.soupId || '';
    const dialogId = this.dialogId || '';
    const sharePath = `/pages/chat/chat?soupId=${soupId}&dialogId=${dialogId}`;

    // 构建分享图
    const imageUrl = shareSoup?.image;

    return {
      title: shareTitle,
      path: sharePath,
      imageUrl: imageUrl
    };
  },
  /**
   * 分享小程序到朋友圈
   * 使用最新的微信小程序分享朋友圈API
   * 只分享当前显示的soup-display组件内容
   * @returns {Object} 分享配置对象
   */
  onShareTimeline() {
    // 获取当前汤面数据 - 从rootStore获取
    const shareSoup = this.soupData;

    // 构建分享标题 - 使用汤面标题或默认标题
    const shareTitle = shareSoup?.title
      ? `这个海龟汤太难了：${shareSoup.title}`
      : "这个海龟汤太难了来帮帮我！";

    // 构建查询参数 - 朋友圈分享使用query而不是path
    const soupId = this.soupId || '';
    const dialogId = this.dialogId || '';
    const query = `soupId=${soupId}&dialogId=${dialogId}`;

    // 构建分享图片 - 优先使用汤面图片，其次使用默认图片
    const imageUrl = shareSoup?.image;

    return {
      title: shareTitle,
      query: query,
      imageUrl: imageUrl
    };  },

  // ===== 事件处理 =====
  /**
   * 处理长按开始事件
   * 用于偷看功能 - 页面级别管理
   */
  onLongPressStart() {
    // 直接修改 MobX 绑定的状态
    this.isPeeking = true;

    // 同时隐藏提示模块 - 使用action方法
    this.hideTip();
  },

  /**
   * 处理长按结束事件
   * 用于偷看功能 - 页面级别管理
   */
  onLongPressEnd() {
    // 直接修改 MobX 绑定的状态
    this.isPeeking = false;

    // 恢复提示模块可见性 - 使用延迟确保状态更新后再显示提示
    setTimeout(() => {
      // 使用action方法显示提示并重置内容
      this.setDefaultTip();
      this.showTip();
    }, 100);
  },

/**
   * 处理输入变化事件 - 统一的输入处理方法
   * @param {Object} e 事件对象
   */
  handleInputChange(e) {
    const value = e.detail.value;
    // 更新chatStore中的输入值
    this.setInputValue(value);
  },

  /**
   * 处理清空输入事件 - input-bar组件的clear事件
   */
  handleInputClear() {
    this.setInputValue('');
  },
  /**
   * 处理显示汤底事件
   * @param {Object} e 事件对象
   */
  async onShowTruth(e) {
    try {
      // 使用chatStore显示汤底 - 直接切换状态即可
      this.setChatState(CHAT_STATE.TRUTH);
    } catch (error) {
      console.error('显示汤底失败:', error);
      this.showErrorToast('无法显示汤底，请重试');
    }
  },/**
   * 处理发送消息事件
   * @param {Object} e 事件对象
   */
  async handleSend(e) {
    const { value } = e.detail;
    
    if (!value || !value.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    if (!this.canSendMessage) {
      wx.showToast({
        title: '侦探大人，请别急...',
        icon: 'none'
      });
      return;
    }

    try {
      // 使用新的方法名 - 语义更清晰
      const result = await this.processConversation(value.trim());

      if (!result || !result.success) {
        const errorMessage = result?.error || '发送消息失败';
        this.showErrorToast(errorMessage);
        return;
      }

      // 更新用户回答记录
      try {
        const soupId = this.soupId || '';
        if (soupId) {
          await this.updateAnsweredSoup(soupId);
        }
      } catch (err) {
        console.error('更新用户回答汤记录失败:', err);
      }

      // 动画由组件自动处理，无需手动调用

    } catch (error) {
      console.error('处理对话失败:', error);
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

// ===== 指南相关事件处理 =====
  /**
   * 显示指南层
   * 通过settingStore统一管理指南状态
   */
  onShowGuide() {
    // 调用settingStore的toggleGuide方法显示引导层
    this.toggleGuide(true);
  },

  /**
   * 关闭指南层
   * 通过settingStore统一管理指南状态
   */
  onCloseGuide() {
    // 调用settingStore的toggleGuide方法隐藏引导层
    this.toggleGuide(false);
  }

});
