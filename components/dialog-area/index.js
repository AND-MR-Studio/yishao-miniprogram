const dialogService = require('../../utils/dialogService');
const typeAnimation = require('../../utils/typeAnimation');

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
    // 打字机动画相关数据
    displayLines: [],
    currentLineIndex: 0,
    lineAnimationComplete: false,
    animationComplete: true, // 初始状态为完成
    isAnimating: false,
    typeEffect: 'normal', // 默认使用普通效果
    animatingMessageIndex: -1, // 当前正在执行动画的消息索引
    animatedMessageIndexes: [] // 已经完成动画但仍保持打字机视图的消息索引
  },

  lifetimes: {
    attached() {
      // 组件初始化时，如果没有消息，添加默认的初始消息
      // 页面不再提供初始消息，由组件负责创建和管理初始消息
      if (this.properties.messages.length === 0) {
        console.log('组件内部创建初始消息');
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
          },
          {
            type: 'system',
            content: '长按对话区域显示汤面。'
          }
        ];
        
        this.setData({ messages: initialMessages }, () => {
          // 触发事件通知页面消息已更新
          this.triggerEvent('messagesChange', { messages: initialMessages });
          
          // 滚动到底部
          setTimeout(() => {
            this.scrollToBottom();
          }, 50);
        });
      } else {
        console.log('页面提供了初始消息，长度:', this.properties.messages.length);
        // 如果页面提供了消息，确保滚动到底部
        setTimeout(() => {
          this.scrollToBottom();
        }, 50);
      }
      
      // 初始化打字机动画实例
      this.typeAnimator = typeAnimation.createInstance(this, {
        typeSpeed: 60,
        typeEffect: 'normal',
        onAnimationStart: () => {
          this.setData({ isAnimating: true });
        },
        onAnimationComplete: () => {
          this.setData({ 
            isAnimating: false
          });
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

      // 添加用户消息
      const messages = [...this.properties.messages, userMessage];
      this.setData({ messages }, () => {
        this.scrollToBottom();
      });

      // 如果输入"提示"，则显示特殊提示信息
      if (content.trim() === '提示') {
        const hintMessage = {
          type: 'hint',
          content: '这是一段很长的提示文字，用来测试打字机动画效果。这段文字包含了一些标点符号，比如逗号、句号。还有一些感叹号！问号？以及其他标点符号；冒号：破折号——等等。这些标点符号会有不同的停顿时间，让打字机效果更加自然。'
        };
        
        // 添加提示消息（实际内容为空，用于动画）
        const updatedMessages = [...messages, {
          type: 'hint',
          content: ''
        }];
        
        this.setData({ 
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1
        }, () => {
          this.scrollToBottom();
          // 启动打字机动画
          this.typeAnimator.start(hintMessage.content);
          
          // 动画完成后更新消息内容
          setTimeout(() => {
            const finalMessages = [...updatedMessages];
            finalMessages[finalMessages.length - 1] = hintMessage;
            
            this.setData({ messages: finalMessages }, () => {
              this.triggerEvent('messagesChange', { messages: finalMessages });
              this.scrollToBottom();
            });
          }, hintMessage.content.length * 80 + 200); // 估算动画完成时间
        });
        
        return updatedMessages;
      }

      // 生成系统回复（简单随机模拟）
      const responses = ['是', '否', '不确定'];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      // 添加系统消息（实际内容为空，用于动画）
      const updatedMessages = [...messages, {
        type: 'system',
        content: ''
      }];
      
      this.setData({ 
        messages: updatedMessages,
        animatingMessageIndex: updatedMessages.length - 1
      }, () => {
        this.scrollToBottom();
        // 启动打字机动画
        this.typeAnimator.start(randomResponse);
        
        // 动画完成后更新消息内容
        setTimeout(() => {
          const finalMessages = [...updatedMessages];
          finalMessages[finalMessages.length - 1] = {
            type: 'system',
            content: randomResponse
          };
          
          this.setData({ messages: finalMessages }, () => {
            this.triggerEvent('messagesChange', { messages: finalMessages });
            this.scrollToBottom();
          });
        }, randomResponse.length * 80 + 200); // 估算动画完成时间
      });

      return updatedMessages;
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
        
        // 发送请求
        const response = await dialogService.sendMessage(params);
        
        // 添加用户消息
        const messages = [...this.properties.messages, message];
        this.setData({ messages }, () => {
          this.scrollToBottom();
        });
        
        // 添加系统消息（实际内容为空，用于动画）
        const updatedMessages = [...messages, {
          type: 'system',
          content: ''
        }];
        
        this.setData({ 
          messages: updatedMessages,
          isReceiving: false,
          animatingMessageIndex: updatedMessages.length - 1
        }, () => {
          this.scrollToBottom();
          // 启动打字机动画
          this.typeAnimator.start(response.content);
          
          // 动画完成后更新消息内容
          setTimeout(() => {
            const finalMessages = [...updatedMessages];
            finalMessages[finalMessages.length - 1] = response;
            
            this.setData({ messages: finalMessages }, () => {
              this.triggerEvent('messagesChange', { messages: finalMessages });
              this.scrollToBottom();
            });
          }, response.content.length * 80 + 200); // 估算动画完成时间
        });
        
        return updatedMessages;
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
     * 组件内部滚动到底部的方法
     */
    scrollToBottom() {
      try {
        // 使用组件内选择器查询scroll-view
        const query = wx.createSelectorQuery().in(this);
        query.select('#dialogScroll')
          .node(res => {
            if (res && res.node) {
              const scrollView = res.node;
              // 设置滚动位置到底部
              scrollView.scrollTo({
                top: 99999,
                behavior: 'smooth'
              });
            }
          })
          .exec();

        // 备用方法，直接设置scrollTop
        setTimeout(() => {
          query.select('#dialogScroll')
            .fields({
              node: true,
              size: true,
              scrollOffset: true
            }, res => {
              if (res && res.node) {
                const scrollView = res.node;
                scrollView.scrollTop = scrollView.scrollHeight;
              }
            })
            .exec();
        }, 50);
      } catch (err) {
        console.error('组件内滚动失败:', err);
      }
    }
  }
});