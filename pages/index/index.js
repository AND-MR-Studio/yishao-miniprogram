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
    currentSoupId: '',
    isLoading: true,
    showButtons: false,
    isPeeking: false // 添加偷看状态
  },

  async onLoad() {
    try {
      this.setData({ isLoading: true });
      
      if (!soupService.isDataLoaded) {
        await soupService.loadSoupsAsync();
      }

      const soupData = await soupService.getSoupDataAsync();
      if (soupData) {
        this.setData({ 
          currentSoupId: soupData.id,
          isLoading: false,
          showButtons: true
        });
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
    if (!this.data.currentSoupId) return;
    
    // 立即完成打字机动画
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      soupDisplay._showCompleteContent();
    }
    
    this.setData({
      pageState: PAGE_STATE.DRINKING,
      showButtons: false
    });

    // 显示对话框
    wx.nextTick(() => {
      const dialog = this.selectComponent('#dialog');
      if (dialog) {
        dialog.setData({ visible: true });
      }
    });
  },
  
  /**
   * 切换到汤底状态
   */
  switchToTruth(soupId, truthData) {
    if (!truthData && soupId) {
      truthData = soupService.getSoupById(soupId);
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
    
    // 更新汤面显示组件的偷看状态
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      soupDisplay.setData({ isPeeking });
    }
  },

  /**
   * 下一个按钮点击事件
   */
  async onNextSoup() {
    if (this.data.isLoading) return;

    try {
      const nextSoupId = soupService.getNextSoupId(this.data.currentSoupId);
      if (!nextSoupId) {
        throw new Error('无法获取下一个汤面');
      }

      // 更新汤面显示组件
      const soupDisplay = this.selectComponent('#soupDisplay');
      if (soupDisplay) {
        await new Promise((resolve) => {
          soupDisplay.setData({ soupId: nextSoupId }, () => {
            soupDisplay.loadSoupData();
            resolve();
          });
        });
      }

      this.setData({ 
        currentSoupId: nextSoupId,
        pageState: PAGE_STATE.VIEWING
      });
    } catch (error) {
      console.error('切换下一个汤面失败:', error);
      wx.showToast({
        title: '切换失败，请重试',
        icon: 'none'
      });
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
  }
});