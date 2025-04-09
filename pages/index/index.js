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
  onLoad() {
    // 初始化设置
    this.initSettings();

    // 确保按钮初始状态为隐藏
    this.setData({
      showButtons: false
    });
    
    // 初始化切换锁定状态
    this._isSwitchingSoup = false;

    // 先从服务器加载最新数据
    soupService.refreshSoups(() => {
      // 页面加载后，延迟一下确保组件已挂载，然后主动加载汤面数据
      setTimeout(() => {
        this._initSoupDisplay();
      }, 100);
    });
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

    // 检查全局变量，是否需要显示汤底
    const app = getApp();
    if (app.globalData && app.globalData.showTruth) {
      console.log('显示汤底模式，数据：', {
        soupId: app.globalData.truthSoupId,
        hasData: !!app.globalData.truthData,
        truth: app.globalData.truthData?.truth
      });
      
      // 重要：先清除全局标志，防止再次进入此逻辑
      app.globalData.showTruth = false;
      
      // 设置显示汤底并标记为已猜对
      this.setData({
        showTruth: true,
        isCorrect: true,
        truthSoupId: app.globalData.truthSoupId || '',
        truthData: app.globalData.truthData || null,
        showButtons: true  // 直接显示按钮
      });
      
      // 在一个单独的setTimeout中处理组件设置，避免循环调用
      setTimeout(() => {
        // 只有当数据不完整且有soupId时才尝试加载
        if ((!app.globalData.truthData || !app.globalData.truthData.truth) && app.globalData.truthSoupId) {
          console.log('汤底数据不完整，尝试一次性加载');
          
          // 同步获取数据，避免异步操作导致的循环
          const soupData = soupService.getSoupById(app.globalData.truthSoupId);
          if (soupData) {
            console.log('直接获取到汤底数据:', soupData);
            this.setData({ truthData: soupData });
            app.globalData.truthData = soupData;
            
            // 获取组件并设置数据
            const soupTruth = this.selectComponent('#soupTruth');
            if (soupTruth) {
              soupTruth.setCurrentSoup(soupData);
            }
            return; // 成功获取数据后直接返回，不执行后续代码
          }
        }
        
        // 如果已有完整数据，直接设置到组件
        if (app.globalData.truthData && app.globalData.truthData.truth) {
          const soupTruth = this.selectComponent('#soupTruth');
          if (soupTruth) {
            soupTruth.setCurrentSoup(app.globalData.truthData);
          }
        }
      }, 100);
    } else {
      // 确保showTruth为false
      this.setData({
        showTruth: false
      });
      
      // 每次显示页面时，检查汤面组件是否有内容，没有则初始化
      setTimeout(() => {
        const soupDisplay = this.selectComponent('#soupDisplay');
        if (soupDisplay && !soupDisplay.data.currentSoup) {
          this._initSoupDisplay();
        }
      }, 100);
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
    // 如果当前显示的是汤底，点击按钮时先清除汤底显示状态
    if (this.data.isCorrect || this.data.showTruth) {
      this.setData({
        showTruth: false,
        isCorrect: false,
        truthSoupId: '',
        truthData: null
      });
      
      // 延迟一下再初始化汤面组件
      setTimeout(() => {
        this._initSoupDisplay();
      }, 100);
      
      return;
    }
    
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
    // 防止重复点击
    if (this._isSwitchingSoup) {
      console.log('正在切换汤面，忽略重复点击');
      return;
    }
    this._isSwitchingSoup = true;
    
    // 如果正在显示汤底，切换回汤面显示
    if (this.data.isCorrect || this.data.showTruth) {
      this.setData({
        showTruth: false,
        isCorrect: false,
        truthSoupId: '',
        truthData: null
      });
      
      // 延迟一下再初始化汤面组件
      setTimeout(() => {
        this._initSoupDisplay();
        
        // 如果是静态模式，直接显示按钮
        if (this.data.soupConfig.staticMode) {
          this.setData({
            showButtons: true
          });
        }
        this._isSwitchingSoup = false;
      }, 100);
      
      return;
    }
    
    // 隐藏按钮
    this.setData({
      showButtons: false
    });

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
      soupService.refreshSoups(() => {
        this._switchToNextSoup(currentSoupId, soupDisplay);
      });
    } else {
      this._switchToNextSoup(currentSoupId, soupDisplay);
    }
  },

  /**
   * 切换到下一个汤面
   * @private
   */
  _switchToNextSoup(currentSoupId, soupDisplay) {
    // 获取下一个汤面ID
    const nextSoupId = soupService.getNextSoupId(currentSoupId);
    console.log('切换到下一个汤面:', nextSoupId);
    
    // 设置新的soupId
    this.setData({
      'soupConfig.soupId': nextSoupId
    }, () => {
      // 加载新汤面数据
      soupDisplay.loadSoupData();
      
      // 延迟解除锁定
      setTimeout(() => {
        this._isSwitchingSoup = false;
        console.log('汤面切换完成，解除锁定');
      }, 500);
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