// components/setting-card/setting.js
const { createPanelDragManager } = require('../../utils/panelDrag');

Component({

  /**
   * 组件的属性列表
   */
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    soupId: {
      type: String,
      value: ''
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
    // 拖拽相关变量 - 供panelDrag工具类使用
    moveDistance: 0,
    panelStyle: '',
    isDragging: false,
    isVibrating: false
  },

  lifetimes: {
    attached() {
      // 获取状态栏高度
      const { statusBarHeight } = wx.getWindowInfo();
      this.setData({ statusBarHeight });

      // 初始化设置状态
      this.loadSettings();

      // 初始化面板拖拽管理器
      this.panelDragManager = createPanelDragManager({
        closeThreshold: 200, // 直接设置下拉关闭阈值
        dampingFactor: 0.6,
        onClose: this.handlePanelClose.bind(this),
        onVibrate: this.triggerVibration.bind(this),
        setData: this.setData.bind(this)
      });
    },

    detached() {
      // 清理所有计时器
      if (this.vibrationTimer) {
        clearTimeout(this.vibrationTimer);
        this.vibrationTimer = null;
      }

      // 重置震动状态
      this.isVibrating = false;

      // 销毁面板拖拽管理器
      if (this.panelDragManager) {
        this.panelDragManager.destroy();
        this.panelDragManager = null;
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 加载设置 - 只在面板初始化时调用一次
     * 从本地存储读取用户设置并应用到组件
     */
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
        // 读取设置失败
      }
    },

    /**
     * 保存设置 - 只在面板关闭时调用一次
     * 将当前组件的设置状态保存到本地存储
     */
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
        // 保存设置失败
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

      // 设置防抖标志，防止短时间内重复触发
      if (this.isVibrating) return;
      this.isVibrating = true;

      // 立即执行震动，不使用setTimeout
      wx.vibrateShort({
        fail: () => {
          // 震动失败
        },
        complete: () => {
          // 设置一个较短的冷却时间，避免系统震动API被连续调用
          setTimeout(() => {
            this.isVibrating = false;
          }, 100);
        }
      });
    },

    // 切换开关
    toggleSwitch(e) {
      const { type, checked } = e.detail;
      if (!type) return;

      // 更新对应的状态
      this.setData({ [type]: checked }, () => {
        // 只在开启任意开关时触发震动，关闭开关时不触发
        if (this.data.vibrationOn && checked) {
          // 延迟很短的时间再触发震动，避免和按钮自身的动画冲突
          setTimeout(() => {
            this.triggerVibration();
          }, 10);
        }

        // 触发事件通知父组件
        this.triggerEvent('switchchange', { type, value: checked });
      });
    },

    // 放弃当前海龟汤
     abandonSoup(){
      this.triggerVibration();

      wx.showModal({
        title: '提示',
        content: '确定要放弃当前海龟汤吗？这不会重置提问次数哦',
        success: (res) => {
          if (res.confirm) {
            this.triggerVibration();
            
            // 触发放弃事件通知父组件处理后续逻辑
            this.triggerEvent('abandon');
            
            // 显示提示消息
            wx.showToast({
              title: '已放弃当前海龟汤',
              icon: 'success',
              duration: 1500
            });
            
            // 注意：页面跳转和清除对话记录的逻辑已移至dialog.js的handleAbandonSoup中处理
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

    // 下拉开始 - 使用工具类
    handleTouchStart(e) {
      if (this.panelDragManager) {
        this.panelDragManager.handleTouchStart(e, this.data.show);
      }
    },

    // 下拉过程 - 使用工具类
    handleTouchMove(e) {
      if (this.panelDragManager) {
        this.panelDragManager.handleTouchMove(e, this.data.show);
      }
    },

    // 下拉结束 - 使用工具类
    handleTouchEnd() {
      if (this.panelDragManager) {
        this.panelDragManager.handleTouchEnd(this.data.show);
      }
    },

    // 点击指示器关闭
    handleDragIndicator() {
      this.triggerVibration();
      if (this.panelDragManager) {
        this.panelDragManager.closePanel();
      }
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
    },

    // 处理面板关闭
    handlePanelClose() {
      this.closePanel();
      this.saveSettings();
    }
  }
})