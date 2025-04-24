/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理用户交互、管理页面状态
 */
// ===== 导入依赖 =====
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');
const { createSwipeManager, SWIPE_DIRECTION } = require('../../utils/swipeManager');

// ===== 常量定义 =====
const PAGE_STATE = {
  VIEWING: 'viewing',  // 看汤状态
  DRINKING: 'drinking', // 喝汤状态(对话)
  TRUTH: 'truth'       // 汤底状态
};

Page({
  // ===== 页面数据 =====
  data: {
    // 页面状态
    pageState: PAGE_STATE.VIEWING,
    isLoading: true,
    showButtons: false,
    showSetting: false, // 设置面板显示状态

    // 汤面相关
    currentSoup: null, // 当前汤面数据
    breathingBlur: false, // 呈现呼吸模糊效果

    // 滑动相关 - 由swipeManager管理
    swiping: false, // 是否正在滑动中
    swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
    swipeFeedback: false, // 滑动反馈动画
    swipeStarted: false, // 是否开始滑动
    blurAmount: 0 // 模糊程度（0-10px）
  },

  // ===== 页面属性 =====
  swipeManager: null, // 滑动管理器

  // ===== 生命周期方法 =====
  /**
   * 页面加载时执行
   * 获取用户设置并加载第一个汤面
   */
  async onLoad() {
    // 初始化滑动管理器
    this.initSwipeManager();

    // 不再需要获取用户设置，已移除打字机动画相关功能

    try {
      this.setData({ isLoading: true });

      // 获取第一个汤面数据
      const soupData = await soupService.getAdjacentSoup(null, true); // 传入null获取第一个汤面
      if (!soupData) {
        throw new Error('无法获取汤面数据');
      }

      // 初始化汤面数据和页面状态
      await this.initSoupData(soupData);
    } catch (error) {
      this.showErrorToast('加载失败，请重试');
      this.setData({
        isLoading: false,
        showButtons: false
      });
    }
  },

  /**
   * 初始化汤面数据和页面状态
   * @param {Object} soupData 汤面数据
   */
  async initSoupData(soupData) {
    // 获取汤面ID
    const soupId = soupData.soupId || soupData.id || '';

    // 设置当前汤面ID到dialogService
    dialogService.setCurrentSoupId(soupId);

    // 更新页面状态和数据
    this.setData({
      currentSoup: soupData,
      isLoading: false,
      showButtons: true
    });

    // 增加汤面阅读数
    await this.incrementSoupViewCount(soupId);
  },

  /**
   * 页面显示时执行
   * 设置底部TabBar选中状态
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1  // 第二个tab是喝汤页面
      })
    }
  },

  /**
   * 页面卸载时执行
   * 清理资源
   */
  onUnload() {
    // 销毁滑动管理器
    if (this.swipeManager) {
      this.swipeManager.destroy();
      this.swipeManager = null;
    }
  },

  /**
   * 分享小程序
   */
  onShareAppMessage() {
    const currentSoup = this.data.currentSoup;
    const title = currentSoup && currentSoup.title ?
      `${currentSoup.title}` :
      '这个海龟汤太难了来帮帮我！';

    return {
      title: title,
      path: '/pages/index/index'
    };
  },

  // ===== 页面状态管理 =====
  /**
   * 切换到喝汤（对话）状态
   * 设置当前汤面ID并显示对话组件
   */
  switchToDrinking() {
    // 如果已经在喝汤状态，不再重复切换
    if (this.data.pageState === PAGE_STATE.DRINKING) return;

    // 获取当前汤面ID
    const currentSoupId = this.getCurrentSoupId();
    if (!currentSoupId) return;

    // 设置当前汤面ID到dialogService
    dialogService.setCurrentSoupId(currentSoupId);

    // 更新页面状态
    this.setData({
      pageState: PAGE_STATE.DRINKING,
      showButtons: false
    });

    // 显示对话框
    wx.nextTick(() => {
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        // 先设置 soupId，等待下一帧后再设置 visible，确保能正确加载对话历史
        dialog.setData({ soupId: currentSoupId });

        // 等待下一帧，确保 soupId 已经被正确设置
        wx.nextTick(() => {
          dialog.setData({ visible: true });
        });
      }
    });
  },

  /**
   * 切换到汤底状态
   * @param {string} soupId 汤面ID
   * @param {Object} [truthData] 汤底数据，如果不提供则从服务器获取
   */
  async switchToTruth(soupId, truthData) {
    try {
      if (!truthData && soupId) {
        truthData = await soupService.getSoup(soupId);
      }

      if (!truthData) {
        throw new Error('无法获取汤底数据');
      }

      this.setData({
        pageState: PAGE_STATE.TRUTH,
        truthSoupId: soupId,
        truthData: truthData
      });
    } catch (error) {
      this.showErrorToast('无法获取汤底，请重试');
    }
  },

  /**
   * 处理对话组件关闭事件
   * 返回到汤面查看状态
   */
  onDialogClose() {
    this.setData({
      pageState: PAGE_STATE.VIEWING,
      showButtons: true
    });
  },

  /**
   * 处理显示汤底事件
   * @param {Object} e 事件对象
   */
  onShowTruth(e) {
    const { soupId } = e.detail;
    if (!soupId) return;
    this.switchToTruth(soupId);
  },

  /**
   * 开始喝汤按钮点击事件
   * 按钮点击后会触发preload事件，在那里处理登录检查和预加载
   * 这里不需要做任何处理，保留方法以便将来扩展
   */
  onStartSoup() {
    // 不需要在这里处理，所有逻辑已移至onButtonPreload方法
    // 按钮点击后会自动触发preload事件
  },

  /**
   * 处理按钮预加载事件 - 异步处理
   */
  async onButtonPreload() {
    // 防止重复预加载
    if (this._isPreloading) return;
    this._isPreloading = true;

    try {
      // 检查用户是否已登录
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo) {
        // 未登录状态下，通知按钮重置到原始状态，不进行预加载
        const startButton = this.selectComponent('.start-button');
        if (startButton) {
          startButton.setLoadingComplete(false); // 传入false表示失败，按钮应该重置
        }

        // 显示登录提示
        wx.showModal({
          title: '侦探大人，想喝碗汤吗？',
          content: '先去「个人中心」登录一下吧～',
          confirmText: '去登录',
          cancelText: '先等等',
          success: (res) => {
            if (res.confirm) {
              // 跳转到个人中心页面
              wx.switchTab({
                url: '/pages/mine/mine'
              });
            }
          }
        });
        return;
      }

      // 获取当前汤面ID
      const currentSoupId = this.getCurrentSoupId();
      if (!currentSoupId) {
        this._isPreloading = false;
        return;
      }

      // 设置当前汤面ID到dialogService
      dialogService.setCurrentSoupId(currentSoupId);

      // 异步预加载对话记录
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        // 先设置 soupId，但不显示对话框
        dialog.setData({ soupId: currentSoupId, visible: false });

        // 在单独的微任务中加载对话记录
        Promise.resolve().then(async () => {
          try {
            await dialog.loadDialogMessages();

            // 加载完成后通知按钮
            const startButton = this.selectComponent('.start-button');
            if (startButton) {
              startButton.setLoadingComplete();
            }
          } catch (error) {
            console.error('预加载对话记录失败:', error);
            // 即使加载失败也通知按钮完成
            const startButton = this.selectComponent('.start-button');
            if (startButton) {
              startButton.setLoadingComplete();
            }
          }
        });
      }
    } finally {
      // 预加载完成后重置标志
      setTimeout(() => {
        this._isPreloading = false;
      }, 500);
    }
  },

  /**
   * 处理按钮展开动画完成事件 - 异步处理
   */
  async onButtonExpandEnd() {
    // 再次检查用户是否已登录（以防万一）
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      // 未登录状态下，不切换到喝汤状态
      return;
    }

    // 在单独的微任务中切换到喝汤状态
    // 这样可以减少主线程负担，避免卡顿
    setTimeout(() => {
      this.switchToDrinking();
    }, 0);
  },

  // 偷看功能已移除，准备重构

  // ===== 汤面切换相关 =====
  /**
   * 切换汤面
   * @param {string} direction 切换方向，'next' 或 'previous'
   * @returns {Promise<void>}
   */
  async switchSoup(direction) {
    if (this.data.isLoading) return;

    // 设置加载状态，并启用呼吸模糊效果
    this.setData({
      isLoading: true,
      breathingBlur: true // 启用呼吸模糊效果
      // swipeFeedback已经在handleSwipe中设置
    });

    try {
      // 获取当前汤面ID并根据方向获取汤面数据
      const currentSoupId = this.getCurrentSoupId();
      const isNext = direction === 'next';

      // 从服务器获取汤面数据
      const soupData = await soupService.getAdjacentSoup(currentSoupId, isNext);

      if (!soupData) {
        throw new Error(`无法获取${isNext ? '下' : '上'}一个汤面数据`);
      }

      // 更新对话组件
      const soupId = soupData.soupId || soupData.id || '';
      this.selectComponent('#dialog')?.setData({ soupId });

      // 初始化汤面数据和页面状态
      await this.initSoupData(soupData);

      // 等待一帧，确保汤面数据已经加载完成
      wx.nextTick(() => {
        // 设置页面状态，关闭呼吸模糊效果
        this.setData({
          pageState: PAGE_STATE.VIEWING,
          swipeFeedback: false,  // 关闭滑动反馈动画
          breathingBlur: false   // 关闭呼吸模糊效果
        });
      });
    } catch (error) {
      this.showErrorToast('切换失败，请重试');
      this.setData({
        isLoading: false,
        swipeFeedback: false,
        breathingBlur: false // 关闭呼吸模糊效果
      });
    }
  },

  /**
   * 获取当前汤面ID
   * @returns {string} 当前汤面ID
   */
  getCurrentSoupId() {
    return this.data.currentSoup ?
      (this.data.currentSoup.soupId || this.data.currentSoup.id || '') : '';
  },

  /**
   * 增加汤面阅读数
   * @param {string} soupId 汤面ID
   */
  async incrementSoupViewCount(soupId) {
    if (!soupId) return;

    try {
      await soupService.viewSoup(soupId);
    } catch (error) {
      // 阅读数增加失败不影响用户体验，不显示错误提示
    }
  },


  // ===== 设置相关 =====
  /**
   * 处理设置变更事件
   * @param {Object} e 事件对象
   */
  handleSettingChange() {
    // 设置变更处理逻辑
    // 注意：已移除打字机动画相关设置
  },

  /**
   * 显示设置面板
   */
  showSetting() {
    this.setData({ showSetting: true });
  },

  /**
   * 关闭设置面板
   */
  onSettingClose() {
    this.setData({ showSetting: false });
  },

  // ===== 滑动相关 =====
  /**
   * 初始化滑动管理器
   */
  initSwipeManager() {
    // 创建滑动管理器
    this.swipeManager = createSwipeManager({
      threshold: 50,
      maxBlur: 10, // 最大模糊程度，默认10px
      maxDistance: 100, // 最大滑动距离，默认100px
      enableBlurEffect: true, // 启用模糊特效
      enableBackgroundEffect: true, // 启用背景效果
      pageSelector: '.page', // 页面元素选择器
      setData: this.setData.bind(this),

      // 滑动方向回调
      onSwipeLeft: this.handleSwipe.bind(this, 'next'),
      onSwipeRight: this.handleSwipe.bind(this, 'previous')
    });
  },



  /**
   * 处理滑动方向回调（滑动距离足够时触发）
   * @param {string} direction 滑动方向
   */
  handleSwipe(direction) {
    if (this.canSwitchSoup()) {
      // 滑动结束时，设置滑动反馈动画
      this.setData({
        swipeFeedback: true,
        swipeDirection: direction === 'next' ? SWIPE_DIRECTION.LEFT : SWIPE_DIRECTION.RIGHT
      });

      // 等待一帧，确保滑动反馈动画先应用
      wx.nextTick(() => {
        this.switchSoup(direction);
      });
    }
  },

  /**
   * 检查是否可以切换汤面
   * @returns {boolean} 是否可以切换汤面
   */
  canSwitchSoup() {
    return this.data.pageState === PAGE_STATE.VIEWING && !this.data.isLoading;
  },

  /**
   * 触摸事件处理方法
   */
  handleTouch(method, e) {
    this.swipeManager?.[method](e, this.canSwitchSoup());
  },

  // 使用简化的通用处理函数
  touchStart(e) { this.handleTouch('handleTouchStart', e); },
  touchMove(e) { this.handleTouch('handleTouchMove', e); },
  touchEnd(e) { this.handleTouch('handleTouchEnd', e); },

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
  }

  // 页面结束
});