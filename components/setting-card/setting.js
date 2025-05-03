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
    },
    pageState: {
      type: String,
      value: 'viewing' // 默认为viewing状态，可选值：viewing, drinking, truth
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    soundOn: true,
    vibrationOn: false,
    statusBarHeight: 0,
    // 拖拽相关变量 - 供panelDrag工具类使用
    moveDistance: 0,
    panelStyle: '',
    isDragging: false,
    isVibrating: false,
    // 防止重复触发标志
    isProcessingContext: false
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
          vibrationOn: settings.vibrationOn ?? false
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
          vibrationOn: this.data.vibrationOn
        };
        wx.setStorageSync('soupSettings', settings);
      } catch (e) {
        // 保存设置失败
      }
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



    // 清理对话上下文
    clearContext() {
      // 防止重复触发
      if (this.data.isProcessingContext) {
        return;
      }

      this.triggerVibration();

      // 设置处理标志
      this.setData({ isProcessingContext: true });

      // 获取当前页面实例
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];

      // 从页面获取当前对话ID
      let dialogId = '';
      if (currentPage && currentPage.selectComponent) {
        const dialog = currentPage.selectComponent('#dialog');
        if (dialog && dialog.properties) {
          dialogId = dialog.properties.dialogId || '';
        }
      }

      if (dialogId) {
        // 触发清理上下文事件，传递dialogId
        this.triggerEvent('clearcontext', { dialogId });

        // 延迟重置处理标志，确保不会短时间内重复触发
        setTimeout(() => {
          this.setData({ isProcessingContext: false });
        }, 1000); // 1秒后重置
      } else {
        wx.showToast({
          title: '无对话可清理',
          icon: 'none',
          duration: 1500
        });

        // 立即重置处理标志
        this.setData({ isProcessingContext: false });
      }
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

    // 阻止事件冒泡 - 在微信小程序中，catchtap已经阻止了冒泡，这个函数只是一个空函数
    stopPropagation() {},

    // 处理面板关闭
    handlePanelClose() {
      this.closePanel();
      this.saveSettings();
    }
  }
})