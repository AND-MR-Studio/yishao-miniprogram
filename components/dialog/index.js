// components/dialog/index.js
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { rootStore } = require('../../stores/index');
const simpleTypeAnimation = require('../../utils/typeAnimation');

Component({
  properties: {
    // 打字机速度
    typeSpeed: {
      type: Number,
      value: 60
    }
  },

  data: {
    scrollToView: 'scrollBottom',
    typingText: ''
  },

  lifetimes: {
    attached() {      // 绑定 MobX 状态
      this.storeBindings = createStoreBindings(this, {
        store: rootStore.chatStore,
        fields: [
          'messages',
          'userMessages',
          'agentMessages',
          'chatState',
          'isPeeking',
          'shouldShowTyping'
        ],
        actions: ['completeAnimation']
      });

      // 初始化打字机动画
      this.typeAnimator = simpleTypeAnimation.createInstance(this, {
        typeSpeed: this.properties.typeSpeed,
        batchSize: 1,
        onComplete: () => {
          this.completeAnimation();
          this.scrollToBottom();
        },
        onUpdate: (text) => {
          this.setData({ typingText: text });
          this.scrollToBottom();
        }
      });
    },

    detached() {
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
      }
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
    }
  },

  observers: {
    // 监听打字机动画触发
    'shouldShowTyping, agentMessages': function (shouldShowTyping, agentMessages) {
      if (shouldShowTyping && agentMessages && agentMessages.length > 0) {
        const lastMessage = agentMessages[agentMessages.length - 1];
        if (lastMessage && lastMessage.content) {
          wx.nextTick(() => {
            this.startTypingAnimation(lastMessage.content);
          });
        }
      }
    },    // 监听消息变化，自动滚动到底部
    'messages': function () {
      wx.nextTick(() => {
        this.scrollToBottom();
      });
    }
  },

  methods: {
    // 滚动到底部
    scrollToBottom() {
      this.setData({
        scrollToView: 'scrollBottom'
      });
    },

    // 开始打字机动画
    async startTypingAnimation(content) {
      if (!content) return;

      this.setData({ typingText: '' });

      try {
        await this.typeAnimator.start(content);
      } catch (error) {
        console.error('打字机动画执行失败:', error);
        this.completeAnimation();
      }
    },

    // 处理关闭事件
    handleClose() {
      this.triggerEvent('close');
    }
  }
});
