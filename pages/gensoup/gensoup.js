// index.js
Page({
  _positionMap: new Map(), // 直接在页面对象创建时初始化Map
  _screenInfo: null,  // 存储屏幕信息

  data: {
    bubbles: [
      { id: 1, left: 0, top: 0, text: '荒诞' },
      { id: 2, left: 0, top: 0, text: '搞笑' },
      { id: 3, left: 0, top: 0, text: '惊悚' },
      { id: 4, left: 0, top: 0, text: '人物' },
      { id: 5, left: 0, top: 0, text: '未知' }
    ],
    existingPositions: [],
    isJelly: false  // 控制果冻效果
  },

  onLoad: function() {
    // 确保existingPositions被初始化
    this.setData({
      existingPositions: [] // 初始化为空数组
    });
    
    // 获取并存储屏幕信息
    this._getScreenInfo();
    
    console.log('Position map initialized:', this._positionMap);
  },
  
  // 获取屏幕信息
  _getScreenInfo() {
    try {
      // 使用推荐的新API获取屏幕信息
      const windowInfo = wx.getWindowInfo();
      const deviceInfo = wx.getDeviceInfo();
      const appBaseInfo = wx.getAppBaseInfo();
      
      this._screenInfo = {
        width: windowInfo.windowWidth,
        height: windowInfo.windowHeight,
        midHeight: windowInfo.windowHeight / 2, // 屏幕中线位置
        tabBarHeight: 48,
        navBarHeight: 44 + (appBaseInfo.statusBarHeight || 20)
      };
      
      console.log('Screen info:', this._screenInfo);
    } catch (error) {
      console.error('获取屏幕信息失败:', error);
      // 默认值
      this._screenInfo = {
        width: 375,
        height: 667,
        midHeight: 334, // 屏幕中线位置
        tabBarHeight: 48,
        navBarHeight: 64
      };
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0  // 第一个tab是煮汤页面
      });
    }
  },

  // 更高效地更新气泡位置
  _updateBubblePosition(index, left, top) {
    // 安全检查，确保Map已初始化
    if (!this._positionMap) {
      console.error('Position map is undefined, reinitializing...');
      this._positionMap = new Map();
    }

    const key = `bubbles[${index}].left`;
    const key2 = `bubbles[${index}].top`;
    
    // 只更新需要改变的字段，而不是整个数组
    const data = {};
    data[key] = left;
    data[key2] = top;
    
    // 记录位置到Map中更高效
    this._positionMap.set(index, { left, top });
    
    // 一次性更新多个属性
    this.setData(data);
    
    // 同步更新existingPositions，确保下一个气泡能获取到最新位置
    const existingPositions = this._getAllPositions();
    this.setData({ existingPositions });
  },

  // 获取当前所有位置
  _getAllPositions() {
    // 安全检查，确保Map已初始化
    if (!this._positionMap) {
      console.error('Position map is undefined, reinitializing...');
      this._positionMap = new Map();
      return [];
    }

    const positions = [];
    this._positionMap.forEach((value) => {
      positions.push(value);
    });
    return positions;
  },

  // 处理气泡初始化事件
  onBubbleInit(e) {
    const { index, left, top } = e.detail;
    console.log('Bubble init:', index, left, top);
    
    if (index < 0 || index >= this.data.bubbles.length) return;
    
    // 更新单个位置更高效
    this._updateBubblePosition(index, left, top);
    
    // 只有在所有气泡都初始化后才更新existingPositions的日志
    if (this._positionMap.size === this.data.bubbles.length) {
      console.log('All bubbles initialized with non-overlapping positions');
    }
  },

  // 处理气泡触摸事件
  onBubbleTouch() {
    // 简化，移除不必要的逻辑
  },

  // 处理气泡移动事件
  onBubbleMove(e) {
    const { index, left, top } = e.detail;
    
    if (index < 0 || index >= this.data.bubbles.length) return;
    
    // 更新单个气泡位置更高效
    this._updateBubblePosition(index, left, top);
  },

  // 处理气泡释放事件
  onBubbleRelease(e) {
    const { index, left, top } = e.detail;
    
    if (index < 0 || index >= this.data.bubbles.length) return;
    
    // 更新单个气泡位置
    this._updateBubblePosition(index, left, top);
    
    // 检查是否在屏幕下半部分释放
    if (this._screenInfo && top > this._screenInfo.midHeight) {
      console.log('气泡在下半屏释放，触发果冻效果');
      this.triggerJellyEffect();
    }
  },

  // 处理锅点击事件
  onPotTap() {
    this.triggerJellyEffect();
  },
  
  // 触发果冻效果
  triggerJellyEffect() {
    this.setData({ isJelly: true });
    
    // 600ms后移除果冻效果（动画持续时间）
    setTimeout(() => {
      this.setData({ isJelly: false });
    }, 600);
  }
})
