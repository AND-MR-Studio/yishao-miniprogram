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

  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 处理输入事件
    handleInput(e) {
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

    // 处理语音按钮点击
    handleVoice() {
      this.triggerEvent('voice');
    },

    // 清空输入框
    clearInput() {
      this.setData({
        inputValue: ''
      });
      // 通知页面输入值已更新
      this.triggerEvent('input', { value: '' });
    }
  }
})