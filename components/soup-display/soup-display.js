/**
 * 汤面显示组件
 * 负责汤面内容的渲染
 * 不包含交互逻辑，交互由父页面控制
 */

// 引入MobX store和绑定工具
const { soupStore } = require('../../stores/soupStore');
const { createStoreBindings } = require('mobx-miniprogram-bindings');

Component({
  properties: {
    // 汤面数据对象
    soupData: {
      type: Object,
      value: null
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

    // 是否正在加载
    loading: {
      type: Boolean,
      value: false
    }
  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  data: {
    // 组件内部数据
    localSoupData: {}, // 本地汤面数据，用于存储从属性或store获取的数据
    isInitialized: false, // 标记组件是否已初始化
    breathingBlur: false, // 呼吸模糊效果，由isLoading状态控制
    isLoading: false // 加载状态
  },

  lifetimes: {
    // 组件初始化
    attached() {
      this._isAttached = true;

      // 创建MobX Store绑定 - 确保使用正确的store对象
      this.storeBindings = createStoreBindings(this, {
        store: soupStore, // 确保这里使用的是soupStore而不是store
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
    // 监听loading状态变化
    'loading': function(loading) {
      if (this._isAttached) {
        // 通知页面组件加载状态变化
        this.triggerEvent('loading', { loading: loading });

        // 直接控制breathingBlur动画
        this.setData({
          breathingBlur: loading, // 加载中时启用呼吸模糊效果
          isLoading: loading
        });
      }
    },

    // 监听传入的soupData属性变化
    'soupData': function(soupData) {
      if (this._isAttached && soupData) {
        console.log('从属性接收汤面数据:', soupData.title);
        this.setData({ localSoupData: soupData });
      }
    },

    // 监听soupstore.soupData变化
    'soupStore.soupData': function(soupData) {
      if (this._isAttached && soupData && !this.properties.soupData) {
        // 只有当没有通过属性传入soupData时，才使用store中的数据
        console.log('从store获取汤面数据:', soupData.title);
        this.setData({ localSoupData: soupData });
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
    }
  }
});
