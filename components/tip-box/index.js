// components/tip-box/index.js
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { tipStore, chatStore, TIP_STATE } = require('../../stores/index');

Component({
  /**
   * 组件的初始数据
   */
  data: {
    // 当前显示的提示内容
    currentTipContent: []
  },

  /**
   * 数据监听器
   */
  observers: {
    'content': function(newContent) {
      if (newContent && Array.isArray(newContent)) {
        this.animateTipChange(newContent);
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
    attached() {
      // 创建tipStore绑定 - 只绑定需要展示的字段
      this.tipStoreBindings = createStoreBindings(this, {
        store: tipStore,
        fields: ['visible', 'title', 'content', 'state']
      });

      // 创建chatStore绑定 - 仅获取isPeeking状态
      this.chatStoreBindings = createStoreBindings(this, {
        store: chatStore,
        fields: ['isPeeking']
      });

      // 初始化当前内容
      if (this.content && Array.isArray(this.content)) {
        this.setData({
          currentTipContent: this.content.map(item => {
            return typeof item === 'string'
              ? { text: item, isScrollingOut: false }
              : { ...item, isScrollingOut: false };
          })
        });
      }
    },

    detached() {
      // 清理MobX绑定
      if (this.tipStoreBindings) {
        this.tipStoreBindings.destroyStoreBindings();
      }

      // 清理chatStore绑定
      if (this.chatStoreBindings) {
        this.chatStoreBindings.destroyStoreBindings();
      }
    }
  },

  /**
   * 组件方法 - 只保留动画相关方法
   */
  methods: {
    // 执行滚轮动画切换提示内容
    animateTipChange(newContent) {
      // 标记当前内容为滚出状态
      const oldContent = this.data.currentTipContent.map(item => {
        return typeof item === 'string'
          ? { text: item, isScrollingOut: true }
          : { ...item, isScrollingOut: true };
      });

      this.setData({
        currentTipContent: oldContent
      });

      // 等待滚出动画完成后，设置新内容
      setTimeout(() => {
        // 设置新内容（从下方滚入）
        this.setData({
          currentTipContent: newContent.map(item => {
            return typeof item === 'string'
              ? { text: item, isScrollingOut: false }
              : { ...item, isScrollingOut: false };
          })
        });
      }, 500);
    }
  }
});
