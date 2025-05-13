// components/start-soup-button/index.js
// 引入MobX store和绑定工具
const { store } = require('../../stores/soupStore');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮文本
    text: {
      type: String,
      value: '开始喝汤'
    },
    // 按钮宽度
    width: {
      type: String,
      value: '50%'
    },
    // 按钮高度
    height: {
      type: String,
      value: '80rpx'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    buttonLoading: false // 按钮自身的加载状态，独立于MobX的isLoading
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 按钮点击事件
    handleTap() {
      // 如果正在加载，不处理点击
      if (this.isLoading || this.data.buttonLoading) {
        return;
      }

      // 立即设置按钮为加载状态
      this.setData({
        buttonLoading: true
      });

      // 触发tap事件，由父组件处理业务逻辑
      this.triggerEvent('tap');

      // 设置一个超时，如果5秒后仍在加载，则自动重置
      this._loadingTimeout = setTimeout(() => {
        this.setData({
          buttonLoading: false
        });
      }, 5000);
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 创建MobX Store绑定
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: ['isLoading', 'soupState'],
      });
    },

    detached() {
      // 清理超时计时器
      if (this._loadingTimeout) {
        clearTimeout(this._loadingTimeout);
        this._loadingTimeout = null;
      }

      // 清理MobX绑定
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
    }
  }
})
