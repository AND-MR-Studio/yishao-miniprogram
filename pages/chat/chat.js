/**
 * 聊天页面 - 海龟汤对话与交互
 * 负责处理喝汤状态下的对话、提示和输入功能
 */
// ===== 导入依赖 =====
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { soupStore } = require('../../stores/soupStore');
const { chatStore, CHAT_STATE } = require('../../stores/chatStore');
const { tipStore } = require('../../stores/tipStore');

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
      // 创建soupStore绑定 - 用于获取汤面数据和用户ID
      this.soupStoreBindings = createStoreBindings(this, {
        store: soupStore,
        fields: ['isLoading', 'userId'],
        actions: ['fetchSoupById']
      });

      // 创建chatStore绑定 - 管理聊天相关的所有状态
      this.chatStoreBindings = createStoreBindings(this, {
        store: chatStore,
        fields: [
          'soupId', 'soupData', 'dialogId', 'userId', 'chatState',
          'isPeeking', 'isSending', 'isReplying', 'tipVisible',
          'isDrinking', 'isTruth', 'shouldShowTip', 'messages'
        ],
        actions: [
          'updateState', 'setPeekingStatus', 'setTipVisible',
          'showTruth', 'createDialog', 'fetchMessages', 'sendMessage'
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

      // 使用soupStore中的userId
      const userId = soupStore.userId || '';

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
        soupId: soupId,
        soupData: soupData,
        userId: userId,
        chatState: CHAT_STATE.DRINKING,
        dialogId: dialogId,
        tipVisible: true // 确保提示可见
      });

      // 确保tipStore的visible状态为true
      tipStore.visible = true;

      // 初始化对话
      if (dialogId) {
        this.initDialog(dialogId);
      } else {
        // 创建新对话
        await chatStore.createDialog();
        this.initDialog(chatStore.dialogId);
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
   * 初始化对话
   * @param {string} dialogId 对话ID
   */
  initDialog(dialogId) {
    // 显示对话框并设置必要属性
    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      dialog.setData({
        dialogId: dialogId,
        visible: true
      });

      // 加载对话记录
      dialog.loadDialogMessages();
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

      // 初始化对话
      this.initDialog(chatStore.dialogId);
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
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: `/pages/chat/chat?soupId=${this.soupId}&dialogId=${this.dialogId}`
    };
  },

  // ===== 事件处理 =====
  /**
   * 处理偷看状态变更事件
   * @param {Object} e 事件对象
   */
  handlePeekingStatusChange(e) {
    const { isPeeking } = e.detail;
    if (isPeeking === undefined) return;

    // 使用MobX更新偷看状态
    this.setPeekingStatus(isPeeking);
  },

  /**
   * 处理长按开始事件
   * 用于偷看功能
   */
  onLongPressStart() {
    // 使用MobX更新偷看状态
    this.setPeekingStatus(true);
  },

  /**
   * 处理长按结束事件
   * 用于偷看功能
   */
  onLongPressEnd() {
    // 使用MobX更新偷看状态
    this.setPeekingStatus(false);
  },

  /**
   * 处理对话组件关闭事件
   * 返回到汤面查看状态
   */
  onDialogClose() {
    // 返回到index页面
    wx.navigateBack();
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
   * 转发清理上下文事件到对话组件
   * @param {Object} e 事件对象
   */
  clearContext(e) {
    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      dialog.clearContext(e);
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
    const { message } = e.detail;
    if (!message) return;

    // 使用chatStore发送消息
    await this.sendMessage(message);

    // 更新对话组件
    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      dialog.refreshMessages();
    }
  },

  /**
   * 处理测试代理事件
   */
  handleTestAgent() {
    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      dialog.testAgent();
    }
  },

  /**
   * 处理语音开始事件
   * @param {Object} e 事件对象
   */
  handleVoiceStart(e) {
    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      dialog.handleVoiceStart(e);
    }
  },

  /**
   * 处理语音结束事件
   * @param {Object} e 事件对象
   */
  handleVoiceEnd(e) {
    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      dialog.handleVoiceEnd(e);
    }
  },

  /**
   * 处理语音取消事件
   * @param {Object} e 事件对象
   */
  handleVoiceCancel(e) {
    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      dialog.handleVoiceCancel(e);
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


});
