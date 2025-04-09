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
    showButtons: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 初始化设置
    this.initSettings();

    // 确保按钮初始状态为隐藏
    this.setData({
      showButtons: false
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
        this.setData({
          showButtons: true
        });
      }
    } catch (e) {
      console.error('读取设置失败:', e);
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    // 分享逻辑
    return {
      title: '这个海龟汤太难了来帮帮我！',
      path: '/pages/index/index'
    };
  },

  /**
   * 汤面动画完成回调 - 控制按钮显示
   */
  onSoupAnimationComplete() {
    // 显示按钮
    this.setData({
      showButtons: true
    });
  },

  /**
   * 开始喝汤按钮点击事件
   */
  onStartSoup() {
    // 获取当前汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (!soupDisplay) return;

    // 先设置当前选择的汤面ID
    const soupId = soupDisplay.data.soupId;
    dialogService.setCurrentSoupId(soupId);

    // 跳转到对话页面
    wx.switchTab({
      url: '/pages/dialog/dialog'
    });
  },

  /**
   * 下一个按钮点击事件
   */
  onNextSoup() {
    // 隐藏按钮
    this.setData({
      showButtons: false
    });

    // 先刷新服务器数据，然后重置组件状态
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (soupDisplay) {
      // 先重置动画
      soupDisplay.resetAnimation();
      
      // 刷新服务器数据后加载新的汤面
      soupService.refreshSoups(() => {
        soupDisplay.loadSoupData();
      });
    }
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
        this.setData({
          showButtons: true
        });
      }
    }
  }
});