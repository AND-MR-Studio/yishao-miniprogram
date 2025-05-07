/**
 * 聊天页面 - 海龟汤对话与交互
 * 负责处理喝汤状态下的对话、提示和输入功能
 */
// ===== 导入依赖 =====
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');
const userService = require('../../utils/userService');
const eventUtils = require('../../utils/eventUtils');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { store, PAGE_STATE } = require('../../stores/soupStore');

Page({
  // ===== 页面数据 =====
  data: {
    // 页面状态
    isLoading: true,

    // 汤面相关
    soupData: null, // 当前汤面完整数据对象
    breathingBlur: false, // 呈现呼吸模糊效果

    // 交互相关
    blurAmount: 0, // 模糊程度（0-10px）
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
      // 创建MobX Store绑定
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: [
          'soupId', 'dialogId', 'userId', 'soupState',
          'isPeeking', 'tipVisible', 'showButtons',
          'isViewing', 'isDrinking', 'isTruth',
          'shouldShowTip', 'shouldShowButtons',
          'shouldShowSoupDisplay', 'shouldShowInteractionFooter'
        ],
        actions: ['updateState', 'setPeekingStatus']
      });

      this.setData({ isLoading: true });

      // 检查是否有指定的汤面ID
      const soupId = options.soupId || '';
      const dialogId = options.dialogId || '';

      if (!soupId) {
        throw new Error('缺少汤面ID参数');
      }

      // 初始化汤面数据
      await this.initSoupData(soupId);

      // 获取用户ID
      const userId = await this.ensureUserId();

      // 设置为喝汤状态
      this.updateState({
        soupId: soupId,
        userId: userId,
        soupState: PAGE_STATE.DRINKING
      });

      // 如果有dialogId，使用现有对话
      if (dialogId) {
        this.updateState({
          dialogId: dialogId
        });

        // 初始化对话
        this.initDialog(soupId, dialogId, userId);
      } else {
        // 否则创建新对话
        this.createNewDialog(soupId, userId);
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
   * 初始化汤面数据
   * @param {string} soupId 汤面ID
   */
  async initSoupData(soupId) {
    if (!soupId) {
      console.error('汤面ID为空，无法初始化');
      return;
    }

    try {
      // 使用getSoup方法获取汤面数据，并设置detail=true以获取完整数据
      const soupData = await soupService.getSoup(soupId, true);

      if (!soupData) {
        console.error('获取汤面数据失败: 未找到指定ID的汤面');
        this.setData({ isLoading: false });
        return;
      }

      // 更新页面数据
      this.setData({
        soupData: soupData,
        isLoading: false
      });

      // 并行处理收藏和点赞状态检查
      const favoritePromise = userService.isFavoriteSoup(soupId)
        .catch(error => {
          console.error('检查收藏状态失败:', error);
          return false; // 出错时默认为未收藏
        });

      const likedPromise = userService.isLikedSoup(soupId)
        .catch(error => {
          console.error('检查点赞状态失败:', error);
          return false; // 出错时默认为未点赞
        });

      // 等待收藏和点赞状态检查完成
      const [isFavorite, isLiked] = await Promise.all([favoritePromise, likedPromise]);

      // 更新MobX store中的汤面数据和交互状态
      const soupDataWithInteractions = {
        ...soupData,
        isFavorite: isFavorite,
        isLiked: isLiked,
        favoriteCount: soupData.favoriteCount || 0,
        likeCount: soupData.likeCount || 0,
        viewCount: soupData.viewCount || 0
      };

      // 更新MobX store
      store.updateSoupData(soupDataWithInteractions);

      // 更新汤面显示组件的数据
      const soupDisplay = this.selectComponent('#soupDisplay');
      if (soupDisplay) {
        soupDisplay.setData({
          soupData: soupDataWithInteractions
        });
      }
    } catch (error) {
      console.error('初始化汤面数据失败:', error);
      this.setData({ isLoading: false });
    }
  },

  /**
   * 初始化对话
   * @param {string} soupId 汤面ID
   * @param {string} dialogId 对话ID
   * @param {string} userId 用户ID
   */
  initDialog(soupId, dialogId, userId) {
    // 显示对话框并设置必要属性
    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      dialog.setData({
        soupId: soupId,
        dialogId: dialogId,
        userId: userId,
        visible: true
      });

      // 加载对话记录
      dialog.loadDialogMessages();
    }
  },

  /**
   * 创建新对话
   * @param {string} soupId 汤面ID
   * @param {string} userId 用户ID
   */
  async createNewDialog(soupId, userId) {
    try {
      // 获取用户对话，如果不存在则创建新对话
      let dialogData = await dialogService.getUserDialog(userId, soupId);

      // 如果没有对话ID，创建新对话
      if (!dialogData.dialogId) {
        dialogData = await dialogService.createDialog(userId, soupId);
      }

      const dialogId = dialogData.dialogId || '';

      if (!dialogId) {
        throw new Error('无法获取对话ID');
      }

      // 更新MobX Store
      this.updateState({
        dialogId: dialogId
      });

      // 初始化对话
      this.initDialog(soupId, dialogId, userId);
    } catch (error) {
      console.error('创建对话失败:', error);
      this.showErrorToast('无法创建对话，请重试');
    }
  },

  /**
   * 页面加载完成时执行
   * 注册事件监听器
   */
  onReady() {
    // 初始化事件中心（如果尚未初始化）
    eventUtils.initEventCenter();

    // 注册事件监听器
    eventUtils.onEvent('peekingStatusChange', this.handlePeekingStatusChange.bind(this));
  },

  /**
   * 页面卸载时执行
   * 清理资源
   */
  onUnload() {
    // 清理事件监听器
    eventUtils.offEvent('peekingStatusChange', this.handlePeekingStatusChange);

    // 清理MobX绑定
    if (this.storeBindings) {
      this.storeBindings.destroyStoreBindings();
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
   * @param {Object} data 事件数据
   */
  handlePeekingStatusChange(data) {
    if (!data) return;

    // 使用MobX更新偷看状态
    this.setPeekingStatus(data.isPeeking);
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
      // 更新MobX Store
      this.updateState({
        soupState: PAGE_STATE.TRUTH
      });

      // 设置汤底ID
      this.setData({
        truthSoupId: soupId
      });
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

    this.setData({ isSending: true });

    const dialog = this.selectComponent('#dialog');
    if (dialog) {
      await dialog.sendMessage(message);
    }

    this.setData({ isSending: false });
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

  /**
   * 确保获取用户ID
   * 如果没有用户ID，尝试刷新用户信息
   * @returns {Promise<string>} 用户ID
   * @throws {Error} 如果无法获取用户ID
   */
  async ensureUserId() {
    let userId = await userService.getUserId();
    if (!userId) {
      await userService.refreshUserInfo();
      userId = await userService.getUserId();
      if (!userId) {
        throw new Error('无法获取用户ID');
      }
    }
    return userId;
  }
});