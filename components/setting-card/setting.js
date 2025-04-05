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
    fontSize: 'medium', // 当前选中的字体大小
    // 字体大小选项
    fontSizeOptions: [
      { label: '小', value: 'small', scaleFactor: 0.85 },
      { label: '中', value: 'medium', scaleFactor: 1.0 },
      { label: '大', value: 'large', scaleFactor: 1.2 }
    ],
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

      // 初始化设置状态
      this.loadSettings();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 加载设置
    loadSettings() {
      try {
        const settings = wx.getStorageSync('soupSettings') || {};
        this.setData({
          soundOn: settings.soundOn ?? true,
          vibrationOn: settings.vibrationOn ?? false,
          skipAnimation: settings.skipAnimation ?? false,
          fontSize: settings.fontSize || 'medium'
        });
      } catch (e) {
        console.error('读取设置失败:', e);
      }
    },

    // 保存设置
    saveSettings() {
      try {
        const settings = {
          soundOn: this.data.soundOn,
          vibrationOn: this.data.vibrationOn,
          skipAnimation: this.data.skipAnimation,
          fontSize: this.data.fontSize
        };
        wx.setStorageSync('soupSettings', settings);
      } catch (e) {
        console.error('保存设置失败:', e);
      }
    },

    // 设置字体大小
    setFontSize(e) {
      if (e.detail && e.detail.value) {
        const option = this.data.fontSizeOptions.find(option => option.value === e.detail.value);
        if (!option) return;
        
        this.triggerVibration();
        
        if (this.data.fontSize !== option.value) {
          this.setData({ fontSize: option.value }, () => {
            // 保存设置
            this.saveSettings();
            
            // 触发事件
            this.triggerEvent('fontsizechange', {
              size: option.value,
              scaleFactor: option.scaleFactor
            });
          });
        }
      } else {
        // 兼容原有的点击事件处理方式
        const index = e.currentTarget.dataset.index;
        if (index == null || index < 0 || index >= this.data.fontSizeOptions.length) return;
        
        const option = this.data.fontSizeOptions[index];
        
        // 触发震动
        this.triggerVibration();
        
        // 只有选择不同的值时才更新
        if (this.data.fontSize !== option.value) {
          this.setData({ fontSize: option.value });
          
          // 触发事件，传递字体大小相关信息
          this.triggerEvent('fontsizechange', {
            size: option.value,
            scaleFactor: option.scaleFactor
          });
        }
      }
    },
    
    // 获取当前字体大小的缩放因子
    getCurrentFontScale() {
      const currentOption = this.data.fontSizeOptions.find(
        option => option.value === this.data.fontSize
      );
      return currentOption ? currentOption.scaleFactor : 1.0;
    },
    
    // 触发震动反馈
    triggerVibration() {
      if (!this.data.vibrationOn) return;
      
      wx.vibrateShort({
        fail: () => {}
      });
    },
    
    // 切换开关
    toggleSwitch(e) {
      const { type, checked } = e.detail;
      if (!type) return;
      
      // 更新对应的状态
      this.setData({ [type]: checked }, () => {
        // 保存设置
        this.saveSettings();
        
        // 当开启振动或其他开关切换为true时触发震动
        if (this.data.vibrationOn && (type === 'vibrationOn' || checked)) {
          this.triggerVibration();
        }
        
        // 触发事件通知父组件
        this.triggerEvent('switchchange', { type, value: checked });
      });
    },
    
    // 放弃当前海龟汤
    abandonSoup() {
      this.triggerVibration();
      
      wx.showModal({
        title: '提示',
        content: '确定要放弃当前海龟汤吗？这不会重置提问次数哦',
        success: (res) => {
          if (res.confirm) {
            this.triggerVibration();
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
      this.triggerVibration();
      
      wx.showModal({
        title: '提示',
        content: '确定要清理缓存吗？',
        success: (res) => {
          if (res.confirm) {
            this.triggerVibration();
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
        this.triggerVibration();
        this.closeWithAnimation();
      } else {
        // 否则恢复原位 - 不触发震动
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
      this.triggerVibration();
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
      this.triggerVibration();
      this.triggerEvent('contact');
    },
    
    // 点击关于
    onAbout() {
      this.triggerVibration();
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