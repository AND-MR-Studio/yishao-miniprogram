/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理用户交互、管理页面状态
 */
// ===== 导入依赖 =====
const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');
const userService = require('../../utils/userService');
const { createInteractionManager, SWIPE_DIRECTION } = require('../../utils/interactionManager');

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

    // 交互相关 - 由interactionManager管理
    swiping: false, // 是否正在滑动中
    swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
    swipeFeedback: false, // 滑动反馈动画
    swipeStarted: false, // 是否开始滑动
    blurAmount: 0, // 模糊程度（0-10px）
  },

  // ===== 页面属性 =====
  interactionManager: null, // 交互管理器

  // ===== 生命周期方法 =====
  /**
   * 页面加载时执行
   * 获取用户设置并加载汤面
   * @param {Object} options - 页面参数，可能包含soupId和dialogId
   */
  async onLoad(options) {
    // 初始化交互管理器
    this.initInteractionManager();

    // 不再需要获取用户设置，已移除打字机动画相关功能

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
        // 否则获取第一个汤面
        soupData = await soupService.getAdjacentSoup(null, true); // 传入null获取第一个汤面
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

    // 更新汤面显示组件的收藏状态
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      soupDisplay.setData({ isFavorite: isFavorite });
    }

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

      // 如果有dialogId，切换到喝汤状态
      // dialog组件会在visible变为true时自动加载对话记录
      if (data.dialogId) {
        // 等待汤面数据加载完成后切换到喝汤状态
        // 使用短延迟确保UI更新完成
        setTimeout(() => {
          this.switchToDrinking();
        }, 100);
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
    // 销毁交互管理器
    if (this.interactionManager) {
      this.interactionManager.destroy();
      this.interactionManager = null;
    }

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

    // 设置当前汤面ID到dialogService
    dialogService.setCurrentSoupId(currentSoupId);

    // 获取当前对话ID
    const dialogId = dialogService.getCurrentDialogId();

    try {
      // 获取用户ID
      let userId = await userService.getUserId();

      // 如果没有用户ID，尝试刷新用户信息
      if (!userId) {
        await userService.refreshUserInfo();
        userId = await userService.getUserId();

        if (!userId) {
          throw new Error('无法获取用户信息');
        }
      }

      // 更新页面状态
      this.setData({
        pageState: PAGE_STATE.DRINKING,
        showButtons: false
      });

      // 获取对话组件
      const dialog = this.selectComponent('#dialog');
      if (!dialog) {
        console.error('无法获取对话组件');
        return;
      }

      // 一次性设置所有必要属性
      // 注意：dialog组件已优化，会在visible变为true时自动加载对话记录
      dialog.setData({
        soupId: currentSoupId,
        dialogId: dialogId,
        userId: userId,
        visible: true  // 直接设置为可见，组件内部会处理加载和动画
      });

    } catch (error) {
      console.error('切换到喝汤状态失败:', error);

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
    // 获取开始按钮组件
    const startButton = this.selectComponent('.start-button');

    // 检查用户是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      // 未登录状态下，通知按钮重置
      if (startButton) {
        startButton.setLoadingComplete(false);
      }

      // 显示登录提示
      wx.showModal({
        title: '侦探大人，想喝海龟汤吗？',
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
          throw new Error('无法获取用户信息');
        }
      }

      // 设置当前汤面ID到dialogService
      dialogService.setCurrentSoupId(currentSoupId);

      // 获取或创建对话
      const dialogData = await dialogService.getUserDialog(userId, currentSoupId);

      // 如果没有对话ID，则创建新对话
      let dialogId = dialogData.dialogId;
      if (!dialogId) {
        const newDialogData = await dialogService.createDialog(userId, currentSoupId);
        dialogId = newDialogData.dialogId;
      }

      // 设置当前对话ID到dialogService
      if (dialogId) {
        dialogService.setCurrentDialogId(dialogId);
      }

      // 通知按钮加载完成
      if (startButton) {
        startButton.setLoadingComplete();
      }

      // 切换到喝汤状态 - 会自动显示dialog组件并加载对话记录
      this.switchToDrinking();

    } catch (error) {
      console.error('开始喝汤失败:', error);

      // 即使出错也尝试切换到喝汤状态
      if (startButton) {
        startButton.setLoadingComplete();
      }

      this.switchToDrinking();
    }
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
      const soupId = soupData.soupId || '';
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
      (this.data.currentSoup.soupId || '') : '';
  },

  /**
   * 增加汤面阅读数并更新用户浏览记录
   * @param {string} soupId 汤面ID
   */
  async incrementSoupViewCount(soupId) {
    if (!soupId) return;

    try {
      // 增加汤面阅读数
      await soupService.viewSoup(soupId);

      // 更新用户浏览过的汤记录
      await userService.updateViewedSoup(soupId);
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

  // ===== 交互相关 =====
  /**
   * 初始化交互管理器
   */
  initInteractionManager() {
    // 创建交互管理器，提供滑动和双击回调
    this.interactionManager = createInteractionManager({
      setData: this.setData.bind(this),
      onSwipeLeft: this.handleSwipe.bind(this, 'next'),
      onSwipeRight: this.handleSwipe.bind(this, 'previous'),
      onDoubleTap: this.toggleFavorite.bind(this)
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
    // 只有在查看状态且不在加载中时才允许交互
    const canInteract = this.data.pageState === PAGE_STATE.VIEWING && !this.data.isLoading;
    this.interactionManager?.[method](e, canInteract);
  },

  // 使用简化的通用处理函数
  touchStart(e) { this.handleTouch('handleTouchStart', e); },
  touchMove(e) { this.handleTouch('handleTouchMove', e); },
  touchEnd(e) { this.handleTouch('handleTouchEnd', e); },

  /**
   * 切换收藏状态
   * 收藏或取消收藏当前汤面
   */
  async toggleFavorite() {
    // 获取当前汤面ID
    const soupId = this.getCurrentSoupId();
    if (!soupId) return;

    // 检查用户是否已登录
    if (!userService.checkLoginStatus()) {
      return;
    }

    try {
      // 获取当前收藏状态的反向值
      const newFavoriteStatus = !this.data.isFavorite;

      // 调用用户服务更新收藏状态
      const result = await userService.updateFavoriteSoup(soupId, newFavoriteStatus);

      if (result && result.success) {
        // 更新页面状态
        this.setData({ isFavorite: newFavoriteStatus });

        // 更新汤面显示组件的收藏状态
        const soupDisplay = this.selectComponent('#soupDisplay');
        if (soupDisplay) {
          soupDisplay.setData({ isFavorite: newFavoriteStatus });
        }

        // 更新汤面的点赞数
        if (newFavoriteStatus) {
          // 如果是收藏，增加点赞数
          await soupService.likeSoup(soupId);

          // 显示收藏成功提示
          wx.showToast({
            title: '收藏成功',
            icon: 'none',
            duration: 1500
          });
        } else {
          // 显示取消收藏提示
          wx.showToast({
            title: '已取消收藏',
            icon: 'none',
            duration: 1500
          });
        }
      }
    } catch (error) {

      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none',
        duration: 2000
      });
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
  }

  // 页面结束
});