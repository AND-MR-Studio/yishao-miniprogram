// components/tip-module/index.js
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { tipStore } = require('../../stores/tipStore');
const { chatStore } = require('../../stores/chatStore');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示提示模块 - 兼容旧版API，新版使用tipStore.visible
    visible: {
      type: Boolean,
      value: false,
      observer: function(newVal) {
        if (newVal) {
          // 当组件变为可见时，启动闲置计时器
          this.startIdleTimer();
        } else {
          // 当组件隐藏时，清除闲置计时器
          this.clearIdleTimer();
        }
      }
    },
    // 提示标题 - 兼容旧版API，新版使用tipStore.title
    tipTitle: {
      type: String,
      value: '汤来了！我是陪你熬夜猜谜的小勺🌙'
    },
    // 提示内容 - 兼容旧版API，新版使用tipStore.content
    tipContent: {
      type: Array,
      value: [
        '只答是、否、不确定，别想套我话哦～',
        '长按汤面就浮出来咯！'
      ]
    },
    // 页面状态
    pageState: {
      type: String,
      value: 'drinking',
      observer: function(newVal, oldVal) {
        // 当页面状态变为truth时，显示祝贺消息
        if (newVal === 'truth' && oldVal !== 'truth') {
          this.showCongratulationTip();
        }
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    animationData: {},
    // 当前显示的提示内容
    currentTipContent: [
      '只答是、否、不确定，别想套我话哦～',
      '长按汤面就浮出来咯！'
    ]
  },

  /**
   * 数据监听器
   */
  observers: {
    'content': function(newContent) {
      if (newContent && Array.isArray(newContent)) {
        this.contentObserver(newContent);
      }
    },
    'visible': function(newVisible) {
      this.handleVisibleChange(newVisible);
    },
    'isPeeking': function(isPeeking) {
      // 当偷看状态变化时，触发可见性变化事件
      if (isPeeking) {
        // 如果开始偷看，清除闲置计时器
        this.clearIdleTimer();
      } else if (this.visible || this.data.visible) {
        // 如果结束偷看且提示应该可见，重新启动闲置计时器
        this.startIdleTimer();
      }

      // 触发可见性变化事件
      this.triggerEvent('visibleChange', { visible: !isPeeking && (this.visible || this.data.visible) });
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
      // 创建tipStore绑定
      this.tipStoreBindings = createStoreBindings(this, {
        store: tipStore,
        fields: [
          'visible', 'title', 'content',
          'isSwitchingContent', 'showingIdleTip'
        ],
        actions: [
          'showTip', 'hideTip', 'resetTipContent', 'setDefaultTip',
          'startIdleTimer', 'resetIdleTimer', 'clearIdleTimer',
          'showIdleTip', 'showCongratulationTip', 'showSpecialTip'
        ]
      });

      // 创建chatStore绑定 - 仅获取isPeeking状态
      this.chatStoreBindings = createStoreBindings(this, {
        store: chatStore,
        fields: ['isPeeking']
      });

      // 设置默认提示内容
      if (this.properties.tipContent && this.properties.tipContent.length > 0) {
        this.setDefaultTip(this.properties.tipTitle, this.properties.tipContent);
      }

      // 启动闲置计时器
      if (this.properties.visible || this.visible) {
        this.startIdleTimer();
      }
    },
    detached() {
      // 清除计时器
      this.clearIdleTimer();

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
   * 组件方法
   */
  methods: {
    // 处理可见性变化
    handleVisibleChange(visible) {
      // 触发可见性变化事件
      this.triggerEvent('visibleChange', { visible });

      // 如果变为可见，启动闲置计时器
      if (visible) {
        this.startIdleTimer();
      } else {
        this.clearIdleTimer();
      }
    },

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
    },

    // 观察content变化，更新动画
    contentObserver(newContent) {
      if (newContent && Array.isArray(newContent)) {
        this.animateTipChange(newContent);
      }
    }
  }
});
