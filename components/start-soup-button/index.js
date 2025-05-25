// components/start-soup-button/index.js
// 引入MobX store和绑定工具
const { soupStore } = require('../../stores/index');
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
    // 移除本地的buttonLoading状态，使用store中的状态
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 按钮点击事件
    handleTap() {
      // 如果正在加载，不处理点击
      if (this.soupLoading || this.buttonLoading) {
        return;
      }

      // 立即设置按钮为加载状态 - 使用store方法
      this.toggleButtonLoading(true);

      // 触发tap事件，由父组件处理业务逻辑
      this.triggerEvent('tap');
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 创建MobX Store绑定
      this.storeBindings = createStoreBindings(this, {
        store: soupStore,
        fields: ['soupLoading', 'buttonLoading'],
        actions: ['toggleButtonLoading'],
      });
    },

    detached() {
      // 清理MobX绑定
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
    }
  }
})
