const dialogService = require('../../utils/dialogService');
const typeAnimation = require('../../utils/typeAnimation');

Component({
  properties: {
    messages: {
      type: Array,
      value: []
    },
    // 是否启用打字机效果
    enableTyping: {
      type: Boolean,
      value: true
    },
    // 打字机速度
    typeSpeed: {
      type: Number,
      value: 60
    }
  },
  
  data: {
    displayLines: [],
    isAnimating: false,
    animatingMessageIndex: -1 // 当前正在执行动画的消息索引
  },

  lifetimes: {
    attached() {
      // 初始化打字机动画实例
      this.typeAnimator = typeAnimation.createInstance(this, {
        typeSpeed: this.properties.typeSpeed,
        onAnimationComplete: () => {
          this.setData({ isAnimating: false });
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

  methods: {
    /**
     * 处理用户消息并生成回复
     */
    async handleUserMessage(content) {
      if (!content || !content.trim()) {
        return;
      }

      // 创建用户消息对象
      const userMessage = {
        type: 'user',
        content: content.trim()
      };

      // 添加用户消息
      const messages = [...this.data.messages, userMessage];
      await new Promise(resolve => {
        this.setData({ messages }, resolve);
      });

      // 生成回复
      const reply = dialogService.generateReply();
      
      if (!this.properties.enableTyping) {
        // 不使用打字机效果时，直接添加完整回复
        const finalMessages = [...messages, {
          type: 'normal',
          content: reply.content
        }];
        
        this.setData({ messages: finalMessages });
        this.triggerEvent('messagesChange', { messages: finalMessages });
        return;
      }
      
      // 使用打字机效果
      const updatedMessages = [...messages, {
        type: 'normal',
        content: ''
      }];
      
      this.setData({ 
        messages: updatedMessages,
        animatingMessageIndex: updatedMessages.length - 1,
        isAnimating: true
      });

      // 启动打字机动画
      await this.typeAnimator.start(reply.content);
      
      // 动画完成后更新消息内容
      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = {
        type: 'normal',
        content: reply.content
      };
      
      this.setData({ 
        messages: finalMessages,
        animatingMessageIndex: -1
      });
      
      this.triggerEvent('messagesChange', { messages: finalMessages });
    },

    /**
     * 设置消息列表
     */
    setMessages(messages) {
      this.setData({ messages: messages || [] });
    },

    /**
     * 获取当前消息列表
     */
    getMessages() {
      return this.data.messages;
    }
  }
});