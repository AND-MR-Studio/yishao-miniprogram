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

    // 页面加载后，延迟一下确保组件已挂载，然后主动加载汤面数据
    setTimeout(() => {
      this._initSoupDisplay();
    }, 100);
  },

  /**
   * 初始化汤面展示组件
   * @private
   */
  _initSoupDisplay() {
    // 获取汤面展示组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (!soupDisplay) return;

    // 如果没有指定soupId或当前组件没有显示内容，则主动加载数据
    if (!soupDisplay.data.currentSoup) {
      soupDisplay.loadSoupData();
    }
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
      // 读取设置失败
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

    // 每次显示页面时，检查汤面组件是否有内容，没有则初始化
    setTimeout(() => {
      const soupDisplay = this.selectComponent('#soupDisplay');
      if (soupDisplay && !soupDisplay.data.currentSoup) {
        this._initSoupDisplay();
      }
    }, 100);
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

    // 获取当前选择的汤面ID
    const soupId = soupDisplay.data.soupId;
    
    // 通过URL参数将soupId传递到对话页面
    wx.switchTab({
      url: '/pages/dialog/dialog',
      success: () => {
        // 使用页面实例方法来传递参数给dialog页面
        const dialogPage = getCurrentPages().find(page => page.route === 'pages/dialog/dialog');
        if (dialogPage) {
          // 如果能获取到页面实例，直接设置参数
          dialogPage.setSoupId(soupId);
        } else {
          // 如果获取不到页面实例，使用全局变量暂存soupId
          getApp().globalData = getApp().globalData || {};
          getApp().globalData.pendingSoupId = soupId;
        }
      }
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

    // 获取当前汤面组件实例
    const soupDisplay = this.selectComponent('#soupDisplay');
    if (!soupDisplay) return;

    // 重置动画
    soupDisplay.resetAnimation();
    
    // 获取当前汤面ID
    const currentSoupId = soupDisplay.data.soupId;
    
    // 获取下一个汤面ID
    const nextSoupId = soupService.getNextSoupId(currentSoupId);
    
    // 设置新的soupId
    this.setData({
      'soupConfig.soupId': nextSoupId
    }, () => {
      // 加载新汤面数据
      soupDisplay.loadSoupData();
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
        this.setData({
          showButtons: true
        });
      }
    }
  }
});