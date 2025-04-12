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
    },
    // 是否添加初始化系统消息
    addInitialSystemMessages: {
      type: Boolean,
      value: true
    }
  },
  
  data: {
    loading: false, // 是否正在加载消息
    // 打字机动画相关数据
    displayLines: [],
    isAnimating: false,
    animatingMessageIndex: -1, // 当前正在执行动画的消息索引
    hasMessagesChanged: false  // 标记消息是否有变化
  },

  lifetimes: {
    attached() {
      // 初始化标志，用于跟踪是否已从父组件加载了消息
      this.hasLoadedFromParent = false;
      
      // 初始化打字机动画实例
      this.typeAnimator = typeAnimation.createInstance(this, {
        typeSpeed: this.properties.typeSpeed,
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
    async _tryLoadHistoryMessages(soupId) {
      // 如果已经从父组件加载了消息，或者没有soupId，则不加载
      if (this.hasLoadedFromParent || !soupId) return;
      
      try {
        // 设置加载中状态
        this.setData({ loading: true });
        
        // 使用dialogService的异步方法加载历史消息
        const messages = await dialogService.loadDialogMessagesAsync(soupId);
        
        // 如果需要添加初始系统消息，使用dialogService的方法合并
        let combinedMessages = messages;
        if (this.properties.addInitialSystemMessages) {
          combinedMessages = dialogService.combineWithInitialMessages(messages);
        }
        
        if (combinedMessages.length) {
          this.setData({ 
            messages: combinedMessages, 
            hasMessagesChanged: false,
            loading: false 
          }, () => {
            // 通知页面消息已更新
            this.triggerEvent('messagesChange', { messages: combinedMessages });
            this.scrollToBottom();
          });
        } else {
          this.setData({ loading: false });
        }
      } catch (error) {
        console.error('加载历史消息失败', error);
        this.setData({ loading: false });
      }
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

      // 检查是否为特殊关键词
      const inputResult = dialogService.handleUserInput(content.trim());
      if (inputResult.isSpecial) {
        // 使用特殊响应处理
        const userMessage = inputResult.userMessage;
        const specialReply = inputResult.reply;
        
        // 添加用户消息
        const messages = [...this.properties.messages, userMessage];
        await new Promise(resolve => {
          this.setData({ messages, hasMessagesChanged: true }, () => {
            this.scrollToBottom();
            resolve();
          });
        });
        
        if (!this.properties.enableTyping) {
          // 不使用打字机效果时，直接添加完整内容
          const finalMessages = [...messages, specialReply];
          
          await new Promise(resolve => {
            this.setData({ 
              messages: finalMessages,
              hasMessagesChanged: true
            }, () => {
              this.triggerEvent('messagesChange', { messages: finalMessages });
              this.scrollToBottom();
              resolve();
            });
          });
          
          // 自动保存消息
          if (this.properties.autoSave) {
            this._saveMessages();
          }
          
          return finalMessages;
        }
        
        // 使用打字机效果时，先添加空内容
        const updatedMessages = [...messages, {
          type: specialReply.type,
          content: ''
        }];
        
        await new Promise(resolve => {
          this.setData({ 
            messages: updatedMessages,
            animatingMessageIndex: updatedMessages.length - 1,
            isAnimating: true,
            hasMessagesChanged: true
          }, () => {
            this.scrollToBottom();
            resolve();
          });
        });

        // 启动打字机动画
        await this.typeAnimator.start(specialReply.content);
        
        // 动画完成后更新消息内容
        const finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = specialReply;
        
        await new Promise(resolve => {
          this.setData({ 
            messages: finalMessages,
            animatingMessageIndex: -1,
            hasMessagesChanged: true
          }, () => {
            this.triggerEvent('messagesChange', { messages: finalMessages });
            this.scrollToBottom();
            resolve();
          });
        });
        
        // 自动保存消息
        if (this.properties.autoSave) {
          this._saveMessages();
        }
        
        return finalMessages;
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

      // 普通消息处理，使用dialogService生成回复
      const reply = inputResult.reply || dialogService.generateReply();
      return this._displayReply(messages, reply);
    },
    
    /**
     * 显示回复消息（处理打字机效果）
     * @param {Array} messages 当前消息列表
     * @param {Object} reply 回复消息
     * @returns {Promise<Array>} 更新后的消息列表
     * @private
     */
    async _displayReply(messages, reply) {
      if (!this.properties.enableTyping) {
        // 不使用打字机效果时，直接添加完整回复
        const finalMessages = [...messages, {
          type: 'normal',
          content: reply.content
        }];
        
        await new Promise(resolve => {
          this.setData({ 
            messages: finalMessages,
            hasMessagesChanged: true
          }, () => {
            this.triggerEvent('messagesChange', { messages: finalMessages });
            this.scrollToBottom();
            resolve();
          });
        });
        
        // 自动保存消息
        if (this.properties.autoSave) {
          this._saveMessages();
        }
        
        return finalMessages;
      }
      
      // 使用打字机效果时，先添加空内容
      const updatedMessages = [...messages, {
        type: 'normal',
        content: ''
      }];
      
      await new Promise(resolve => {
        this.setData({ 
          messages: updatedMessages,
          animatingMessageIndex: updatedMessages.length - 1,
          isAnimating: true,
          hasMessagesChanged: true
        }, () => {
          this.scrollToBottom();
          resolve();
        });
      });

      // 启动打字机动画
      await this.typeAnimator.start(reply.content);
      
      // 动画完成后更新消息内容
      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = {
        type: 'normal',
        content: reply.content
      };
      
      await new Promise(resolve => {
        this.setData({ 
          messages: finalMessages,
          animatingMessageIndex: -1,
          hasMessagesChanged: true
        }, () => {
          this.triggerEvent('messagesChange', { messages: finalMessages });
          this.scrollToBottom();
          resolve();
        });
      });
      
      // 自动保存消息
      if (this.properties.autoSave) {
        this._saveMessages();
      }

      return finalMessages;
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
      } catch (err) {
        console.error('滚动到底部失败', err);
      }
    }
  }
});