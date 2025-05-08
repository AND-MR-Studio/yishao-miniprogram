/**
 * 汤面显示组件
 * 负责汤面内容的渲染
 * 不包含交互逻辑，交互由父页面控制
 */

// 引入MobX store和绑定工具
const { store } = require('../../stores/soupStore');
const { createStoreBindings } = require('mobx-miniprogram-bindings');

Component({
  properties: {
    // 汤面ID
    soupId: {
      type: String,
      value: ''
    },

    // 是否处于偷看模式
    isPeeking: {
      type: Boolean,
      value: false
    },

    // 是否处于喝汤状态
    isDrinking: {
      type: Boolean,
      value: false
    },

    // 模糊程度（0-10px）
    blurAmount: {
      type: Number,
      value: 0
    },

    // 是否启用呼吸模糊效果
    breathingBlur: {
      type: Boolean,
      value: false
    },

    // 页面状态：viewing, drinking, truth
    pageState: {
      type: String,
      value: 'viewing'
    },
  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  data: {
    // 组件内部数据
    soupData: {}, // 汤面数据
    isInitialized: false, // 标记组件是否已初始化
    breathingBlur: false // 呼吸模糊效果，由isLoading状态控制
  },

  lifetimes: {
    // 组件初始化
    attached() {
      this._isAttached = true;

      // 创建MobX Store绑定 - 只读取数据，不更新store
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: ['soupData', 'isLoading']
      });

      // 标记组件已初始化
      this.setData({ isInitialized: true });
    },

    // 组件卸载
    detached() {
      this._isAttached = false;

      // 清理MobX绑定
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
    }
  },

  // 属性变化观察者
  observers: {
    // 监听isLoading状态变化
    'isLoading': function(isLoading) {
      if (this._isAttached) {
        // 通知页面组件加载状态变化
        this.triggerEvent('loading', { loading: isLoading });

        // 直接控制breathingBlur动画
        this.setData({
          breathingBlur: isLoading // 加载中时启用呼吸模糊效果
        });
      }
    },

    // 监听store.soupData变化
    'store.soupData': function(soupData) {
      if (this._isAttached && soupData) {
        console.log('汤面数据已更新:', soupData.title);
        this.setData({ soupData });
      }
    }
  },

  methods: {
    /**
     * 设置偷看状态
     * 由父页面调用，用于控制偷看功能
     * @param {boolean} isPeeking 是否处于偷看状态
     */
    setPeekingStatus(isPeeking) {
      this.triggerEvent(isPeeking ? 'longPressStart' : 'longPressEnd');
    },

    /**
     * 处理长按开始事件
     */
    handleLongPressStart() {
      // 触发长按开始事件
      this.triggerEvent('longPressStart');
    },

    /**
     * 处理长按结束事件
     */
    handleLongPressEnd() {
      // 触发长按结束事件
      this.triggerEvent('longPressEnd');
    },

    /**
     * 处理加载状态变化
     * 当MobX store中的isLoading状态变化时触发
     * @deprecated 已在observer中直接处理，保留此方法以兼容现有代码
     */
    handleLoadingChange() {
      // 已在observer中直接处理，此方法保留以兼容现有代码
    }
  }
});
