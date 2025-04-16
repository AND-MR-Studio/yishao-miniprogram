// pages/dialog.js
const dialogService = require('../../utils/dialogService');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    soupId: {
      type: String,
      value: ''
    }
  },

  data: {
    messages: [],
    keyboardHeight: 0,
    isPeekingSoup: false,
    animationData: {},
    isFullyVisible: false,
    loading: true,
    isAnimating: false
  },

  lifetimes: {
    attached() {
      wx.onKeyboardHeightChange(res => {
        this.setData({ keyboardHeight: res.height });
      });
      
      this.animation = wx.createAnimation({
        duration: 300,
        timingFunction: 'ease',
      });
      
      this.initializeMessages();
    },
    
    detached() {
      this.saveDialogContent();
    }
  },

  observers: {
    'visible': function(visible) {
      if (this.data.isAnimating) return;
      
      if (visible) {
        this.showDialogAsync();
      } else {
        this.hideDialogAsync();
      }
    },
    
    'soupId': function(newId, oldId) {
      if (newId && newId !== oldId && this.data.visible) {
        this.setData({ messages: [] });
        this.initializeMessages();
      }
    }
  },

  methods: {
    async showDialogAsync() {
      if (this.data.isAnimating) return;
      this.setData({ isAnimating: true });
      
      if (!this.animation) {
        this.animation = wx.createAnimation({
          duration: 300,
          timingFunction: 'ease',
        });
      }
      
      try {
        this.animation.translateY('100%').opacity(0).step({ duration: 0 });
        await new Promise(resolve => {
          this.setData({ animationData: this.animation.export() }, resolve);
        });
        
        await new Promise(resolve => wx.nextTick(resolve));
        
        this.animation.translateY(0).opacity(1).step();
        await new Promise(resolve => {
          this.setData({ animationData: this.animation.export() }, resolve);
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        this.setData({ 
          isFullyVisible: true,
          isAnimating: false
        });
        
        await this.initializeMessages();
      } catch (error) {
        console.error('显示对话组件出错:', error);
        this.setData({ isAnimating: false });
      }
    },
    
    async hideDialogAsync() {
      if (this.data.isAnimating || !this.data.isFullyVisible) return;
      this.setData({ isAnimating: true });
      
      if (!this.animation) return;
      
      try {
        this.saveDialogContent();
        this.setData({ isFullyVisible: false });
        
        this.animation.translateY('100%').opacity(0).step();
        await new Promise(resolve => {
          this.setData({ animationData: this.animation.export() }, resolve);
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
        this.setData({ isAnimating: false });
        this.triggerEvent('close');
      } catch (error) {
        console.error('隐藏对话组件出错:', error);
        this.setData({ isAnimating: false });
        this.triggerEvent('close');
      }
    },
    
    async initializeMessages() {
      try {
        if (this.data.messages.length === 0) {
          const dialogArea = this.selectComponent('#dialogArea');
          if (dialogArea) {
            const initialMessages = dialogService.getInitialSystemMessages();
            dialogArea.setMessages(initialMessages);
            this.setData({ 
              messages: initialMessages,
              loading: false
            });
          }
        }
      } catch (error) {
        console.error('初始化消息出错:', error);
        this.setData({ loading: false });
      }
    },
    
    saveDialogContent() {
      const dialogArea = this.selectComponent('#dialogArea');
      if (dialogArea && dialogArea.hasChanged && dialogArea.hasChanged()) {
        dialogArea.saveMessages();
      }
    },
    
    handleClose() {
      this.triggerEvent('close');
    },

    handleSend(e) {
      const { value } = e.detail;
      if (!value || !value.trim()) return;

      if (value.trim() === '汤底') {
        this.triggerEvent('showTruth', { soupId: this.properties.soupId });
        this.handleClose();
        return;
      }

      const dialogArea = this.selectComponent('#dialogArea');
      if (dialogArea) {
        dialogArea.handleUserMessage(value);
      }
    },

    handleVoiceSend(e) {
      const { tempFilePath, duration } = e.detail;
      const dialogArea = this.selectComponent('#dialogArea');
      if (dialogArea) {
        dialogArea.handleVoiceMessage({
          type: 'voice',
          content: tempFilePath,
          duration: duration
        });
      }
    },

    handleMessagesChange(e) {
      const { messages } = e.detail;
      if (messages && messages.length) {
        this.setData({ messages });
      }
    },

    // 偷看相关功能
    handleLongPress() {
      this.setData({ isPeekingSoup: true });
      this.triggerEvent('peekSoup', { isPeeking: true });
    },
    
    handleTouchEnd() {
      if (this.data.isPeekingSoup) {
        this.setData({ isPeekingSoup: false });
        this.triggerEvent('peekSoup', { isPeeking: false });
      }
    }
  }
});