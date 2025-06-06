// components/dialog/index.js
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { rootStore } = require('../../stores/index');
const simpleTypeAnimation = require('../../utils/typeAnimation');

Component({
  properties: {
    // 对话模式：'single'(单人) 或 'double'(双人)
    mode: {
      type: String,
      value: 'single' // 默认为单人模式
    },
    // 消息列表 - 由父组件传入
    messages: {
      type: Array,
      value: []
    },
    // 当前用户角色 - 用于双人模式
    role: {
      type: String,
      value: 'HOST' // 'HOST' 或 'PARTNER'
    },
    // 主持人ID - 用于双人模式
    hostId: {
      type: String,
      value: ''
    },
    // 是否正在加载
    loading: {
      type: Boolean,
      value: false
    },
    // 打字机速度
    typeSpeed: {
      type: Number,
      value: 60
    },
    // 是否处于偷看模式
    isPeeking: {
      type: Boolean,
      value: false
    }
  },

  data: {
    keyboardHeight: 0,
    scrollToView: 'scrollBottom',
    typingText: '' // 只保留动画文本状态
  },

  lifetimes: {
    attached() {
      // 绑定 MobX 状态
      this.storeBindings = createStoreBindings(this, {
        store: rootStore.chatStore,
        fields: ['messages', 'chatState'],
        actions: ['completeAnimation']
      });

      wx.onKeyboardHeightChange(res => {
        this.setData({ keyboardHeight: res.height });
      });

      // 初始化打字机动画
      this.typeAnimator = simpleTypeAnimation.createInstance(this, {
        typeSpeed: this.properties.typeSpeed,
        batchSize: 1,
        onComplete: () => {
          this.completeAnimation();
          this.scrollToBottom(true);
        },
        onUpdate: (text) => {
          this.setData({ typingText: text });
          this.scrollToBottom(true);
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
    // 消息变化：滚动到底部
    'messages': function(messages) {
      if (messages && messages.length > 0) {
        this.setData({
          scrollToView: 'scrollBottom'
        }, () => {
          this.scrollToBottom();
        });
      }
    },

    // 当有新的AI消息且处于LOADING状态时，自动开始动画
    'messages, chatState': function(messages, chatState) {
      if (messages && messages.length > 0 && chatState === 'loading') {
        const lastMessage = messages[messages.length - 1];
        
        // 只对AI助手消息执行动画
        if (lastMessage.role === 'assistant' && lastMessage.content) {
          wx.nextTick(() => {
            this.startTypingAnimation(lastMessage.content);
          });
        }
      }
    }
  },

  methods: {
    // 滚动到底部 - 优化版，减少setData调用
    scrollToBottom(force = false) {
      // 使用节流技术，避免短时间内多次触发滚动
      // 但如果是强制滚动（如打字机效果中），则忽略节流
      if (this._scrollThrottled && !force) return;

      this._scrollThrottled = true;

      // 使用scroll-into-view属性滚动到底部
      this.setData({
        scrollToView: 'scrollBottom'
      });

      // 100ms后重置节流标志（减少延迟，提高响应速度）
      setTimeout(() => {
        this._scrollThrottled = false;
      }, 100);
    },

    /**
     * 开始打字机动画 - 只对AI消息执行
     */
    async startTypingAnimation(content) {
      this.setData({ typingText: '' });
      
      try {
        await this.typeAnimator.start(content);
      } catch (error) {
        console.error('AI消息动画执行失败:', error);
        this.completeAnimation();
      }
    },

    /**
     * 获取消息样式类
     * 根据消息类型和模式返回适当的样式类
     *
     * @param {Object} message - 消息对象
     * @returns {string} 样式类名
     */
    getMessageClass(message) {
      if (!message) return '';

      // 基础样式类
      let classNames = 'message';

      // 添加状态类
      if (message.status) {
        classNames += ` ${message.status}`;
      }

      if (this.properties.mode === 'single') {
        // 单人模式：区分用户和AI
        classNames += message.role === 'user' ? ' user' : ' response';
      } else {
        // 双人模式：区分自己和对方
        // 根据角色判断是否为当前用户
        const isCurrentUser = this.properties.role === 'HOST' ?
          message.userId === this.properties.hostId :
          message.userId !== this.properties.hostId;

        classNames += isCurrentUser ? ' self' : ' other';
      }

      return classNames;
    },

    /**
     * 处理消息点击事件
     *
     * @param {Object} e - 事件对象
     */
    handleMessageTap(e) {
      const { index } = e.currentTarget.dataset;
      if (index === undefined) return;

      // 获取被点击的消息
      const message = this.properties.messages[index];
      if (!message) return;

      // 触发消息点击事件
      this.triggerEvent('messageTap', {
        message,
        index
      });
    },

    /**
     * 处理消息长按事件
     *
     * @param {Object} e - 事件对象
     */
    handleMessageLongPress(e) {
      const { index } = e.currentTarget.dataset;
      if (index === undefined) return;

      // 获取被长按的消息
      const message = this.properties.messages[index];
      if (!message) return;

      // 触发消息长按事件
      this.triggerEvent('messageLongPress', {
        message,
        index
      });
    },

    /**
     * 格式化消息时间
     *
     * @param {number} timestamp - 时间戳
     * @returns {string} 格式化后的时间字符串
     */
    formatTime(timestamp) {
      if (!timestamp) return '';

      const date = new Date(timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    },

    /**
     * 处理关闭对话事件
     */
    handleClose() {
      this.triggerEvent('close');
    }
  }
});
