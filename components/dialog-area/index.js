const dialogService = require('../../utils/dialogService');

Component({
  properties: {
    messages: {
      type: Array,
      value: []
    }
  },
  
  data: {
    isReceiving: false // 是否正在接收消息
  },

  methods: {
    /**
     * 发送消息并处理回复
     * @param {Object} message - 用户消息对象 {type: 'user', content: '消息内容'}
     * @param {Object} params - 请求参数
     * @param {Boolean} useStream - 是否使用流式传输
     * @returns {Array} - 返回更新后的消息数组
     */
    async sendMessageToAPI(message, params, useStream = true) {
      try {
        // 设置正在接收状态
        this.setData({ isReceiving: true });
        
        // 创建必要的参数，如果没有提供
        if (!params) {
          params = {
            message: message.content
          };
        }
        
        // 根据请求类型处理
        if (useStream) {
          // 返回一个Promise，在消息完成时resolve
          return new Promise((resolve, reject) => {
            // 创建消息列表副本并添加用户消息
            const messages = [...this.properties.messages];
            messages.push(message);
            
            // 添加一个初始的系统消息占位
            const responseIndex = messages.length;
            const responseMessage = {
              type: 'system',
              content: ''
            };
            messages.push(responseMessage);
            
            // 更新消息并滚动到底部
            this.setData({ messages }, () => this.scrollToBottom());
            
            // 发送流式请求
            dialogService.sendStreamMessage(
              params,
              // 消息更新回调
              (updatedMessage) => {
                // 更新响应消息
                messages[responseIndex] = updatedMessage;
                // 更新界面
                this.setData({ messages }, () => this.scrollToBottom());
              },
              // 完成回调
              () => {
                this.setData({ isReceiving: false });
                resolve(messages);
              },
              // 错误回调
              (error) => {
                this.setData({ isReceiving: false });
                reject(error);
              }
            );
          });
        } else {
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
          }, () => this.scrollToBottom());
          
          return messages;
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        this.setData({ isReceiving: false });
        throw error;
      }
    },

    /**
     * 中止当前的流式传输
     */
    abortCurrentMessage() {
      if (this.data.isReceiving) {
        dialogService.abortCurrentStream();
        this.setData({ isReceiving: false });
      }
    },

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