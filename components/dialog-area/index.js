const dialogService = require('../../utils/dialogService');
const typeAnimation = require('../../utils/typeAnimation');

Component({
  properties: {
    messages: {
      type: Array,
      value: [],
      observer: function(newVal) {
        // 当父组件设置messages时，标记为已从父组件加载，避免重复加载
        if (newVal && newVal.length > 0) {
          this.hasLoadedFromParent = true;
        }
      }
    },
    // 当前汤面ID
    soupId: {
      type: String,
      value: '',
      observer: function(newVal, oldVal) {
        // 只有当soupId变化且未从父组件加载消息时，才尝试加载历史消息
        if (newVal && newVal !== oldVal && !this.hasLoadedFromParent) {
          this._tryLoadHistoryMessages(newVal);
        }
      }
    },
    // 是否自动保存消息
    autoSave: {
      type: Boolean,
      value: true
    }
  },
  
  data: {
    isReceiving: false, // 是否正在接收消息
    // 打字机动画相关数据（已精简）
    displayLines: [],
    currentLineIndex: 0,
    isAnimating: false,
    animatingMessageIndex: -1, // 当前正在执行动画的消息索引
    hasMessagesChanged: false  // 标记消息是否有变化
  },

  lifetimes: {
    attached() {
      // 初始化标志，用于跟踪是否已从父组件加载了消息
      this.hasLoadedFromParent = false;
      
      // 初始化打字机动画实例（已精简配置）
      this.typeAnimator = typeAnimation.createInstance(this, {
        typeSpeed: 60,
        onAnimationComplete: () => {
          // 动画完成时触发回调
          this.setData({ isAnimating: false });
        }
      });
      
      // 只有当没有从父组件接收到消息时才尝试加载历史消息
      if (this.properties.soupId && !this.properties.messages.length && !this.hasLoadedFromParent) {
        this._tryLoadHistoryMessages(this.properties.soupId);
      }
      
      // 延迟滚动到底部，确保视图已渲染
      setTimeout(() => {
        this.scrollToBottom();
      }, 300);
    },
    
    detached() {
      // 组件销毁时清理打字机动画资源
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
      }
      
      // 组件销毁时，如果消息有变化且autoSave为true，保存消息
      if (this.data.hasMessagesChanged && this.properties.autoSave && this.properties.soupId) {
        this._saveMessages();
      }
    }
  },

  methods: {
    /**
     * 尝试加载历史消息
     * @param {string} soupId 汤面ID
     * @private
     */
    _tryLoadHistoryMessages(soupId) {
      // 如果已经从父组件加载了消息，或者没有soupId，则不加载
      if (this.hasLoadedFromParent || !soupId) return;
      
      // 尝试加载历史消息
      dialogService.loadDialogMessages({
        soupId: soupId,
        success: (messages) => {
          if (messages && messages.length) {
            this.setData({ messages, hasMessagesChanged: false }, () => {
              // 通知页面消息已更新
              this.triggerEvent('messagesChange', { messages });
              this.scrollToBottom();
            });
          }
        }
      });
    },
    
    /**
     * 保存当前消息
     * @private
     */
    _saveMessages() {
      const soupId = this.properties.soupId;
      const messages = this.data.messages;
      
      if (!soupId || !messages || !messages.length) return;
      
      dialogService.saveDialogMessages(soupId, messages);
      this.setData({ hasMessagesChanged: false });
    },

    /**
     * 处理用户消息并生成回复
     * @param {String} content - 用户消息内容
     * @returns {Promise<Array>} - 返回更新后的消息数组的Promise
     */
    async handleUserMessage(content) {
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
      await new Promise(resolve => {
        this.setData({ messages, hasMessagesChanged: true }, () => {
          this.scrollToBottom();
          resolve();
        });
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
        
        await new Promise(resolve => {
          this.setData({ 
            messages: updatedMessages,
            animatingMessageIndex: updatedMessages.length - 1,
            hasMessagesChanged: true
          }, () => {
            this.scrollToBottom();
            resolve();
          });
        });

        // 启动打字机动画并等待完成
        await this.typeAnimator.start(hintMessage.content);
        
        // 动画完成后更新消息内容
        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = hintMessage;
        
        await new Promise(resolve => {
          this.setData({ messages: finalMessages }, () => {
            this.triggerEvent('messagesChange', { messages: finalMessages });
            this.scrollToBottom();
            
            // 自动保存消息
            if (this.properties.autoSave) {
              this._saveMessages();
            }
            resolve();
          });
        });
        
        return finalMessages;
      }

      // 生成系统回复（简单随机模拟）
      const responses = ['是', '否', '不确定'];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      // 添加正常回复消息（实际内容为空，用于动画）
      const updatedMessages = [...messages, {
        type: 'normal',
        content: ''
      }];
      
      await new Promise(resolve => {
        this.setData({ 
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          hasMessagesChanged: true
        }, () => {
          this.scrollToBottom();
          resolve();
        });
      });

      // 启动打字机动画并等待完成
      await this.typeAnimator.start(randomResponse);
      
      // 动画完成后更新消息内容
      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = {
        type: 'normal',
        content: randomResponse
      };
      
      await new Promise(resolve => {
        this.setData({ messages: finalMessages }, () => {
          this.triggerEvent('messagesChange', { messages: finalMessages });
          this.scrollToBottom();
          
          // 自动保存消息
          if (this.properties.autoSave) {
            this._saveMessages();
          }
          resolve();
        });
      });

      return finalMessages;
    },

    /**
     * 发送消息并处理回复（保留API接口以便未来扩展）
     * @param {Object} message - 用户消息对象 {type: 'user', content: '消息内容'}
     * @param {Object} params - 请求参数
     * @returns {Promise<Array>} - 返回更新后的消息数组的Promise
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
        await new Promise(resolve => {
          this.setData({ messages, hasMessagesChanged: true }, () => {
            this.scrollToBottom();
            resolve();
          });
        });
        
        // 添加系统消息（实际内容为空，用于动画）
        const updatedMessages = [...messages, {
          type: 'normal',
          content: ''
        }];
        
        await new Promise(resolve => {
          this.setData({ 
            messages: updatedMessages,
            isReceiving: false,
            animatingMessageIndex: updatedMessages.length - 1,
            hasMessagesChanged: true
          }, () => {
            this.scrollToBottom();
            resolve();
          });
        });
        
        // 启动打字机动画并等待完成
        await this.typeAnimator.start(response.content);
        
        // 动画完成后更新消息内容
        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = {
          type: 'normal',
          content: response.content
        };
        
        await new Promise(resolve => {
          this.setData({ messages: finalMessages }, () => {
            this.triggerEvent('messagesChange', { messages: finalMessages });
            this.scrollToBottom();
            
            // 自动保存消息
            if (this.properties.autoSave) {
              this._saveMessages();
            }
            resolve();
          });
        });
        
        return finalMessages;
      } catch (error) {
        this.setData({ isReceiving: false });
        throw error;
      }
    },

    /**
     * 保存当前对话消息到存储
     * 注意：通常不需要主动调用此方法，组件会在适当时机自动保存
     * @returns {boolean} 保存是否成功
     */
    saveMessages() {
      if (!this.properties.soupId || !this.data.messages.length) {
        return false;
      }
      
      this._saveMessages();
      return true;
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
      // 标记为已从父组件加载消息，避免重复加载
      this.hasLoadedFromParent = true;
      
      this.setData({ 
        messages, 
        hasMessagesChanged: false  // 重置变更标记，因为这是外部设置的消息
      }, () => {
        this.scrollToBottom();
      });
    },

    /**
     * 检查消息是否有变化
     * @returns {boolean} 是否有变化
     */
    hasChanged() {
      return this.data.hasMessagesChanged;
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
        // 组件内滚动失败
      }
    }
  }
});