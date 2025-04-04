// components/setting-card/setting.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    soundOn: true,
    vibrationOn: false,
    skipAnimation: false, // 跳过动画开关
    fontSize: 'medium', // 'small', 'medium', 'large'
    statusBarHeight: 0,
    // 拖拽相关变量
    startY: 0,
    moveY: 0,
    moveDistance: 0,
    panelStyle: '',
    isDragging: false,
    // 关闭阈值
    closeThreshold: 200
  },

  lifetimes: {
    attached() {
      // 获取状态栏高度
      const { statusBarHeight } = wx.getWindowInfo();
      this.setData({ statusBarHeight });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 切换开关
    toggleSwitch(e) {
      const { type, checked } = e.detail;
      this.setData({
        [type]: checked
      });
      
      this.triggerEvent('switchchange', { type, value: checked });
    },
    
    // 放弃当前海龟汤
    abandonSoup() {
      wx.showModal({
        title: '提示',
        content: '确定要放弃当前海龟汤吗？这不会重置提问次数哦',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('abandon');
            wx.showToast({
              title: '已放弃当前海龟汤',
              icon: 'success',
              duration: 1500
            });
          }
        }
      });
    },
    
    // 清理缓存
    clearCache() {
      wx.showModal({
        title: '提示',
        content: '确定要清理缓存吗？',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('clearcache');
            wx.showToast({
              title: '缓存已清理',
              icon: 'success',
              duration: 1500
            });
          }
        }
      });
    },
    
    // 处理自定义radio按钮的变化
    handleRadioChange(e) {
      const { value } = e.detail;
      this.setData({
        fontSize: value
      });
      
      this.triggerEvent('fontsizechange', { size: value });
    },
    
    // 下拉开始
    handleTouchStart(e) {
      if (!this.data.show) return;
      this.setData({
        startY: e.touches[0].clientY,
        isDragging: true
      });
    },
    
    // 下拉过程
    handleTouchMove(e) {
      if (!this.data.show || !this.data.isDragging) return;
      
      const moveY = e.touches[0].clientY;
      const moveDistance = moveY - this.data.startY;
      
      // 只处理下拉，忽略上拉
      if (moveDistance <= 0) {
        this.setData({
          panelStyle: '',
          moveDistance: 0
        });
        return;
      }
      
      // 计算阻尼效果，下拉越多阻力越大
      const damping = 0.6;
      const translateY = Math.pow(moveDistance, damping);
      
      this.setData({
        moveY: moveY,
        moveDistance: moveDistance,
        panelStyle: `transform: translateY(${translateY}rpx);`
      });
    },
    
    // 下拉结束
    handleTouchEnd() {
      if (!this.data.show || !this.data.isDragging) return;
      
      this.setData({
        isDragging: false
      });
      
      // 如果下拉距离超过阈值，关闭面板
      if (this.data.moveDistance > this.data.closeThreshold) {
        this.closeWithAnimation();
      } else {
        // 否则恢复原位
        this.setData({
          panelStyle: 'transform: translateY(0); transition: transform 0.3s ease-out;'
        });
        
        // 延时清除过渡效果
        setTimeout(() => {
          this.setData({
            panelStyle: ''
          });
        }, 300);
      }
    },
    
    // 点击指示器关闭
    handleDragIndicator() {
      this.closeWithAnimation();
    },
    
    // 带动画关闭面板
    closeWithAnimation() {
      // 先下拉一点距离
      this.setData({
        panelStyle: 'transform: translateY(60rpx); transition: transform 0.1s ease-out;'
      });
      
      // 然后完全下拉
      setTimeout(() => {
        this.setData({
          panelStyle: 'transform: translateY(100%); transition: transform 0.3s ease-in;'
        });
        
        // 最后关闭面板并重置样式
        setTimeout(() => {
          this.closePanel();
          setTimeout(() => {
            this.setData({
              moveDistance: 0,
              panelStyle: ''
            });
          }, 100);
        }, 250);
      }, 100);
    },
    
    // 关闭设置面板
    closePanel() {
      this.setData({
        show: false
      });
      this.triggerEvent('close');
    },
    
    // 联系我们
    contactUs() {
      this.triggerEvent('contact');
    },
    
    // 点击关于
    onAbout() {
      this.triggerEvent('about');
    },
    
    // 阻止蒙层的触摸事件穿透
    preventTouchMove() {
      return false;
    },
    
    // 阻止事件冒泡
    stopPropagation() {
      return false;
    }
  }
})