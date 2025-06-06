// components/tip-box/index.js
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { rootStore } = require('../../stores/index');
const { assets } = require('../../config/api');

Component({
  /**
   * 组件的初始数据
   */
  data: {
    assets
  },  /**
   * 数据监听器
   */
  observers: {
  },

  /**
   * 组件样式隔离
   */
  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {      // 创建tipStore绑定 - 绑定所有需要的字段
      this.storeBindings = createStoreBindings(this, {
        store: rootStore.tipStore,
        fields: ['visible', 'title', 'content', 'tipState']
      });

    },    detached() {
      // 清理MobX绑定
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
    }
  }
});
