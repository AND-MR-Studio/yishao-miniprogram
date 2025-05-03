// components/input-bar/index.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    inputValue: {
      type: String,
      value: ''
    },
    disabled: {
      type: Boolean,
      value: false
    },
    sending: {
      type: Boolean,
      value: false
    },
    showTestButton: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    hasContent: false,
    isRecording: false,  // 是否正在录音
    isCancelled: false,  // 是否取消录音
    touchStartY: 0,      // 记录触摸开始的Y坐标
    touchStartTime: 0,   // 记录触摸开始的时间
    minRecordDuration: 300, // 最短录音时间（毫秒）
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
      const recordManager = wx.getRecorderManager();

      // 录音开始事件
      recordManager.onStart(() => {
        console.log('录音开始');
      });

      // 录音停止事件
      recordManager.onStop((res) => {
        console.log('录音停止');
        if (this.data.isRecording && !this.data.isCancelled) {
          // 只有在录音状态且不是取消状态时才发送语音
          this.triggerEvent('sendVoice', {
            tempFilePath: res.tempFilePath,
            duration: res.duration
          });
        }
      });

      // 录音错误事件
      recordManager.onError((res) => {
        console.error('录音错误:', res);
        wx.showToast({
          title: '录音失败',
          icon: 'none'
        });
        this.resetRecordStatus();
      });

      this.setData({ recordManager });
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
    // 处理语音按钮点击事件（临时禁用功能）
    handleVoiceClick() {
      wx.showToast({
        title: '语音功能还在疯狂开发中~',
        icon: 'none',
        duration: 2000
      });
    },

    // 重置录音状态
    resetRecordStatus() {
      this.setData({
        isRecording: false,
        isCancelled: false
      });
      this.triggerEvent('voiceCancel');
    },

    // 处理输入事件
    handleInput(e) {
      // 如果组件被禁用，仍然允许输入，但不更新状态
      if (this.properties.disabled) {
        return;
      }

      const value = e.detail.value || '';

      // 限制最大长度为50个字符
      const limitedValue = value.slice(0, 50);

      this.setData({
        inputValue: limitedValue,
        hasContent: limitedValue.trim().length > 0
      });

      this.triggerEvent('input', { value: limitedValue });

      // 如果超出字数限制，显示提示
      if (value.length > 50) {
        wx.showToast({
          title: '最多输入50个字',
          icon: 'none',
          duration: 1000
        });
      }
    },

    // 处理发送事件
    handleSend() {
      // 如果组件被禁用，显示简短提示并返回
      if (this.properties.disabled) {
        // 只有当有内容时才显示提示，避免空点击也显示提示
        if (this.data.hasContent) {
          wx.showToast({
            title: '侦探大人，请别急',
            icon: 'none',
            duration: 800
          });
        }
        return;
      }

      const value = this.data.inputValue;
      if (!value || !value.trim()) {
        wx.showToast({
          title: '请输入内容',
          icon: 'none'
        });
        return;
      }

      // 检查字数是否超过限制
      if (value.length > 50) {
        wx.showToast({
          title: '消息不能超过50个字',
          icon: 'none'
        });
        return;
      }

      this.triggerEvent('send', { value: value.trim() });
      // 发送后自动清空输入框
      this.clearInput();
    },

    // 处理测试Agent API事件
    handleTestAgent() {
      // 如果组件被禁用，显示简短提示并返回
      if (this.properties.disabled) {
        // 只有当有内容时才显示提示，避免空点击也显示提示
        if (this.data.hasContent) {
          wx.showToast({
            title: '侦探大人，请别急',
            icon: 'none',
            duration: 800
          });
        }
        return;
      }

      const value = this.data.inputValue;
      if (!value || !value.trim()) {
        wx.showToast({
          title: '请输入内容',
          icon: 'none'
        });
        return;
      }

      // 检查字数是否超过限制
      if (value.length > 50) {
        wx.showToast({
          title: '消息不能超过50个字',
          icon: 'none'
        });
        return;
      }

      this.triggerEvent('testAgent', { value: value.trim() });
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
      // 记录触摸开始时间和位置
      this.setData({
        touchStartTime: Date.now(),
        touchStartY: e.touches[0].clientY,
        isRecording: true,
        isCancelled: false
      });

      // 检查录音权限
      wx.authorize({
        scope: 'scope.record',
        success: () => {
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
            this.triggerEvent('voiceStart');
          }
        },
        fail: () => {
          wx.showToast({
            title: '需要录音权限',
            icon: 'none'
          });
          this.resetRecordStatus();
        }
      });
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

      const { recordManager, isCancelled, touchStartTime, minRecordDuration } = this.data;
      const touchDuration = Date.now() - touchStartTime;

      // 如果触摸时间太短，视为取消录音
      const isShortTouch = touchDuration < minRecordDuration;

      // 设置取消状态
      if (isShortTouch || isCancelled) {
        console.log('录音取消 - ' + (isShortTouch ? '触摸时间过短' : '用户主动取消'));
        this.setData({
          isRecording: false,
          isCancelled: true
        });

        if (recordManager) {
          recordManager.stop();
        }

        this.triggerEvent('voiceCancel');
      } else {
        // 正常结束录音
        console.log('录音结束 - 触摸时长:', touchDuration, 'ms');
        this.setData({
          isRecording: false,
          isCancelled: false
        });

        if (recordManager) {
          recordManager.stop();
        }

        this.triggerEvent('voiceEnd');
      }
    },

    // 处理语音按钮长按取消（触摸被打断）
    handleVoiceCancel() {
      if (!this.data.isRecording) return;

      const { recordManager } = this.data;

      console.log('录音被打断，已取消');
      this.setData({
        isRecording: false,
        isCancelled: true
      });

      if (recordManager) {
        recordManager.stop();
      }

      this.triggerEvent('voiceCancel');
    }
  }
})