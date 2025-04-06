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
    inputFocus: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    hasContent: false,
    isRecording: false,
    touchStartY: 0,
    isCancelled: false
  },

  /**
   * 生命周期函数
   */
  lifetimes: {
    attached() {
      // 初始化时检查是否有内容
      this.setData({
        hasContent: this.data.inputValue.trim().length > 0
      });
    }
  },

  observers: {
    'inputValue': function(value) {
      // 当inputValue属性变化时更新hasContent状态
      this.setData({
        hasContent: value.trim().length > 0
      });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 处理输入事件
    handleInput(e) {
      const value = e.detail.value || '';
      this.setData({
        hasContent: value.trim().length > 0
      });
      this.triggerEvent('input', e.detail);
    },

    // 处理发送事件
    handleSend() {
      const value = this.data.inputValue;
      if (!value.trim()) {
        wx.showToast({
          title: '请输入内容',
          icon: 'none'
        });
        return;
      }
      this.triggerEvent('send', { value });
      // 发送后自动清空输入框
      this.clearInput();
    },

    // 处理语音按钮点击（简短点击）
    handleVoice() {
      this.triggerEvent('voice');
    },

    // 处理语音按钮按下开始
    handleVoiceStart(e) {
      this.setData({
        isRecording: true,
        touchStartY: e.touches[0].clientY,
        isCancelled: false
      });
      // 震动反馈
      wx.vibrateShort({
        type: 'medium'
      });
    },

    // 处理语音按钮移动（检测上滑取消）
    handleVoiceMove(e) {
      if (!this.data.isRecording) return;

      const touchMoveY = e.touches[0].clientY;
      const moveDistance = this.data.touchStartY - touchMoveY;

      // 上滑超过50像素，标记为取消
      if (moveDistance > 50 && !this.data.isCancelled) {
        this.setData({
          isCancelled: true
        });
        wx.vibrateShort({
          type: 'light'
        });
      } else if (moveDistance <= 50 && this.data.isCancelled) {
        this.setData({
          isCancelled: false
        });
      }
    },

    // 处理语音按钮释放结束
    handleVoiceEnd() {
      if (!this.data.isRecording) return;

      if (!this.data.isCancelled) {
        // 这里可以处理发送语音消息
        wx.showToast({
          title: '语音发送成功',
          icon: 'success',
          duration: 1000
        });
      } else {
        wx.showToast({
          title: '已取消语音',
          icon: 'none',
          duration: 1000
        });
      }

      this.setData({
        isRecording: false,
        isCancelled: false
      });
    },

    // 清空输入框
    clearInput() {
      this.setData({
        inputValue: '',
        hasContent: false
      });
      // 通知页面输入值已更新
      this.triggerEvent('input', { value: '' });
    }
  }
})