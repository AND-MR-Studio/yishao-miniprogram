/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理用户交互、管理页面状态
 */
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');
const { createSwipeManager, SWIPE_DIRECTION } = require('../../utils/swipeManager');

// 定义页面状态常量
const PAGE_STATE = {
  VIEWING: 'viewing',  // 看汤状态
  DRINKING: 'drinking', // 喝汤状态(对话)
  TRUTH: 'truth'       // 汤底状态
};

Page({
  data: {
    pageState: PAGE_STATE.VIEWING,
    isLoading: true,
    showButtons: false,
    isPeeking: false, // 偷看状态
    showSetting: false, // 设置面板显示状态
    currentSoup: null, // 当前汤面数据
    staticMode: false, // 静态模式（跳过动画）
    swiping: false, // 是否正在滑动中
    swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
    swipeFeedback: false // 滑动反馈动画
  },

  // 滑动管理器
  swipeManager: null,

  /**
   * 页面加载时执行
   * 获取用户设置并加载第一个汤面
   */
  async onLoad() {
    // 初始化滑动管理器
    this.initSwipeManager();
    try {
      this.setData({ isLoading: true });

      // 获取用户设置
      const settings = wx.getStorageSync('soupSettings') || {};
      const skipAnimation = settings.skipAnimation || false;

      // 获取第一个汤面数据
      const soupData = await soupService.getNextSoup(null); // 传入null获取第一个汤面
      if (!soupData) {
        throw new Error('无法获取汤面数据');
      }

      // 更新页面状态和数据
      this.setData({
        currentSoup: soupData,
        isLoading: false,
        showButtons: true,
        staticMode: skipAnimation
      });

      // 增加汤面阅读数
      this.incrementSoupViewCount(soupData.soupId || soupData.id);

      console.log('加载汤面数据成功:', soupData.soupId || soupData.id);
    } catch (error) {
      console.error('初始化汤面数据失败:', error);
      this.showErrorToast('加载失败，请重试');
      this.setData({
        isLoading: false,
        showButtons: false
      });
    }
  },

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
      showButtons: false,
      staticMode: true // 强制静态模式，显示完整内容
    });

    // 显示对话框
    wx.nextTick(() => {
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        console.log('切换到喝汤状态，当前汤面ID:', currentSoupId);

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
      console.error('切换到汤底状态失败:', error);
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
   * 如果当前在汤底状态，则返回到汤面查看状态
   * 否则切换到喝汤状态
   */
  onStartSoup() {
    this.switchToDrinking();
  },

  /**
   * 处理偷看事件
   * @param {Object} e 事件对象
   */
  onPeekSoup(e) {
    const { isPeeking } = e.detail;
    this.setData({ isPeeking });
  },

  /**
   * 切换汤面
   * @param {string} direction 切换方向，'next' 或 'previous'
   * @returns {Promise<void>}
   */
  async switchSoup(direction) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      // 获取当前汤面ID并根据方向获取汤面数据
      const currentSoupId = this.getCurrentSoupId();
      const isNext = direction === 'next';
      const getSoupMethod = isNext ? soupService.getNextSoup : soupService.getPreviousSoup;
      const soupData = await getSoupMethod.call(soupService, currentSoupId);

      if (!soupData) {
        throw new Error(`无法获取${isNext ? '下' : '上'}一个汤面数据`);
      }

      // 获取汤面ID并更新相关服务
      const soupId = soupData.soupId || soupData.id || '';
      dialogService.setCurrentSoupId(soupId);

      // 更新对话组件
      this.selectComponent('#dialog')?.setData({ soupId });

      // 更新页面状态和数据
      this.setData({
        currentSoup: soupData,
        pageState: PAGE_STATE.VIEWING,
        isLoading: false,
        staticMode: (wx.getStorageSync('soupSettings') || {}).skipAnimation || false,
        swipeFeedback: false
      });

      // 增加汤面阅读数并记录日志
      this.incrementSoupViewCount(soupId);
      console.log(`切换到${isNext ? '下' : '上'}一个汤面，当前汤面ID:`, soupId);
    } catch (error) {
      console.error(`切换${direction === 'next' ? '下' : '上'}一个汤面失败:`, error);
      this.showErrorToast('切换失败，请重试');
      this.setData({ isLoading: false, swipeFeedback: false });
    }
  },

  // 切换汤面的简化方法
  onNextSoup() { this.switchSoup('next'); },
  onPreviousSoup() { this.switchSoup('previous'); },

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
   * 处理设置变更事件
   * @param {Object} e 事件对象
   */
  handleSettingChange(e) {
    const { type, value } = e.detail;
    if (type === 'skipAnimation') {
      // 更新页面状态，组件会通过属性变化自动响应
      this.setData({
        staticMode: value
      });

      // 保存设置到本地存储
      const settings = wx.getStorageSync('soupSettings') || {};
      settings.skipAnimation = value;
      wx.setStorageSync('soupSettings', settings);
    }
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
      console.log('增加汤面阅读数成功:', soupId);
    } catch (error) {
      console.error('增加汤面阅读数失败:', error);
      // 阅读数增加失败不影响用户体验，不显示错误提示
    }
  },

  /**
   * 初始化滑动管理器
   */
  initSwipeManager() {
    // 创建滑动管理器
    this.swipeManager = createSwipeManager({
      threshold: 50,
      setData: this.setData.bind(this),

      // 滑动回调
      onSwipeLeft: this.handleSwipe.bind(this, 'next'),
      onSwipeRight: this.handleSwipe.bind(this, 'previous')
    });
  },

  /**
   * 处理滑动事件
   * @param {string} direction 滑动方向
   */
  handleSwipe(direction) {
    if (this.canSwitchSoup()) {
      this.setData({ swipeFeedback: true });
      this.switchSoup(direction);
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
   * 触摸事件处理方法
   */
  handleTouch(method, e) {
    this.swipeManager?.[method](e, this.canSwitchSoup());
  },

  // 使用简化的通用处理函数
  touchStart(e) { this.handleTouch('handleTouchStart', e); },
  touchMove(e) { this.handleTouch('handleTouchMove', e); },
  touchEnd(e) { this.handleTouch('handleTouchEnd', e); }
});