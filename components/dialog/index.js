// components/dialog/index.js
// 只保留打字机动画工具
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
    isAnimating: false, // 用于打字机动画
    typingText: '', // 简化版打字机文本
    animatingMessageIndex: -1, // 当前正在执行动画的消息索引
    peekMode: false, // 是否处于偷看模式
    scrollToView: 'scrollBottom' // 滚动到底部的视图ID
  },

  lifetimes: {
    attached() {
      wx.onKeyboardHeightChange(res => {
        this.setData({ keyboardHeight: res.height });
      });

      // 初始化简化版打字机动画实例
      this.typeAnimator = simpleTypeAnimation.createInstance(this, {
        typeSpeed: this.properties.typeSpeed,
        batchSize: 1, // 每个字符触发一次setData，平衡性能和动画效果
        onComplete: () => {
          this.setData({ isAnimating: false });
          // 动画完成后确保滚动到底部
          this.scrollToBottom(true);
        },
        onUpdate: () => {
          // 每次打字机更新时强制滚动到底部，忽略节流
          this.scrollToBottom(true);
        }
      });
    },

    detached() {
      // 组件销毁时清理打字机动画资源
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
      }
    }
  },

  observers: {
    'messages': function(messages) {
      // 当messages变化且不为空时，滚动到底部
      if (messages && messages.length > 0) {
        this.setData({
          scrollToView: 'scrollBottom'
        }, () => {
          this.scrollToBottom();
        });
      }
    },
    'isPeeking': function(isPeeking) {
      // 当isPeeking属性变化时，更新组件的peekMode状态
      this.setData({ peekMode: isPeeking });
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
     * 为指定消息添加打字机动画效果
     * 简化版：只对AI助手消息应用动画，自行管理动画状态
     *
     * @param {number} messageIndex - 要添加动画效果的消息索引
     * @returns {Promise<void>} 动画完成的Promise
     */
    async animateMessage(messageIndex) {
      // 检查索引是否有效
      if (messageIndex < 0 || messageIndex >= this.properties.messages.length) {
        console.error('无效的消息索引:', messageIndex);
        return;
      }

      // 获取要动画的消息
      const message = this.properties.messages[messageIndex];
      if (!message || !message.content) {
        console.error('消息内容为空:', message);
        return;
      }

      // 只对AI助手消息应用动画
      if (message.role !== 'assistant') {
        console.log('跳过非agent消息的打字机动画:', message.role);
        return;
      }

      // 设置动画状态
      this.setData({
        isAnimating: true,
        animatingMessageIndex: messageIndex,
        typingText: ''
      });

      try {
        // 执行打字机动画
        await this.typeAnimator.start(message.content);
      } catch (error) {
        console.error('打字机动画失败:', error);
      } finally {
        // 动画完成后重置状态
        this.setData({
          isAnimating: false,
          animatingMessageIndex: -1
        });
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
