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
    // 监听 isPeeking 状态变化，自动控制提示显示
    'isPeeking': function(isPeeking) {
      // 当不在偷看状态时显示提示
      if (!isPeeking) {
        rootStore.tipStore.visible = true;
      } else {
        // 偷看时隐藏提示
        rootStore.tipStore.visible = false;
      }
    }
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

      // 绑定 chatStore 的 isPeeking 状态
      this.chatStoreBindings = createStoreBindings(this, {
        store: rootStore.chatStore,
        fields: ['isPeeking']
      });
    },    detached() {
      // 清理MobX绑定
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
      if (this.chatStoreBindings) {
        this.chatStoreBindings.destroyStoreBindings();
      }
    }
  }
});
