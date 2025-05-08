/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理用户交互、管理页面状态
 */
// ===== 导入依赖 =====
const soupService = require('../../utils/soupService');
const userService = require('../../utils/userService');
const { SWIPE_DIRECTION } = require('../../utils/interactionManager');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { store, PAGE_STATE } = require('../../stores/soupStore');

// 页面状态管理使用MobX，通过soupStore进行状态管理

// 使用MobX管理状态，不再需要单独的事件处理对象或操作对象

// 使用MobX管理状态，不再需要单独的事件处理对象

Page({
  // ===== 页面数据 =====
  data: {
    // 页面状态
    isLoading: true,
    showSetting: false, // 设置面板显示状态

    // 汤面相关 - 使用MobX管理soupId，不再需要currentSoup
    soupData: null, // 当前汤面完整数据对象
    breathingBlur: false, // 呈现呼吸模糊效果

    // 交互相关 - 由interactionManager管理
    swiping: false, // 是否正在滑动中
    swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
    swipeFeedback: false, // 滑动反馈动画
    swipeStarted: false, // 是否开始滑动
    blurAmount: 0, // 模糊程度（0-10px）
  },

  // ===== 页面属性 =====
  // 使用MobX管理状态，不再需要额外的页面属性

  // ===== 生命周期方法 =====
  /**
   * 页面加载时执行
   * 获取用户设置并加载汤面
   * @param {Object} options - 页面参数，可能包含soupId
   */
  async onLoad(options) {
    try {
      // 创建MobX Store绑定，简化后只需要基本字段和方法
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: [
          'soupId', 'userId', 'soupState', 'isLoading',
          'isViewing'
        ],
        actions: ['updateState', 'initSoup']
      });

      // 设置加载状态
      this.setData({ isLoading: true });

      // 检查是否有指定的汤面ID
      const soupId = options.soupId || null;

      // 获取汤面ID - 如果没有提供ID，则获取随机汤面ID
      let targetSoupId = soupId;
      if (!targetSoupId) {
        targetSoupId = await soupService.getRandomSoup();
        console.log('获取随机汤面ID:', targetSoupId);
      }

      if (!targetSoupId) {
        throw new Error('无法获取汤面ID');
      }

      // 使用initSoup方法初始化汤面数据
      // 这会自动调用fetchSoupData获取数据
      this.initSoup(targetSoupId, '');

      // 增加汤面阅读数
      try {
        await soupService.viewSoup(targetSoupId);
      } catch (error) {
        console.error('增加阅读数失败:', error);
        // 阅读数增加失败不影响用户体验，静默处理
      }

      // 更新页面加载状态
      this.setData({ isLoading: false });
    } catch (error) {
      console.error('页面加载失败:', error);
      this.showErrorToast('加载失败，请重试');
      this.setData({
        isLoading: false
      });
    }
  },

  /**
   * 初始化汤面数据和页面状态
   * 使用MobX的fetchSoupData方法获取汤面数据
   * @param {string} soupId 汤面ID
   */
  async initSoupData(soupId) {
    if (!soupId) {
      console.error('汤面ID为空，无法初始化');
      return;
    }

    try {
      // 设置加载状态
      this.setData({ isLoading: true });

      // 使用initSoup方法初始化汤面数据
      // 这会自动调用fetchSoupData获取数据
      this.initSoup(soupId, this.userId || '');

      // 增加汤面阅读数
      try {
        await soupService.viewSoup(soupId);
      } catch (error) {
        console.error('增加阅读数失败:', error);
        // 阅读数增加失败不影响用户体验，静默处理
      }

      // 更新页面加载状态
      this.setData({ isLoading: false });
    } catch (error) {
      console.error('初始化汤面数据失败:', error);
      this.setData({ isLoading: false });
    }
  },

  /**
   * 页面显示时执行
   * 设置底部TabBar选中状态
   */
  onShow() {
    // 设置底部TabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1  // 第二个tab是喝汤页面
      });
    }
  },

  /**
   * 页面加载完成时执行
   */
  onReady() {
    // 不再需要初始化事件中心和注册事件监听器
    // 所有状态管理已由MobX处理
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
  },

  /**
   * 分享小程序
   */
  onShareAppMessage() {
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: `/pages/index/index?soupId=${this.soupId}`
    };
  },

  // ===== 页面状态管理 =====

  /**
   * 切换到查看状态
   * 使用MobX管理状态，替代旧的pageStateManager
   */
  switchToViewingState() {
    // 更新MobX Store - 其他UI状态会通过计算属性自动更新
    // 由于chat已分离到独立页面，不再需要管理dialogId
    this.updateState({
      soupState: PAGE_STATE.VIEWING
    });

    // 重置开始喝汤按钮
    const startButton = this.selectComponent('#startSoupButton');
    if (startButton) {
      startButton.resetButton();
    }
  },

  /**
   * 切换到喝汤状态
   * 跳转到chat页面
   * @param {string} soupId 汤面ID
   */
  switchToDrinkingState(soupId) {
    // 跳转到chat页面，不再传递dialogId参数
    wx.navigateTo({
      url: `/pages/chat/chat?soupId=${soupId}`
    });
  },


  /**
   * 开始喝汤按钮点击事件
   * 简化逻辑，只负责获取用户ID并跳转到chat页面
   */
  async onStartSoup() {
    // 获取开始喝汤按钮组件
    const startButton = this.selectComponent('#startSoupButton');

    // 检查用户是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      // 重置按钮状态
      if (startButton) {
        startButton.setLoadingComplete(false);
      }

      // 显示登录提示弹窗
      const loginPopup = this.selectComponent('#loginPopup');
      if (loginPopup) {
        loginPopup.show();
      }
      return;
    }

    // 检查当前汤面ID
    if (!this.soupId) {
      if (startButton) {
        startButton.setLoadingComplete(false);
      }
      this.showErrorToast('无法获取汤面信息');
      return;
    }

    try {
      // 获取用户ID
      const userId = await this.ensureUserId();

      // 更新MobX Store中的userId
      this.updateState({
        userId: userId,
        soupState: PAGE_STATE.DRINKING
      });

      // 设置按钮加载完成
      if (startButton) {
        startButton.setLoadingComplete(true);
      }

      // 直接跳转到chat页面，由chat页面负责创建或获取对话
      this.switchToDrinkingState(this.soupId);
    } catch (error) {
      console.error('开始喝汤失败:', error);

      // 重置按钮状态
      if (startButton) {
        startButton.setLoadingComplete(false);
      }

      // 显示错误提示
      this.showErrorToast('加载失败，请重试');
    }
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
   * @param {string} direction 切换方向，'next' 或 'previous'
   * @returns {Promise<void>}
   */
  async switchSoup(direction) {
    if (this.data.isLoading) return;

    // 设置加载状态，并启用呼吸模糊效果
    this.setData({
      isLoading: true,
      breathingBlur: true // 启用呼吸模糊效果
    });

    try {
      // 根据方向获取下一个汤面ID
      const isNext = direction === 'next';

      // 从服务器获取相邻的汤面ID
      const soupId = await soupService.getAdjacentSoup(this.soupId, isNext);

      if (!soupId) {
        throw new Error(`无法获取${isNext ? '下' : '上'}一个汤面ID`);
      }

      // 对话组件已移至chat页面，不再需要更新

      // 使用initSoup方法初始化汤面数据
      this.initSoup(soupId, this.userId || '');

      // 增加汤面阅读数
      try {
        await soupService.viewSoup(soupId);
      } catch (error) {
        console.error('增加阅读数失败:', error);
        // 阅读数增加失败不影响用户体验，静默处理
      }

      // 重置UI状态
      this.setData({
        swipeFeedback: false,  // 关闭滑动反馈动画
        breathingBlur: false   // 关闭呼吸模糊效果
      });
    } catch (error) {
      console.error('切换汤面失败:', error);
      this.showErrorToast('切换失败，请重试');
      // 重置所有UI状态
      this.setData({
        isLoading: false,
        swipeFeedback: false,
        breathingBlur: false
      });
    }
  },





  // ===== 设置相关 =====
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
  },

  // viewSoup 方法已移除，现在直接在 initSoupData 中调用 soupService.viewSoup 并更新 MobX store





  /**
   * 处理汤数据变更事件
   * @param {Object} e 事件对象
   */
  async handleSoupChange(e) {
    const { soup } = e.detail;
    if (!soup) return;

    const soupId = soup.soupId || '';
    if (!soupId) return;

    try {
      // 如果当前处于喝汤状态，先切换回查看状态
      if (this.soupState === PAGE_STATE.DRINKING) {
        // 使用MobX更新页面状态
        this.updateState({
          soupState: PAGE_STATE.VIEWING
        });

        // 切换到查看状态
        this.switchToViewingState();
      }

      // 使用initSoup方法初始化汤面数据
      this.initSoup(soupId, this.userId || '');

      // 增加汤面阅读数
      try {
        await soupService.viewSoup(soupId);
      } catch (error) {
        console.error('增加阅读数失败:', error);
        // 阅读数增加失败不影响用户体验，静默处理
      }
    } catch (error) {
      console.error('加载汤面失败:', error);
      this.showErrorToast('加载失败，请重试');
      this.setData({
        isLoading: false
      });
    }
  },

  /**
   * 处理汤加载状态变更事件
   * @param {Object} e 事件对象
   */
  handleSoupLoading(e) {
    const { loading } = e.detail;
    // 只设置加载状态，不设置模糊效果
    this.setData({ isLoading: loading });
  },


});