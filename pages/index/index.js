const soupService = require('../../utils/soupService');
const dialogService = require('../../utils/dialogService');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 页面配置
    soupConfig: {
      soupId: 'default_001',  // 不指定则随机获取
      autoPlay: true,  // 是否自动播放动画
      staticMode: false  // 静态模式(不显示动画)
    },
    // 控制按钮显示
    showButtons: false,
    // 汤底相关
    showTruth: false,  // 是否显示汤底组件
    truthSoupId: '',  // 汤底对应的soupId
    truthData: null,   // 汤底数据
    isCorrect: false,   // 是否猜对了汤底（用于控制组件切换）
    _isSwitchingSoup: false  // 防止重复点击
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad() {
    this.initSettings();
    this.setData({ showButtons: false });
    this._isSwitchingSoup = false;

    try {
      await soupService.refreshSoupsAsync();
      await this.initSoupDisplay();
    } catch (error) {
      console.error('初始化汤面数据失败:', error);
    }
  },

  /**
   * 初始化汤面展示组件
   */
  async initSoupDisplay() {
    return new Promise((resolve) => {
      wx.nextTick(() => {
        const soupDisplay = this.selectComponent('#soupDisplay');
        if (soupDisplay && !soupDisplay.data.currentSoup) {
          soupDisplay.loadSoupData();
        }
        resolve();
      });
    });
  },

  // 初始化设置
  initSettings() {
    try {
      const settings = wx.getStorageSync('soupSettings') || {};
      this.setData({
        'soupConfig.staticMode': settings.skipAnimation || false
      });

      // 如果开启了静态模式，直接显示按钮
      if (settings.skipAnimation) {
        this.setData({ showButtons: true });
      }
    } catch (e) {
      console.error('读取设置失败:', e);
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }

    // 检查全局变量，是否需要显示汤底
    const app = getApp();
    if (app.globalData && app.globalData.showTruth) {
      await this.handleShowTruth(app);
    } else {
      this.setData({ showTruth: false });
      await this.initSoupDisplay();
    }
  },

  /**
   * 处理显示汤底逻辑
   */
  async handleShowTruth(app) {
    // 清除全局标志，防止再次进入此逻辑
    app.globalData.showTruth = false;
    
    // 设置显示汤底并标记为已猜对
    this.setData({
      showTruth: true,
      isCorrect: true,
      truthSoupId: app.globalData.truthSoupId || '',
      truthData: app.globalData.truthData || null,
      showButtons: true
    });
    
    await this.ensureTruthData(app);
  },

  /**
   * 确保汤底数据完整
   */
  async ensureTruthData(app) {
    return new Promise((resolve) => {
      wx.nextTick(() => {
        // 只有当数据不完整且有soupId时才尝试加载
        if ((!app.globalData.truthData || !app.globalData.truthData.truth) && app.globalData.truthSoupId) {
          // 同步获取数据
          const soupData = soupService.getSoupById(app.globalData.truthSoupId);
          if (soupData) {
            this.setData({ truthData: soupData });
            app.globalData.truthData = soupData;
            
            // 获取组件并设置数据
            const soupTruth = this.selectComponent('#soupTruth');
            if (soupTruth) {
              soupTruth.setCurrentSoup(soupData);
            }
            resolve();
            return;
          }
        }
        
        // 如果已有完整数据，直接设置到组件
        if (app.globalData.truthData && app.globalData.truthData.truth) {
          const soupTruth = this.selectComponent('#soupTruth');
          if (soupTruth) {
            soupTruth.setCurrentSoup(app.globalData.truthData);
          }
        }
        resolve();
      });
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: '/pages/index/index'
    };
  },

  /**
   * 汤面动画完成回调 - 控制按钮显示
   */
  onSoupAnimationComplete() {
    this.setData({ showButtons: true });
  },

  /**
   * 开始喝汤按钮点击事件
   */
  async onStartSoup() {
    // 如果当前显示的是汤底，点击按钮时先清除汤底显示状态
    if (this.data.isCorrect || this.data.showTruth) {
      this.setData({
        showTruth: false,
        isCorrect: false,
        truthSoupId: '',
        truthData: null
      });
      
      await this.initSoupDisplay();
      return;
    }
    
    // 获取当前汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (!soupDisplay) return;

    // 获取当前选择的汤面ID并传递到对话页面
    const soupId = soupDisplay.data.soupId;
    wx.switchTab({
      url: '/pages/dialog/dialog',
      success: () => {
        const dialogPage = getCurrentPages().find(page => page.route === 'pages/dialog/dialog');
        if (dialogPage) {
          dialogPage.setSoupId(soupId);
        } else {
          getApp().globalData = getApp().globalData || {};
          getApp().globalData.pendingSoupId = soupId;
        }
      }
    });
  },

  /**
   * 下一个按钮点击事件
   */
  async onNextSoup() {
    // 防止重复点击
    if (this._isSwitchingSoup) {
      return;
    }
    this._isSwitchingSoup = true;
    
    try {
      // 如果正在显示汤底，切换回汤面显示
      if (this.data.isCorrect || this.data.showTruth) {
        await this.switchFromTruthToSoup();
        return;
      }
      
      // 隐藏按钮
      this.setData({ showButtons: false });

      // 获取当前汤面组件实例
      const soupDisplay = this.selectComponent('#soupDisplay');
      if (!soupDisplay) {
        this._isSwitchingSoup = false;
        return;
      }

      // 重置动画
      soupDisplay.resetAnimation();
      
      // 获取当前汤面ID
      const currentSoupId = soupDisplay.data.soupId;
      
      // 确保数据已加载
      if (!soupService.isDataLoaded) {
        await soupService.refreshSoupsAsync();
      }
      
      await this.switchToNextSoup(currentSoupId, soupDisplay);
    } finally {
      // 延迟解除锁定
      setTimeout(() => {
        this._isSwitchingSoup = false;
      }, 500);
    }
  },

  /**
   * 从汤底视图切换到汤面视图
   */
  async switchFromTruthToSoup() {
    this.setData({
      showTruth: false,
      isCorrect: false,
      truthSoupId: '',
      truthData: null
    });
    
    // 等待下一个渲染周期
    await new Promise(resolve => wx.nextTick(resolve));
    await this.initSoupDisplay();
    
    // 如果是静态模式，直接显示按钮
    if (this.data.soupConfig.staticMode) {
      this.setData({ showButtons: true });
    }
    this._isSwitchingSoup = false;
  },

  /**
   * 切换到下一个汤面
   */
  async switchToNextSoup(currentSoupId, soupDisplay) {
    return new Promise((resolve) => {
      // 获取下一个汤面ID
      const nextSoupId = soupService.getNextSoupId(currentSoupId);
      
      // 设置新的soupId
      this.setData({
        'soupConfig.soupId': nextSoupId
      }, () => {
        // 加载新汤面数据
        soupDisplay.loadSoupData();
        resolve();
      });
    });
  },

  /**
   * 处理设置变化
   */
  handleSettingChange(e) {
    const { type, value } = e.detail;
    if (type === 'skipAnimation') {
      // 更新静态模式
      this.setData({
        'soupConfig.staticMode': value
      });

      // 如果开启了跳过动画，直接显示按钮
      if (value && !this.data.showButtons) {
        this.setData({ showButtons: true });
      }
    }
  }
});