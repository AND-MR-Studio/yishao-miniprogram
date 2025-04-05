const dialogService = require('../../utils/dialogService');

Component({
  properties: {
    messages: {
      type: Array,
      value: []
    },
    // 当前汤面ID
    soupId: {
      type: String,
      value: ''
    }
  },
  
  data: {
    isReceiving: false, // 是否正在接收消息
  },

  lifetimes: {
    attached() {
      // 组件初始化时，如果没有消息，添加默认的初始消息
      if (this.properties.messages.length === 0) {
        const initialMessages = [
          {
            type: 'system',
            content: '欢迎来到一勺海龟汤。'
          },
          {
            type: 'system',
            content: '你需要通过提问来猜测谜底，'
          },
          {
            type: 'system',
            content: '我只会回答"是"、"否"或"不确定"。'
          }
        ];
        
        this.setData({ messages: initialMessages });
      }
    }
  },

  methods: {
    /**
     * 处理用户消息并生成回复
     * @param {String} content - 用户消息内容
     */
    handleUserMessage(content) {
      if (!content || !content.trim()) {
        wx.showToast({
          title: '请输入内容',
          icon: 'none'
        });
        return;
      }

      // 创建用户消息对象
      const userMessage = {
        type: 'user',
        content: content.trim()
      };

      // 创建消息列表副本
      const messages = [...this.properties.messages, userMessage];

      // 如果输入"提示"，则显示特殊提示信息
      if (content.trim() === '提示') {
        const hintMessage = {
          type: 'system',
          content: '这是一个测试消息',
          hint: '这是一段很长的提示文字，用来测试打字机动画效果。这段文字包含了一些标点符号，比如逗号、句号。还有一些感叹号！问号？以及其他标点符号；冒号：破折号——等等。这些标点符号会有不同的停顿时间，让打字机效果更加自然。'
        };
        messages.push(hintMessage);
        
        // 更新消息并滚动到底部
        this.setData({ messages }, () => {
          this.scrollToBottom();
          // 触发消息更新事件，通知页面
          this.triggerEvent('messagesChange', { messages });
        });
        return;
      }

      // 生成系统回复（简单随机模拟）
      const responses = ['是', '否', '不确定'];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const systemMessage = {
        type: 'system',
        content: randomResponse
      };
      messages.push(systemMessage);

      // 更新消息并滚动到底部
      this.setData({ messages }, () => {
        this.scrollToBottom();
        // 触发消息更新事件，通知页面
        this.triggerEvent('messagesChange', { messages });
      });

      return messages;
    },

    /**
     * 发送消息并处理回复（保留API接口以便未来扩展）
     * @param {Object} message - 用户消息对象 {type: 'user', content: '消息内容'}
     * @param {Object} params - 请求参数
     * @returns {Array} - 返回更新后的消息数组
     */
    async sendMessageToAPI(message, params) {
      try {
        // 设置正在接收状态
        this.setData({ isReceiving: true });
        
        // 创建必要的参数，如果没有提供
        if (!params) {
          params = {
            message: message.content
          };
        }
        
        // 常规请求
        const response = await dialogService.sendMessage(params);
        
        // 创建消息列表副本
        const messages = [...this.properties.messages];
        // 添加用户消息
        messages.push(message);
        // 添加系统回复
        messages.push(response);
        
        // 更新消息并滚动到底部
        this.setData({ 
          messages,
          isReceiving: false 
        }, () => {
          this.scrollToBottom();
          // 触发消息更新事件，通知页面
          this.triggerEvent('messagesChange', { messages });
        });
        
        return messages;
      } catch (error) {
        console.error('发送消息失败:', error);
        this.setData({ isReceiving: false });
        throw error;
      }
    },

    /**
     * 获取当前消息列表
     * @returns {Array} 消息列表
     */
    getMessages() {
      return this.data.messages;
    },

    /**
     * 设置消息列表
     * @param {Array} messages - 消息列表
     */
    setMessages(messages) {
      this.setData({ messages }, () => {
        this.scrollToBottom();
      });
    },

    /**
     * 滚动到底部
     */
    scrollToBottom() {
      const query = wx.createSelectorQuery().in(this);
      query.select('.dialog-content')
        .node(res => {
          if (res && res.node) {
            res.node.scrollIntoView({
              behavior: 'smooth',
              block: 'end'
            });
          }
        })
        .exec();
    }
  }
});