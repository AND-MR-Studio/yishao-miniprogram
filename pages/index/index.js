/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理用户交互、管理页面状态
 */
// ===== 导入依赖 =====
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');
const userService = require('../../utils/userService');
const { SWIPE_DIRECTION } = require('../../utils/interactionManager');

// ===== 常量定义 =====
const PAGE_STATE = {
  VIEWING: 'viewing',  // 看汤状态
  DRINKING: 'drinking', // 喝汤状态(对话)
  TRUTH: 'truth'       // 汤底状态
};

// ===== 页面状态管理对象 =====
const createPageStateManager = (page) => {
  return {
    /**
     * 切换到查看状态
     */
    switchToViewing() {
      page.setData({
        pageState: PAGE_STATE.VIEWING,
        showButtons: true
      });

      // 确保开始喝汤按钮显示并重置到初始状态
      const startButton = page.selectComponent('#startSoupButton');
      if (startButton) {
        startButton.setData({ visible: true });
        startButton.resetButton();
      }
    },

    /**
     * 切换到喝汤状态
     * @param {string} soupId 汤面ID
     * @param {string} dialogId 对话ID
     * @param {string} userId 用户ID
     */
    switchToDrinking(soupId, dialogId, userId) {
      // 更新页面状态
      page.setData({
        pageState: PAGE_STATE.DRINKING,
        showButtons: false,
        tipVisible: true // 初始化tip模块为显示状态
      });

      // 确保开始喝汤按钮隐藏
      const startButton = page.selectComponent('#startSoupButton');
      if (startButton) {
        startButton.setData({ visible: false });
      }

      // 显示对话框并设置必要属性
      const dialog = page.selectComponent('#dialog');
      if (dialog) {
        // 对话记录应该已经在onStartSoup中预加载完成
        // 现在只需要设置visible为true显示对话框
        dialog.setData({
          soupId: soupId,
          dialogId: dialogId,
          userId: userId,
          visible: true
        });
      }
    },

    /**
     * 切换到汤底状态
     * @param {string} soupId 汤面ID
     * @param {Object} truthData 汤底数据
     */
    switchToTruth(soupId, truthData) {
      page.setData({
        pageState: PAGE_STATE.TRUTH,
        truthSoupId: soupId,
        truthData: truthData
      });
    }
  };
};

// ===== 汤面操作对象 =====
const createSoupOperations = (page) => {
  return {
    /**
     * 加载汤面数据
     * @param {string} soupId 可选的汤面ID
     * @returns {Promise<Object>} 汤面数据
     */
    async loadSoup(soupId) {
      return await page.fetchSoupData(soupId);
    },

    /**
     * 切换汤面
     * @param {string} direction 切换方向，'next' 或 'previous'
     * @returns {Promise<void>}
     */
    async switchSoup(direction) {
      if (page.data.isLoading) return;

      // 设置加载状态，并启用呼吸模糊效果
      page.setData({
        isLoading: true,
        breathingBlur: true // 启用呼吸模糊效果
      });

      try {
        // 获取当前汤面ID并根据方向获取汤面数据
        const currentSoupId = page.getCurrentSoupId();
        const isNext = direction === 'next';

        // 从服务器获取汤面数据
        const soupData = await soupService.getAdjacentSoup(currentSoupId, isNext);

        if (!soupData) {
          throw new Error(`无法获取${isNext ? '下' : '上'}一个汤面数据`);
        }

        // 更新对话组件
        const soupId = soupData.soupId || '';
        page.selectComponent('#dialog')?.setData({ soupId });

        // 初始化汤面数据和页面状态
        await page.initSoupData(soupData);

        // 重置UI状态
        page.setData({
          swipeFeedback: false,  // 关闭滑动反馈动画
          breathingBlur: false   // 关闭呼吸模糊效果
        });
      } catch (error) {
        console.error('切换汤面失败:', error);
        page.showErrorToast('切换失败，请重试');
        // 重置所有UI状态
        page.setData({
          isLoading: false,
          swipeFeedback: false,
          breathingBlur: false
        });
      }
    },

    /**
     * 增加汤面阅读数
     * @param {string} soupId 汤面ID
     * @returns {Promise<void>}
     */
    async incrementViewCount(soupId) {
      await page.viewSoup(soupId);
    }
  };
};

// ===== 事件处理对象 =====
const createEventHandlers = (page) => {
  return {
    /**
     * 处理标签切换事件
     * @param {Object} e 事件对象
     */
    async onTabChange(e) {
      const { tab } = e.detail;

      // 更新当前激活的标签
      page.setData({ activeTab: tab });

      try {
        // 设置加载状态
        page.setData({ isLoading: true });

        // 临时保存当前activeTab，以便fetchSoupData使用正确的标签
        const originalActiveTab = page.data.activeTab;
        page.setData({ activeTab: tab });

        try {
          // 使用fetchSoupData获取对应标签的汤面
          const soupData = await page.fetchSoupData();

          if (soupData) {
            // 更新对话组件
            const soupId = soupData.soupId || '';
            page.selectComponent('#dialog')?.setData({ soupId });

            // 初始化汤面数据和页面状态
            await page.initSoupData(soupData);
          } else {
            wx.showToast({
              title: '没有找到相关汤',
              icon: 'none'
            });

            // 重置加载状态
            page.setData({ isLoading: false });
          }
        } catch (error) {
          // 如果出错，恢复原来的标签
          page.setData({ activeTab: originalActiveTab });
          throw error; // 向上传递错误，由外层catch处理
        }
      } catch (error) {
        console.error('加载汤面失败:', error);
        page.showErrorToast('加载失败，请重试');
        page.setData({ isLoading: false });
      }
    },

    /**
     * 处理汤面滑动事件
     * @param {Object} e 事件对象
     */
    onSoupSwipe(e) {
      const { direction } = e.detail;
      // 等待一帧，确保滑动反馈动画先应用
      wx.nextTick(() => {
        page.switchSoup(direction);
      });
    },

    /**
     * 处理收藏状态变更事件
     * @param {Object} e 事件对象
     */
    onFavoriteChange(e) {
      const { isFavorite } = e.detail;

      // 更新页面状态
      page.setData({ isFavorite: isFavorite });
    },

    /**
     * 处理汤数据变更事件
     * @param {Object} e 事件对象
     */
    async onSoupChange(e) {
      const { soup } = e.detail;
      if (!soup) return;

      // 更新对话组件
      const soupId = soup.soupId || '';
      page.selectComponent('#dialog')?.setData({ soupId });

      // 初始化汤面数据和页面状态
      await page.initSoupData(soup);
    },

    /**
     * 处理汤加载状态变更事件
     * @param {Object} e 事件对象
     */
    onSoupLoading(e) {
      const { loading } = e.detail;

      // 只设置加载状态，不设置模糊效果
      page.setData({ isLoading: loading });
    }
  };
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
    isFavorite: false, // 当前汤面是否已收藏
    isPeeking: false, // 是否处于偷看状态

    // 标签切换相关
    activeTab: '荒诞', // 当前激活的标签: '荒诞', '搞笑', '惊悚', '变格'，默认显示荒诞汤

    // 交互相关 - 由interactionManager管理
    swiping: false, // 是否正在滑动中
    swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
    swipeFeedback: false, // 滑动反馈动画
    swipeStarted: false, // 是否开始滑动
    blurAmount: 0, // 模糊程度（0-10px）
  },

  // ===== 页面属性 =====
  pageStateManager: null, // 页面状态管理器
  soupOperations: null, // 汤面操作对象
  eventHandlers: null, // 事件处理对象

  // ===== 生命周期方法 =====
  /**
   * 页面加载时执行
   * 获取用户设置并加载汤面
   * @param {Object} options - 页面参数，可能包含soupId和dialogId
   */
  async onLoad(options) {
    try {
      // 初始化页面状态管理器、汤面操作对象和事件处理对象
      this.pageStateManager = createPageStateManager(this);
      this.soupOperations = createSoupOperations(this);
      this.eventHandlers = createEventHandlers(this);

      this.setData({ isLoading: true });

      // 检查是否有指定的汤面ID
      const soupId = options.soupId || null;
      const dialogId = options.dialogId || null;

      // 如果有dialogId，先设置到dialogService
      if (dialogId) {
        dialogService.setCurrentDialogId(dialogId);
      }

      // 获取汤面数据
      let soupData = await this.fetchSoupData(soupId);

      if (!soupData) {
        throw new Error('无法获取汤面数据');
      }

      // 初始化汤面数据和页面状态
      await this.initSoupData(soupData);

      // 如果有dialogId，自动切换到喝汤状态
      if (dialogId) {
        // 等待汤面数据加载完成后切换到喝汤状态
        wx.nextTick(async () => {
          try {
            const userId = await this.ensureUserId();
            const currentSoupId = this.getCurrentSoupId();
            this.pageStateManager.switchToDrinking(currentSoupId, dialogId, userId);
          } catch (error) {
            console.error('切换到喝汤状态失败:', error);
            this.showErrorToast('无法切换到喝汤状态');
          }
        });
      }
    } catch (error) {
      console.error('页面加载失败:', error);
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
    const soupId = soupData.soupId || '';
    if (!soupId) {
      console.error('汤面ID为空，无法初始化');
      return;
    }

    // 设置当前汤面ID到dialogService
    dialogService.setCurrentSoupId(soupId);

    // 增加汤面阅读数
    await this.viewSoup(soupId);

    // 并行处理收藏状态检查
    const favoritePromise = userService.isFavoriteSoup(soupId)
      .catch(error => {
        console.error('检查收藏状态失败:', error);
        return false; // 出错时默认为未收藏
      });

    // 等待收藏状态检查完成
    const isFavorite = await favoritePromise;

    // 更新页面状态和数据
    this.setData({
      currentSoup: soupData,
      isLoading: false,
      showButtons: true,
      isFavorite: isFavorite
    });

    // 更新汤面显示组件的收藏状态、收藏数和点赞数
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      soupDisplay.setData({
        isFavorite: isFavorite,
        favoriteCount: soupData?.favoriteCount || 0,
        likeCount: soupData?.likeCount || 0
      });
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
   * 注册事件监听器
   */
  onReady() {
    // 初始化事件中心（如果尚未初始化）
    if (!wx.eventCenter) {
      wx.eventCenter = {
        callbacks: {},
        on(eventName, callback) {
          this.callbacks[eventName] = this.callbacks[eventName] || [];
          this.callbacks[eventName].push(callback);
        },
        emit(eventName, data) {
          const callbacks = this.callbacks[eventName] || [];
          callbacks.forEach(callback => callback(data));
        }
      };
    }

    // 注册事件监听器
    wx.eventCenter.on('loadSoupWithDialog', this.handleLoadSoupWithDialog.bind(this));
  },

  /**
   * 处理加载汤面和对话的事件
   * @param {Object} data 包含 soupId 和 dialogId 的对象
   */
  async handleLoadSoupWithDialog(data) {
    if (!data || !data.soupId) return;

    try {
      // 设置加载状态
      this.setData({ isLoading: true });

      // 如果有dialogId，先设置到dialogService
      if (data.dialogId) {
        dialogService.setCurrentDialogId(data.dialogId);
      }

      // 获取汤面数据
      const soupData = await this.fetchSoupData(data.soupId);
      if (!soupData) {
        throw new Error('无法获取汤面数据');
      }

      // 初始化汤面数据和页面状态
      await this.initSoupData(soupData);

      // 如果有dialogId，预加载对话记录并切换到喝汤状态
      if (data.dialogId) {
        try {
          // 获取用户ID（使用抽取的公共方法）
          const userId = await this.ensureUserId();

          // 预加载对话记录
          const dialog = this.selectComponent('#dialog');
          if (dialog) {
            // 设置必要的属性
            dialog.setData({
              soupId: data.soupId,
              dialogId: data.dialogId,
              userId: userId,
              visible: false
            });

            // 显式加载对话记录并直接切换到喝汤状态
            await dialog.loadDialogMessages();
            // 加载完成后直接切换到喝汤状态
            this.pageStateManager.switchToDrinking(data.soupId, data.dialogId, userId);
          }
        } catch (error) {
          console.error('预加载对话记录失败:', error);
          // 即使预加载失败，也尝试切换到喝汤状态
          try {
            const userId = await this.ensureUserId();
            this.pageStateManager.switchToDrinking(data.soupId, data.dialogId, userId);
          } catch (error) {
            console.error('切换到喝汤状态失败:', error);
            this.showErrorToast('无法切换到喝汤状态');
          }
        }
      }
    } catch (error) {
      console.error('加载汤面和对话失败:', error);
      this.showErrorToast('加载失败，请重试');
      this.setData({
        isLoading: false,
        showButtons: true
      });
    }
  },

  /**
   * 页面卸载时执行
   * 清理资源
   */
  onUnload() {
    // 清理事件监听器
    if (wx.eventCenter && wx.eventCenter.callbacks) {
      // 移除当前页面的事件监听
      if (wx.eventCenter.callbacks['loadSoupWithDialog']) {
        wx.eventCenter.callbacks['loadSoupWithDialog'] =
          wx.eventCenter.callbacks['loadSoupWithDialog'].filter(
            callback => callback !== this.handleLoadSoupWithDialog
          );
      }
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
   * 处理对话组件关闭事件
   * 返回到汤面查看状态
   */
  onDialogClose() {
    // 使用页面状态管理器切换到查看状态
    this.pageStateManager.switchToViewing();
  },

  /**
   * 处理提示模块关闭事件
   */
  onTipModuleClose() {
    // 提示模块关闭时的处理逻辑
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
      // 获取汤底数据
      const truthData = await soupService.getSoup(soupId);
      if (!truthData) {
        throw new Error('无法获取汤底数据');
      }

      // 使用页面状态管理器切换到汤底状态
      this.pageStateManager.switchToTruth(soupId, truthData);
    } catch (error) {
      console.error('获取汤底失败:', error);
      this.showErrorToast('无法获取汤底，请重试');
    }
  },

  /**
   * 开始喝汤按钮点击事件
   * 处理用户点击开始喝汤按钮的所有逻辑
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

    // 获取当前汤面ID
    const currentSoupId = this.getCurrentSoupId();
    if (!currentSoupId) {
      if (startButton) {
        startButton.setLoadingComplete(false);
      }
      this.showErrorToast('无法获取汤面信息');
      return;
    }

    try {
      // 获取用户ID（使用抽取的公共方法）
      const userId = await this.ensureUserId();

      // 获取用户对话，如果不存在则创建新对话
      let dialogData = await dialogService.getUserDialog(userId, currentSoupId);

      // 如果没有对话ID，创建新对话
      if (!dialogData.dialogId) {
        dialogData = await dialogService.createDialog(userId, currentSoupId);
      }

      const dialogId = dialogData.dialogId || dialogService.getCurrentDialogId();

      if (!dialogId) {
        throw new Error('无法获取对话ID');
      }

      // 预加载对话记录
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        // 设置必要的属性，但不显示对话框
        dialog.setData({
          soupId: currentSoupId,
          dialogId: dialogId,
          userId: userId,
          visible: false
        });

        // 显式加载对话记录
        await dialog.loadDialogMessages();

        // 加载完成后，设置按钮加载完成
        if (startButton) {
          startButton.setLoadingComplete(true);
        }

        // 等待一小段时间确保UI更新完成
        setTimeout(() => {
          // 切换到喝汤状态
          this.pageStateManager.switchToDrinking(currentSoupId, dialogId, userId);
        }, 100);
      } else {
        // 如果无法获取对话组件，仍然尝试切换状态
        if (startButton) {
          startButton.setLoadingComplete(true);
        }
        this.pageStateManager.switchToDrinking(currentSoupId, dialogId, userId);
      }
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

  /**
   * 处理登录弹窗取消按钮点击事件
   */
  onLoginCancel() {
    // 弹窗会自动关闭，无需额外处理
  },

  // ===== 汤面切换相关 =====
  /**
   * 切换汤面
   * @param {string} direction 切换方向，'next' 或 'previous'
   * @returns {Promise<void>}
   */
  async switchSoup(direction) {
    // 使用汤面操作对象切换汤面
    await this.soupOperations.switchSoup(direction);
  },

  /**
   * 获取当前汤面ID
   * @returns {string} 当前汤面ID
   */
  getCurrentSoupId() {
    return this.data.currentSoup ?
      (this.data.currentSoup.soupId || '') : '';
  },

  /**
   * 获取汤面数据的策略方法
   * 按照优先级依次尝试不同的获取方式：
   * 1. 优先使用指定的汤面ID
   * 2. 如果没有指定ID，则获取与当前标签匹配的汤面
   * 3. 如果没有找到匹配标签的汤面，则获取第一个可用的汤面
   *
   * @param {string} soupId 可选的汤面ID
   * @returns {Promise<Object>} 汤面数据
   */
  async fetchSoupData(soupId) {
    // 策略1：如果有指定的汤面ID，直接获取该汤面
    if (soupId) {
      return await soupService.getSoup(soupId);
    }

    // 策略2：获取与当前标签匹配的汤面
    const soups = await soupService.getSoupList({ tags: this.data.activeTab });
    if (soups && soups.length > 0) {
      // 随机选择一个汤面
      const randomIndex = Math.floor(Math.random() * soups.length);
      return soups[randomIndex];
    }

    // 策略3：如果没有找到对应标签的汤面，获取第一个汤面
    return await soupService.getAdjacentSoup(null, true);
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
    this.eventHandlers.onSoupSwipe(e);
  },

  /**
   * 处理收藏状态变更事件
   * 从soup-display组件传递上来的事件
   * @param {Object} e 事件对象
   */
  handleFavoriteChange(e) {
    this.eventHandlers.onFavoriteChange(e);
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

  /**
   * 增加汤面阅读数
   * @param {string} soupId 汤面ID
   * @returns {Promise<void>}
   */
  async viewSoup(soupId) {
    if (!soupId) return;
    try {
      await soupService.viewSoup(soupId);
    } catch (error) {
      console.error('增加阅读数失败:', error);
      // 阅读数增加失败不影响用户体验，静默处理
    }
  },

  /**
   * 处理标签切换事件
   * @param {Object} e 事件对象
   */
  async handleTabChange(e) {
    await this.eventHandlers.onTabChange(e);
  },

  /**
   * 处理汤数据变更事件
   * @param {Object} e 事件对象
   */
  async handleSoupChange(e) {
    await this.eventHandlers.onSoupChange(e);
  },

  /**
   * 处理汤加载状态变更事件
   * @param {Object} e 事件对象
   */
  handleSoupLoading(e) {
    this.eventHandlers.onSoupLoading(e);
  },



});