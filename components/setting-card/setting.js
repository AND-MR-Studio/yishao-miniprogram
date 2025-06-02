// components/setting-card/setting.js
const { createGestureManager } = require('../../utils/gestureManager');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { chatStore, settingStore } = require('../../stores/index');

Component({

  /**
   * 组件的属性列表
   */
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    pageState: {
      type: String,
      value: ''
    },
  },

  /**
   * 组件的初始数据
   * 注意：soundOn, vibrationOn 现在由 settingStore 通过 MobX 绑定提供
   */
  data: {
    statusBarHeight: 0,
    // 拖拽相关变量 - 供panelDrag工具类使用
    moveDistance: 0,
    panelStyle: '',
    isDragging: false,
    // 防止重复触发标志
    isProcessingContext: false
  },

  lifetimes: {
    attached() {
      // 获取状态栏高度
      const { statusBarHeight } = wx.getWindowInfo();
      this.setData({ statusBarHeight });      // 初始化手势管理器
      this.gestureManager = createGestureManager({
        enablePanelDrag: true,  // 启用面板拖拽功能
        closeThreshold: 200,
        dampingFactor: 0.6,
        onPanelClose: this.handlePanelClose.bind(this),
        onVibrate: this.triggerVibration.bind(this),
        setData: this.setData.bind(this)
      });

      // 创建chatStore绑定
      this.chatStoreBindings = createStoreBindings(this, {
        store: chatStore,
        fields: ['dialogId', 'userId'],
      });      // 创建settingStore绑定 - 管理用户设置和导航功能
      this.settingStoreBindings = createStoreBindings(this, {
        store: settingStore,
        fields: ['soundOn', 'vibrationOn'],
        actions: ['toggleSound', 'toggleVibration', 'clearChatContext', 'handleContact', 'handleAbout', 'handleShowGuide']
      });
    },

    detached() {
      // 清理所有计时器
      if (this.vibrationTimer) {
        clearTimeout(this.vibrationTimer);
        this.vibrationTimer = null;
      }

      // 重置震动状态
      this.isVibrating = false;      // 销毁手势管理器
      if (this.gestureManager) {
        this.gestureManager.destroy();
        this.gestureManager = null;
      }

      // 清理MobX绑定
      if (this.chatStoreBindings) {
        this.chatStoreBindings.destroyStoreBindings();
      }
      if (this.settingStoreBindings) {
        this.settingStoreBindings.destroyStoreBindings();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 触发震动反馈
     * 使用 settingStore 绑定的 vibrationOn 状态
     */
    triggerVibration() {
      // 使用 MobX 绑定的 vibrationOn 状态
      if (!this.vibrationOn) return;

      // 设置防抖标志，防止短时间内重复触发
      if (this.isVibrating) return;
      this.isVibrating = true;

      // 立即执行震动，不使用setTimeout
      wx.vibrateShort({
        fail: () => {
          // 震动失败，静默处理
          console.warn('震动反馈失败');
        },
        complete: () => {
          // 设置一个较短的冷却时间，避免系统震动API被连续调用
          setTimeout(() => {
            this.isVibrating = false;
          }, 100);
        }
      });
    },

    /**
     * 切换设置开关
     * 直接调用 settingStore 的方法，确保数据流向：UI → settingStore → Service
     * @param {Object} e 事件对象
     */
    toggleSwitch(e) {
      const { type, checked } = e.detail;
      if (!type) {
        console.warn('toggleSwitch: 缺少 type 参数');
        return;
      }

      try {
        // 使用 settingStore 的方法更新设置，自动保存到本地存储
        if (type === 'soundOn') {
          this.toggleSound(checked);
        } else if (type === 'vibrationOn') {
          this.toggleVibration(checked);
        } else {
          console.warn(`toggleSwitch: 未知的设置类型 ${type}`);
          return;
        }

        // 只在开启震动开关时触发震动反馈
        if (type === 'vibrationOn' && checked) {
          // 延迟很短的时间再触发震动，避免和按钮自身的动画冲突
          setTimeout(() => {
            this.triggerVibration();
          }, 10);
        }
      } catch (error) {
        console.error('toggleSwitch 失败:', error);
        // 可以在这里添加用户提示
        wx.showToast({
          title: '设置更新失败',
          icon: 'none',
          duration: 1500
        });
      }
    },

    // 清理对话上下文
    async clearContext() {
      // 防止重复触发
      if (this.data.isProcessingContext) {
        return;
      }

      this.triggerVibration();

      // 设置处理标志
      this.setData({ isProcessingContext: true });

      // 检查当前页面状态
      const isChatPage = this.properties.pageState === 'drinking';

      if (!isChatPage) {
        wx.showToast({
          title: '仅在聊天页面可用',
          icon: 'none',
          duration: 1500
        });

        // 立即重置处理标志
        this.setData({ isProcessingContext: false });
        return;
      }

      // 直接从chatStore获取dialogId和userId
      const dialogId = this.dialogId;
      const userId = this.userId;

      if (dialogId && userId) {
        // 显示确认弹窗
        wx.showModal({
          title: '提示',
          content: '确定要清理当前对话上下文吗？这将删除当前对话的所有记录。',
          success: async (res) => {
            if (res.confirm) {
              // 调用settingStore的方法清理上下文
              await this.clearChatContext(dialogId, userId);
            }

            // 重置处理标志
            this.setData({ isProcessingContext: false });
          }
        });
      } else {
        wx.showToast({
          title: '无对话可清理',
          icon: 'none',
          duration: 1500
        });

        // 立即重置处理标志
        this.setData({ isProcessingContext: false });
      }
    },// 下拉开始 - 使用统一手势管理器
    handleTouchStart(e) {
      if (this.gestureManager) {
        this.gestureManager.handleTouchStart(e, { canInteract: this.data.show });
      }
    },

    // 下拉过程 - 使用统一手势管理器
    handleTouchMove(e) {
      if (this.gestureManager) {
        this.gestureManager.handleTouchMove(e, { canInteract: this.data.show });
      }
    },    // 下拉结束 - 使用统一手势管理器
    handleTouchEnd(e) {
      if (this.gestureManager) {
        this.gestureManager.handleTouchEnd(e, { canInteract: this.data.show });
      }
    },

    // 点击指示器关闭
    handleDragIndicator() {
      this.triggerVibration();
      if (this.gestureManager) {
        this.gestureManager.closePanel();
      }
    },

    // 关闭设置面板
    closePanel() {
      this.setData({
        show: false
      });
      this.triggerEvent('close');
    },    // 联系我们
    contactUs() {
      this.triggerVibration();
      // 直接调用settingStore的方法，不再通过事件传递
      this.handleContact();
      // 关闭设置面板
      this.closePanel();
    },

    // 点击关于
    onAbout() {
      this.triggerVibration();
      // 直接调用settingStore的方法，不再通过事件传递
      this.handleAbout();
      // 关闭设置面板
      this.closePanel();
    },

    /**
     * 显示喝汤指南
     * 直接调用settingStore的方法，不再需要事件传递
     */
    showGuide() {
      // 触发震动反馈
      this.triggerVibration();

      // 直接调用settingStore的方法显示引导层
      this.handleShowGuide();

      // 关闭设置面板
      this.closePanel();
    },

    // 阻止蒙层的触摸事件穿透
    preventTouchMove() {
      return false;
    },

    // 阻止事件冒泡 - 在微信小程序中，catchtap已经阻止了冒泡，这个函数只是一个空函数
    stopPropagation() {},

    /**
     * 处理面板关闭
     * 由拖拽管理器调用，确保设置状态已通过 settingStore 自动保存
     */
    handlePanelClose() {
      this.closePanel();
      // 注意：设置现在由 settingStore 自动保存到本地存储，无需手动调用 saveSettings
      // 所有设置变更都通过 MobX 响应式更新，确保状态同步
    }
  }
})