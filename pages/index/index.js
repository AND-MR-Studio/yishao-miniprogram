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

  // ===== 生命周期方法 =====
  /**
   * 页面加载时执行
   * 获取用户设置并加载汤面
   * @param {Object} options - 页面参数，可能包含soupId和dialogId
   */
  async onLoad(options) {
    try {
      this.setData({ isLoading: true });

      // 检查是否有指定的汤面ID
      const soupId = options.soupId || null;
      const dialogId = options.dialogId || null;

      // 如果有dialogId，先设置到dialogService
      if (dialogId) {
        dialogService.setCurrentDialogId(dialogId);
      }

      // 获取汤面数据
      let soupData;
      if (soupId) {
        // 如果有指定的汤面ID，直接获取该汤面
        soupData = await soupService.getSoup(soupId);
      } else {
        // 否则获取默认标签的汤面
        const soups = await soupService.getSoupList({ tags: this.data.activeTab });
        if (soups && soups.length > 0) {
          // 随机选择一个汤面
          const randomIndex = Math.floor(Math.random() * soups.length);
          soupData = soups[randomIndex];
        } else {
          // 如果没有找到对应标签的汤面，获取第一个汤面
          soupData = await soupService.getAdjacentSoup(null, true);
        }
      }

      if (!soupData) {
        throw new Error('无法获取汤面数据');
      }

      // 初始化汤面数据和页面状态
      await this.initSoupData(soupData);

      // 如果有dialogId，自动切换到喝汤状态
      if (dialogId) {
        // 等待汤面数据加载完成后切换到喝汤状态
        wx.nextTick(() => {
          this.switchToDrinking();
        });
      }
    } catch (error) {
      console.error('加载失败:', error);
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

    // 设置当前汤面ID到dialogService
    dialogService.setCurrentSoupId(soupId);

    // 检查用户是否已收藏该汤面
    let isFavorite = false;
    try {
      isFavorite = await userService.isFavoriteSoup(soupId);
    } catch (error) {
      console.error('检查收藏状态失败:', error);
    }

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
        favoriteCount: soupData && soupData.favoriteCount || 0,
        likeCount: soupData && soupData.likeCount || 0
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
    wx.eventCenter = wx.eventCenter || {};
    if (!wx.eventCenter.on) {
      wx.eventCenter.callbacks = {};
      wx.eventCenter.on = function(eventName, callback) {
        this.callbacks[eventName] = this.callbacks[eventName] || [];
        this.callbacks[eventName].push(callback);
      };
      wx.eventCenter.emit = function(eventName, data) {
        const callbacks = this.callbacks[eventName] || [];
        callbacks.forEach(callback => callback(data));
      };
    }

    // 注册事件监听器
    wx.eventCenter.on('loadSoupWithDialog', this.handleLoadSoupWithDialog.bind(this));
  },

  /**
   * 处理加载汤面和对话的事件
   * @param {Object} data 包含 soupId 和 dialogId 的对象
   */
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
      const soupData = await soupService.getSoup(data.soupId);
      if (!soupData) {
        throw new Error('无法获取汤面数据');
      }

      // 初始化汤面数据和页面状态
      await this.initSoupData(soupData);

      // 如果有dialogId，预加载对话记录并切换到喝汤状态
      if (data.dialogId) {
        try {
          // 获取用户ID
          const userId = await userService.getUserId();
          if (!userId) {
            throw new Error('无法获取用户ID');
          }

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
            // 加载完成后直接切换到喝汤状态，无需使用setTimeout
            this.switchToDrinking();
          }
        } catch (error) {
          console.error('预加载对话记录失败:', error);
          // 即使预加载失败，也尝试切换到喝汤状态
          this.switchToDrinking();
        }
      }
    } catch (error) {
      console.error('加载汤面失败:', error);
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
   * 切换到喝汤（对话）状态
   * 设置当前汤面ID并显示对话组件
   */
  async switchToDrinking() {
    // 如果已经在喝汤状态，不再重复切换
    if (this.data.pageState === PAGE_STATE.DRINKING) return;

    // 获取当前汤面ID
    const currentSoupId = this.getCurrentSoupId();
    if (!currentSoupId) return;

    try {
      // 获取用户ID
      let userId = await userService.getUserId();

      // 如果没有用户ID，尝试刷新用户信息
      if (!userId) {
        await userService.refreshUserInfo();
        userId = await userService.getUserId();

        if (!userId) {
          throw new Error('无法获取用户ID');
        }
      }

      // 更新页面状态
      this.setData({
        pageState: PAGE_STATE.DRINKING,
        showButtons: false,
        tipVisible: true // 初始化tip模块为显示状态
      });

      // 确保开始喝汤按钮隐藏
      const startButton = this.selectComponent('#startSoupButton');
      if (startButton) {
        startButton.setData({ visible: false });
      }

      // 获取当前对话ID
      const dialogId = dialogService.getCurrentDialogId();

      // 显示对话框并设置必要属性
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        dialog.setData({
          soupId: currentSoupId,
          dialogId: dialogId,
          userId: userId,
          visible: true
        });
      }
    } catch (error) {
      // 显示提示并跳转到个人中心页面
      wx.showModal({
        title: '提示',
        content: '无法获取用户信息，请重新登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/mine/mine'
          });
        }
      });
    }
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

    // 确保开始喝汤按钮显示并重置到初始状态
    const startButton = this.selectComponent('#startSoupButton');
    if (startButton) {
      // 先设置为可见
      startButton.setData({ visible: true });
      // 完全重置按钮状态到idle状态
      startButton.resetButton();
    }
  },

  /**
   * 处理提示模块关闭事件
   */
  onTipModuleClose() {
    // 如果需要在关闭提示模块时执行特定操作，可以在这里添加
    console.log('提示模块已关闭');
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
  onShowTruth(e) {
    const { soupId } = e.detail;
    if (!soupId) return;
    this.switchToTruth(soupId);
  },

  /**
   * 开始喝汤按钮点击事件
   * 处理用户点击开始喝汤按钮的所有逻辑
   */
  async onStartSoup() {
    // 检查用户是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      // 重置按钮状态
      const startButton = this.selectComponent('#startSoupButton');
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
      const startButton = this.selectComponent('#startSoupButton');
      if (startButton) {
        startButton.setLoadingComplete(false);
      }
      return;
    }

    try {
      // 获取用户ID
      let userId = await userService.getUserId();
      if (!userId) {
        // 尝试刷新用户信息
        await userService.refreshUserInfo();
        userId = await userService.getUserId();

        if (!userId) {
          throw new Error('无法获取用户ID');
        }
      }

      // 使用统一的对话加载方法
      await dialogService.loadOrCreateDialog(userId, currentSoupId);

      // 设置按钮加载完成
      const startButton = this.selectComponent('#startSoupButton');
      if (startButton) {
        startButton.setLoadingComplete(true);
      }

      // 切换到喝汤状态
      this.switchToDrinking();
    } catch (error) {
      console.error('开始喝汤失败:', error);

      // 设置按钮加载完成
      const startButton = this.selectComponent('#startSoupButton');
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
    // 不需要额外处理，弹窗会自动关闭
    console.log('用户取消登录');
  },

  // ===== 汤面切换相关 =====
  /**
   * 切换汤面
   * @param {string} direction 切换方向，'next' 或 'previous'
   * @returns {Promise<void>}
   */
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
      const soupId = soupData.soupId || '';
      this.selectComponent('#dialog')?.setData({ soupId });

      // 初始化汤面数据和页面状态
      await this.initSoupData(soupData);

      // 重置UI状态（无需使用nextTick，因为initSoupData是异步的，已经确保数据加载完成）
      this.setData({
        swipeFeedback: false,  // 关闭滑动反馈动画
        breathingBlur: false   // 关闭呼吸模糊效果
      });
    } catch (error) {
      console.error('切换汤面失败:', error);
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
      (this.data.currentSoup.soupId || '') : '';
  },

  // ===== 设置相关 =====
  /**
   * 处理设置变更事件
   * @param {Object} e 事件对象
   */
  handleSettingChange() {
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

  // 长按功能已移至dialog组件

  /**
   * 处理收藏状态变更事件
   * 从soup-display组件传递上来的事件
   * @param {Object} e 事件对象
   */
  handleFavoriteChange(e) {
    const { isFavorite } = e.detail;

    // 更新页面状态
    this.setData({
      isFavorite: isFavorite
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
   * 处理标签切换事件
   * @param {Object} e 事件对象
   */
  async handleTabChange(e) {
    const { tab } = e.detail;
    // 删除调试日志

    // 更新当前激活的标签
    this.setData({ activeTab: tab });

    try {
      // 设置加载状态，但不启用模糊效果
      this.setData({
        isLoading: true
        // 移除 breathingBlur: true，避免标签切换时触发模糊效果
      });

      // 获取对应标签的汤
      let soups = await soupService.getSoupList({ tags: tab });

      // 如果有汤数据，随机选择一个
      if (soups && soups.length > 0) {
        const randomIndex = Math.floor(Math.random() * soups.length);
        const randomSoup = soups[randomIndex];

        // 更新对话组件
        const soupId = randomSoup.soupId || '';
        this.selectComponent('#dialog')?.setData({ soupId });

        // 初始化汤面数据和页面状态
        await this.initSoupData(randomSoup);
      } else {
        wx.showToast({
          title: '没有找到相关汤',
          icon: 'none'
        });

        // 重置加载状态
        this.setData({
          isLoading: false
          // 保持与上面设置一致，不设置 breathingBlur
        });
      }
    } catch (error) {
      console.error('加载汤面失败:', error);
      this.showErrorToast('加载失败，请重试');
      this.setData({
        isLoading: false
        // 保持与上面设置一致，不设置 breathingBlur
      });
    }
  },

  /**
   * 处理汤数据变更事件
   * @param {Object} e 事件对象
   */
  async handleSoupChange(e) {
    const { soup } = e.detail;
    if (!soup) return;

    // 更新对话组件
    const soupId = soup.soupId || '';
    this.selectComponent('#dialog')?.setData({ soupId });

    // 初始化汤面数据和页面状态
    await this.initSoupData(soup);
  },

  /**
   * 处理汤加载状态变更事件
   * @param {Object} e 事件对象
   */
  handleSoupLoading(e) {
    const { loading } = e.detail;

    // 只设置加载状态，不设置模糊效果
    this.setData({
      isLoading: loading
      // 移除 breathingBlur: loading，避免触发模糊效果
    });
  },

  // 点赞功能已移除，仅显示点赞数

  // getUnsolvedSoupCount方法已移至tab-switcher组件

  // 页面结束
});