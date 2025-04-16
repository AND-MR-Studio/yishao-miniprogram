// components/input-bar/index.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    inputValue: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    hasContent: false,
    isVoiceMode: false,  // 是否处于语音模式
    isRecording: false,  // 是否正在录音
    isCancelled: false,  // 是否取消录音
    touchStartY: 0,       // 记录触摸开始的Y坐标
    recordManager: null
  },

  observers: {
    'inputValue': function(value) {
      this.setData({
        hasContent: value && value.trim().length > 0
      });
    }
  },

  lifetimes: {
    attached() {
      // 初始化录音管理器
      this.initRecordManager();
    },
    
    detached() {
      // 清理录音管理器
      if (this.data.recordManager) {
        this.data.recordManager.stop();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 初始化录音管理器
    initRecordManager() {
      const recordManager = wx.getRecorderManager();
      
      recordManager.onStart(() => {
        console.log('录音开始');
      });
      
      recordManager.onStop((res) => {
        if (!this.data.isCancelled) {
          // 录音结束，发送语音消息
          this.triggerEvent('sendVoice', { 
            tempFilePath: res.tempFilePath,
            duration: res.duration 
          });
        }
      });
      
      recordManager.onError((res) => {
        console.error('录音错误:', res);
        wx.showToast({
          title: '录音失败',
          icon: 'none'
        });
      });
      
      this.setData({ recordManager });
    },

    // 处理输入事件
    handleInput(e) {
      const value = e.detail.value || '';
      this.setData({
        inputValue: value,
        hasContent: value.trim().length > 0
      });
      this.triggerEvent('input', { value });
    },

    // 处理发送事件
    handleSend() {
      const value = this.data.inputValue;
      if (!value || !value.trim()) {
        wx.showToast({
          title: '请输入内容',
          icon: 'none'
        });
        return;
      }
      this.triggerEvent('send', { value: value.trim() });
      // 发送后自动清空输入框
      this.clearInput();
    },

    // 清空输入框
    clearInput() {
      this.setData({
        inputValue: '',
        hasContent: false
      });
      // 通知页面输入值已更新
      this.triggerEvent('input', { value: '' });
    },

    // 处理语音按钮长按开始
    handleVoiceStart(e) {
      // 检查录音权限
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          this.startRecording(e);
        },
        fail: () => {
          wx.showToast({
            title: '需要录音权限',
            icon: 'none'
          });
          // 授权失败时重置录音状态
          this.setData({
            isRecording: false,
            isCancelled: false
          });
        }
      });
    },

    // 开始录音
    startRecording(e) {
      this.setData({ 
        touchStartY: e.touches[0].clientY,
        isRecording: true,
        isCancelled: false
      });
      
      // 开始录音
      const { recordManager } = this.data;
      if (recordManager) {
        recordManager.start({
          duration: 60000, // 最长录音时间，单位ms
          sampleRate: 44100,
          numberOfChannels: 1,
          encodeBitRate: 192000,
          format: 'mp3'
        });
      }
      
      // 触发开始录音事件
      this.triggerEvent('voiceStart');
    },

    // 处理语音按钮长按移动
    handleVoiceMove(e) {
      if (!this.data.isRecording) return;
      
      const touchY = e.touches[0].clientY;
      const moveDistance = this.data.touchStartY - touchY;
      
      // 向上移动超过50px时触发取消状态
      const isCancelled = moveDistance > 50;
      
      if (isCancelled !== this.data.isCancelled) {
        this.setData({ isCancelled });
      }
    },

    // 处理语音按钮长按结束
    handleVoiceEnd() {
      if (!this.data.isRecording) return;
      
      const { recordManager, isCancelled } = this.data;
      this.setData({ 
        isRecording: false,
        isCancelled: false
      });
      
      if (recordManager) {
        if (isCancelled) {
          recordManager.stop();
          this.triggerEvent('voiceCancel');
        } else {
          recordManager.stop();
          this.triggerEvent('voiceEnd');
        }
      }
    },

    // 处理语音按钮长按取消（触摸被打断）
    handleVoiceCancel() {
      if (!this.data.isRecording) return;
      
      const { recordManager } = this.data;
      if (recordManager) {
        recordManager.stop();
      }
      
      this.setData({ 
        isRecording: false,
        isCancelled: false
      });
      this.triggerEvent('voiceCancel');
    }
  }
})