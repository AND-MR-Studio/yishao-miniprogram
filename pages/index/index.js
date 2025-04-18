const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');

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
    isPeeking: false, // 添加偷看状态
    showSetting: false // 设置面板显示状态
  },

  async onLoad() {
    try {
      this.setData({ isLoading: true });

      // 在小程序初始化时加载汤面ID列表，每天只需要加载一次
      await soupService.loadSoupIds();

      // 获取随机汤面数据
      const soupData = await soupService.getRandomSoup();
      if (!soupData) {
        throw new Error('无法获取汤面数据');
      }

      // 更新页面状态
      this.setData({
        isLoading: false,
        showButtons: true
      });

      // 获取用户设置
      const settings = wx.getStorageSync('soupSettings') || {};
      const skipAnimation = settings.skipAnimation || false;

      // 更新汤面显示组件
      const soupDisplay = this.selectComponent('#soupDisplay');
      if (soupDisplay) {
        // 设置静态模式（根据用户设置）
        soupDisplay.setData({
          staticMode: skipAnimation,
          autoPlay: !skipAnimation
        });

        // 更新汤面数据
        // 如果跳过动画，直接显示完整内容
        // 否则显示打字机动画
        soupDisplay.updateSoupData(soupData, skipAnimation);
      }
    } catch (error) {
      console.error('初始化汤面数据失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      this.setData({
        isLoading: false,
        showButtons: false
      });
    }
  },

  /**
   * 切换到喝汤（对话）状态
   */
  switchToDrinking() {
    // 如果已经在喝汤状态，不再重复切换
    if (this.data.pageState === PAGE_STATE.DRINKING) return;

    // 获取当前汤面ID
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (!soupDisplay) return;

    const currentSoupId = soupDisplay.getCurrentSoupId();
    if (!currentSoupId) return;

    // 立即完成打字机动画
    soupDisplay.showCompleteContent();

    // 设置当前汤面ID到dialogService
    dialogService.setCurrentSoupId(currentSoupId);

    // 先更新页面状态
    this.setData({
      pageState: PAGE_STATE.DRINKING,
      showButtons: false
    });

    // 显示对话框
    wx.nextTick(() => {
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        // 记录日志，便于调试
        console.log('切换到喝汤状态，当前汤面ID:', currentSoupId);

        // 先设置 soupId，再设置 visible，确保能正确加载对话历史
        dialog.setData({
          soupId: currentSoupId || '',
          visible: true
        });
      }
    });
  },

  /**
   * 切换到汤底状态
   */
  async switchToTruth(soupId, truthData) {
    if (!truthData && soupId) {
      truthData = await soupService.getSoupById(soupId);
    }

    this.setData({
      pageState: PAGE_STATE.TRUTH,
      truthSoupId: soupId,
      truthData: truthData
    });
  },

  /**
   * 处理对话组件关闭事件
   */
  onDialogClose() {
    this.setData({
      pageState: PAGE_STATE.VIEWING,
      showButtons: true
    });
  },

  /**
   * 处理显示汤底事件
   */
  onShowTruth(e) {
    const { soupId } = e.detail;
    if (!soupId) return;
    this.switchToTruth(soupId);
  },

  /**
   * 开始喝汤按钮点击事件
   */
  onStartSoup() {
    if (this.data.pageState === PAGE_STATE.TRUTH) {
      this.setData({
        pageState: PAGE_STATE.VIEWING,
        showButtons: true
      });
      return;
    }
    this.switchToDrinking();
  },

  /**
   * 处理偷看事件
   */
  onPeekSoup(e) {
    const { isPeeking } = e.detail;
    this.setData({ isPeeking });
  },

  /**
   * 下一个按钮点击事件
   */
  async onNextSoup() {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      // 获取当前汤面ID
      const soupDisplay = this.selectComponent('#soupDisplay');
      const currentSoupId = soupDisplay ? soupDisplay.getCurrentSoupId() : this.data.currentSoupId;

      // 获取下一个汤面ID
      const nextSoupId = await soupService.getNextSoupId(currentSoupId);
      if (!nextSoupId) {
        throw new Error('无法获取下一个汤面');
      }

      // 直接从服务器获取汤面数据
      const soupData = await soupService.getSoupById(nextSoupId);
      if (!soupData) {
        throw new Error('无法获取汤面数据');
      }

      // 获取用户设置
      const settings = wx.getStorageSync('soupSettings') || {};
      const skipAnimation = settings.skipAnimation || false;

      // 更新汤面显示组件
      if (soupDisplay) {
        // 设置静态模式（根据用户设置）
        soupDisplay.setData({
          staticMode: skipAnimation,
          autoPlay: !skipAnimation
        });

        // 使用公开方法更新汤面数据
        // 如果设置为跳过动画，则直接显示完整内容
        soupDisplay.updateSoupData(soupData, skipAnimation);
      }

      // 更新对话组件的soupId
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        dialog.setData({ soupId: nextSoupId || '' });
      }

      // 更新dialogService中的soupId
      dialogService.setCurrentSoupId(nextSoupId);

      this.setData({
        pageState: PAGE_STATE.VIEWING,
        isLoading: false
      });

      console.log('切换到下一个汤面，当前汤面ID:', nextSoupId);
    } catch (error) {
      console.error('切换下一个汤面失败:', error);
      wx.showToast({
        title: '切换失败，请重试',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  onShareAppMessage() {
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: '/pages/index/index'
    };
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1  // 第二个tab是喝汤页面
      })
    }
  },

  /**
   * 处理对话组件消息状态变化事件
   */
  onMessageStatusChange(e) {
    const { status, message } = e.detail;
    console.log(`消息状态变化: ${status}`, message);
    // 可以根据消息状态变化执行相应操作
    // 例如更新UI、播放提示音等
  },

  /**
   * 处理设置变更事件
   */
  handleSettingChange(e) {
    const { type, value } = e.detail;
    // 将设置保存到本地存储
    try {
      const settings = wx.getStorageSync('soupSettings') || {};
      settings[type] = value;
      wx.setStorageSync('soupSettings', settings);
    } catch (error) {
      console.error('保存设置失败:', error);
    }

    // 处理跳过动画设置
    if (type === 'skipAnimation') {
      const soupDisplay = this.selectComponent('#soupDisplay');
      if (soupDisplay) {
        // 设置汤面组件的静态模式和自动播放属性
        soupDisplay.setData({
          staticMode: value,
          autoPlay: !value
        });

        // 如果跳过动画开关打开，直接显示完整内容
        if (value && soupDisplay.data.currentSoup) {
          soupDisplay.showCompleteContent();
        } else if (!value && soupDisplay.data.currentSoup) {
          // 如果开关关闭，重置并开始动画
          soupDisplay.resetAnimation();
          soupDisplay.startAnimation();
        }
      }
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
  }
});