/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理滑动交互、切换汤面、双击收藏
 * 使用MobX管理数据，页面只负责UI交互
 */
// ===== 导入依赖 =====
const { SWIPE_DIRECTION, createInteractionManager } = require('../../utils/interactionManager');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { store } = require('../../stores/soupStore');

Page({
  // ===== 页面数据 =====
  data: {
    // 交互相关 - 由interactionManager管理
    swiping: false, // 是否正在滑动中
    swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
    swipeStarted: false, // 是否开始滑动
    blurAmount: 0, // 模糊程度（0-10px）
  },

  // ===== 生命周期方法 =====
  /**
   * 页面加载时执行
   * 获取用户ID并加载汤面
   * @param {Object} options - 页面参数，可能包含soupId
   */
  async onLoad(options) {
    // 创建MobX Store绑定 - 只绑定需要的字段，不再绑定actions
    this.storeBindings = createStoreBindings(this, {
      store: store,
      fields: [
        'soupId', 'userId', 'isLoading', 'soupData'
      ]
    });

    // 同步用户ID - 确保获取最新的用户状态
    await store.syncUserId();

    // 检查是否有指定的汤面ID
    let targetSoupId = options.soupId || null;

    // 如果没有提供ID，则获取随机汤面ID
    if (!targetSoupId) {
      targetSoupId = await store.getRandomSoup();
    }

    if (targetSoupId) {
      // 初始化汤面数据 - 直接使用store方法
      store.initSoup(targetSoupId, store.userId || '');

      // 增加汤面阅读数
      store.viewSoup(targetSoupId);
    } else {
      this.showErrorToast('加载失败，请重试');
    }

    // 初始化交互管理器
    this.initInteractionManager();
  },

  /**
   * 页面显示时执行
   * 设置底部TabBar选中状态并同步用户ID
   */
  onShow() {
    // 设置底部TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1  // 第二个tab是喝汤页面
      });
    }

    // 同步用户ID - 直接调用store方法
    store.syncUserId();
  },

  /**
   * 页面卸载时执行
   * 清理资源
   */
  onUnload() {
    // 清理MobX绑定
    if (this.storeBindings) {
      this.storeBindings.destroyStoreBindings();
    }

    // 清理交互管理器
    if (this.interactionManager) {
      this.interactionManager.destroy();
      this.interactionManager = null;
    }
  },

  /**
   * 分享小程序
   */
  onShareAppMessage() {
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: `/pages/index/index?soupId=${store.soupId}`
    };
  },

  /**
   * 开始喝汤按钮点击事件
   * 极简逻辑，只负责跳转到chat页面
   */
  async onStartSoup() {
    // 检查用户是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      // 显示登录提示弹窗
      const loginPopup = this.selectComponent('#loginPopup');
      if (loginPopup) {
        loginPopup.show();
      }
      return;
    }

    // 直接跳转到chat页面
    wx.navigateTo({
      url: `/pages/chat/chat?soupId=${store.soupId}`
    });
  },

  /**
   * 处理登录弹窗确认按钮点击事件
   */
  onLoginConfirm() {
    // 跳转到个人中心页面
    wx.switchTab({
      url: '/pages/mine/mine'
    });
  },

  // ===== 汤面切换相关 =====
  /**
   * 切换汤面
   * 极简版本，只负责UI效果和调用store方法
   * @param {string} direction 切换方向，'next' 或 'previous'
   * @returns {Promise<void>}
   */
  async switchSoup(direction) {
    // 如果正在加载，不执行切换
    if (this.isLoading) return;

    try {
      // 根据方向获取下一个汤面ID
      const isNext = direction === 'next';

      // 使用MobX store中的方法获取相邻汤面ID
      const soupId = await store.getAdjacentSoup(store.soupId, isNext);

      if (soupId) {
        // 初始化新的汤面数据 - 所有数据管理由store处理
        // 这会自动设置isLoading状态，MobX会触发观察者更新breathingBlur
        store.initSoup(soupId, store.userId || '');

        // 增加汤面阅读数
        store.viewSoup(soupId);
      } else {
        this.showErrorToast('切换失败，请重试');
      }
    } catch (error) {
      console.error('切换汤面失败:', error);
      this.showErrorToast('切换失败，请重试');
    }
  },

  // ===== 交互相关 =====
  /**
   * 处理soup-display组件的滑动事件
   * @param {Object} e 事件对象
   */
  handleSoupSwipe(e) {
    const { direction } = e.detail;
    // 等待一帧，确保滑动反馈动画先应用
    wx.nextTick(() => {
      this.switchSoup(direction);
    });
  },

  /**
   * 处理双击收藏事件
   * 直接调用MobX store的toggleFavorite方法
   */
  handleDoubleTap() {
    if (store.soupId) {
      // 直接调用store的方法，store内部会处理登录检查
      store.toggleFavorite(store.soupId);
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
   * 处理汤数据变更事件
   * 极简版本，直接调用store方法
   * @param {Object} e 事件对象
   */
  handleSoupChange(e) {
    const { soup } = e.detail;
    if (!soup || !soup.soupId) return;

    // 初始化新的汤面数据 - 所有数据管理由store处理
    store.initSoup(soup.soupId, store.userId || '');

    // 增加汤面阅读数
    store.viewSoup(soup.soupId);
  },

  /**
   * 处理汤面加载状态变化
   * @param {Object} e 事件对象
   */
  handleSoupLoading() {
    // 这里不需要额外处理，因为isLoading状态已经由MobX管理
    // 但需要保留这个方法以响应组件的loading事件
  },

  // 移除对breathingBlur的控制代码，由soup-display组件自己处理

  // ===== 交互管理器相关 =====
  /**
   * 初始化交互管理器
   * 创建交互管理器实例并设置回调函数
   */
  initInteractionManager() {
    // 创建交互管理器实例
    this.interactionManager = createInteractionManager({
      // 设置数据更新方法 - 直接传递页面的setData方法
      setData: this.setData.bind(this),

      // 滑动相关配置
      threshold: 50, // 滑动触发阈值
      maxBlur: 10, // 最大模糊程度
      maxDistance: 100, // 最大滑动距离
      enableBlurEffect: true, // 启用模糊特效
      enableBackgroundEffect: true, // 启用背景效果

      // 双击相关配置
      doubleTapDelay: 300, // 双击间隔时间
      doubleTapDistance: 30, // 双击允许的位置偏差

      // 回调函数 - 简化为直接调用页面方法
      onSwipeLeft: () => this.switchSoup('next'),
      onSwipeRight: () => this.switchSoup('previous'),
      onDoubleTap: this.handleDoubleTap.bind(this)
    });
  },

  /**
   * 触摸开始事件处理
   * @param {Object} e 触摸事件对象
   */
  handleTouchStart(e) {
    this.interactionManager?.handleTouchStart(e, !this.isLoading);
  },

  /**
   * 触摸移动事件处理
   * @param {Object} e 触摸事件对象
   */
  handleTouchMove(e) {
    this.interactionManager?.handleTouchMove(e, !this.isLoading);
  },

  /**
   * 触摸结束事件处理
   * @param {Object} e 触摸事件对象
   */
  handleTouchEnd(e) {
    this.interactionManager?.handleTouchEnd(e, !this.isLoading);
  }
});
