// components/bubble/index.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    index: {
      type: Number,
      value: 0
    },
    left: {
      type: Number,
      value: 0
    },
    top: {
      type: Number,
      value: 0
    },
    existingPositions: {
      type: Array,
      value: []
    },
    bubbleText: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentLeft: 0,
    currentTop: 0,
    isDragging: false,
    isVisible: true,
    isAnimating: false,
    active: false,
    animationDelay: 0
  },

  lifetimes: {
    // 在组件实例进入页面节点树时执行
    attached() {
      // 获取系统信息一次性存储
      this._screenInfo = this._getScreenInfo();
      // 初始化气泡位置
      this._initPosition();
      
      // 设置随机动画延迟
      this._setRandomAnimationDelay();

      // 预创建动画实例，提高性能
      this.fadeAnimation = wx.createAnimation({
        duration: 500,
        timingFunction: 'ease'
      });
    },
    
    // 在组件实例被从页面节点树移除时执行
    detached() {
      // 清理工作
      this._timers && this._timers.forEach(timer => clearTimeout(timer));
      this._timers = [];
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 设置随机动画延迟，使气泡错开浮动
     */
    _setRandomAnimationDelay() {
      // 根据index设置不同的延迟，或使用随机值
      // 固定延迟：index * 0.6s
      // 或随机延迟：0-3s之间的随机值
      const delay = this.properties.index * 0.6; 
      // 或随机延迟：const delay = Math.random() * 3;
      
      this.setData({
        animationDelay: delay
      });
    },

    /**
     * 获取屏幕信息
     * @returns {Object} 返回屏幕信息
     */
    _getScreenInfo() {
      try {
        // 使用推荐的新API替代废弃的API
        const windowInfo = wx.getWindowInfo();
        const deviceInfo = wx.getDeviceInfo();
        const appBaseInfo = wx.getAppBaseInfo();
        
        return {
          width: windowInfo.windowWidth,
          height: windowInfo.windowHeight,
          tabBarHeight: 48,
          navBarHeight: 44 + (appBaseInfo.statusBarHeight || 20)
        };
      } catch (error) {
        console.error('获取屏幕信息失败:', error);
        return {
          width: 375,
          height: 667,
          tabBarHeight: 48,
          navBarHeight: 64
        };
      }
    },

    /**
     * 初始化气泡位置
     */
    _initPosition() {
      const position = this._generatePosition();
      this._updatePosition(position.left, position.top);
      this._triggerInit(position);
    },

    /**
     * 生成不重叠位置 (优化算法)
     * @returns {Object} 返回生成的位置
     */
    _generatePosition() {
      const bubbleSize = 80;
      const minDistance = 90;
      const { width, height, navBarHeight, tabBarHeight } = this._screenInfo;
      const existingPositions = this.properties.existingPositions || [];
      
      // 只使用上半屏幕的空间
      const availableHeight = Math.floor((height - navBarHeight) / 2);
      
      // 简化的网格式布局，避免过多循环计算
      const grid = {
        cols: Math.floor(width / minDistance),
        rows: Math.floor(availableHeight / minDistance)
      };

      // 尝试使用网格定位减少循环次数
      for (let attempt = 0; attempt < 50; attempt++) {
        const col = Math.floor(Math.random() * grid.cols);
        const row = Math.floor(Math.random() * grid.rows);
        
        // 计算位置，添加随机偏移量增加自然感
        const left = (col * minDistance) + Math.random() * 20;
        const top = (row * minDistance) + navBarHeight + Math.random() * 20;
        
        // 边界检查
        if (left > width - bubbleSize) continue;
        if (top > navBarHeight + availableHeight - bubbleSize) continue;
        
        // 检查是否与现有气泡重叠
        let overlapping = false;
        for (const pos of existingPositions) {
          if (!pos) continue;
          const distance = Math.sqrt(
            Math.pow(left - pos.left, 2) + Math.pow(top - pos.top, 2)
          );
          if (distance < minDistance) {
            overlapping = true;
            break;
          }
        }
        
        if (!overlapping) {
          return { left, top };
        }
      }
      
      // 兜底随机位置，仍然限制在上半屏幕
      return {
        left: Math.random() * (width - bubbleSize),
        top: Math.random() * (availableHeight - bubbleSize) + navBarHeight
      };
    },

    /**
     * 更新位置，减少setData调用
     * @param {Number} left 新的left位置
     * @param {Number} top 新的top位置
     */
    _updatePosition(left, top) {
      this.setData({
        currentLeft: left,
        currentTop: top
      });
      this._lastLeft = left;
      this._lastTop = top;
    },

    /**
     * 触发初始化事件
     * @param {Object} position 生成的位置
     */
    _triggerInit(position) {
      this.triggerEvent('bubbleinit', {
        index: this.properties.index,
        left: position.left,
        top: position.top
      });
    },

    /**
     * 记录定时器
     * @param {Number} timer 要记录的定时器
     * @returns {Number} 返回记录的定时器
     */
    _addTimer(timer) {
      if (!this._timers) this._timers = [];
      this._timers.push(timer);
      return timer;
    },

    /**
     * 处理触摸开始事件
     * @param {Object} e 事件对象
     */
    onTouchStart(e) {
      if (this.data.isDragging || this.data.isAnimating) return;
      
      const touch = e.touches[0];
      this._startX = touch.clientX - this.data.currentLeft;
      this._startY = touch.clientY - this.data.currentTop;
      
      this.setData({
        isDragging: true,
        active: true
      });
      
      this.triggerEvent('bubbletouch', {
        index: this.properties.index
      });
    },

    /**
     * 处理触摸移动事件
     * @param {Object} e 事件对象
     */
    onTouchMove(e) {
      if (!this.data.isDragging || this.data.isAnimating) return;

      // 使用节流减少更新频率，提高性能
      if (this._moveTimer) return;
      
      this._moveTimer = this._addTimer(setTimeout(() => {
        this._moveTimer = null;
        
        const touch = e.touches[0];
        const { width, height, navBarHeight, tabBarHeight } = this._screenInfo;
        const bubbleSize = 80;
        
        let newLeft = touch.clientX - this._startX;
        let newTop = touch.clientY - this._startY;
        
        // 边界限制
        newLeft = Math.max(0, Math.min(newLeft, width - bubbleSize));
        newTop = Math.max(
          navBarHeight,
          Math.min(newTop, height - tabBarHeight - bubbleSize)
        );
        
        this._updatePosition(newLeft, newTop);
        
        this.triggerEvent('bubblemove', {
          index: this.properties.index,
          left: newLeft,
          top: newTop
        });
      }, 16)); // 约60fps
    },

    /**
     * 处理触摸结束事件
     */
    onTouchEnd() {
      if (!this.data.isDragging || this.data.isAnimating) return;
      
      const { currentLeft, currentTop } = this.data;
      
      // 批量更新状态，减少setData调用
      this.setData({
        isDragging: false,
        isAnimating: true
      });
      
      // 延迟关闭活跃状态，让果冻效果完成
      this._addTimer(setTimeout(() => {
        this.setData({ active: false });
      }, 600));
      
      this.triggerEvent('bubblerelease', {
        index: this.properties.index,
        left: currentLeft,
        top: currentTop
      });
      
      // 触发消失动画
      this._fadeAndRepositionBubble();
    },
    
    /**
     * 气泡消失并重新定位
     */
    _fadeAndRepositionBubble() {
      // 使用隐藏类控制可见性
      this.setData({ isVisible: false });
      
      // 消失动画完成后重新定位
      this._addTimer(setTimeout(() => {
        const newPosition = this._generatePosition();
        
        // 更新位置（此时不可见）
        this._updatePosition(newPosition.left, newPosition.top);
        
        // 通知父组件位置更新
        this.triggerEvent('bubblemove', {
          index: this.properties.index,
          left: newPosition.left,
          top: newPosition.top
        });
        
        // 延迟后重新显示
        this._addTimer(setTimeout(() => {
          this.setData({
            isVisible: true,
            isAnimating: false
          });
        }, 2000));
      }, 500));
    }
  }
})