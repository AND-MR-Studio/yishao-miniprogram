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
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    hasContent: false,
    bottom: -1,          // 输入框距离底部的距离（-1表示使用默认位置，正数表示键盘高度，单位px）
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
      // 组件初始化
    },

    detached() {
      // 组件销毁
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 处理输入框获取焦点事件
    handleInputFocus(e) {
      // 获取键盘高度，设置输入框距离底部的距离
      // 键盘高度需要减去安全区域高度，因为我们已经在CSS中考虑了安全区域
      const keyboardHeight = e.detail.height || 0;
      const safeAreaHeight = this.getSafeAreaHeight();

      this.setData({
        bottom: Math.max(0, keyboardHeight - safeAreaHeight)
      });
    },

    // 处理输入框失去焦点事件
    handleInputBlur() {
      // 恢复到默认位置
      this.setData({
        bottom: 0
      });
    },

    // 获取安全区域高度
    getSafeAreaHeight() {
      try {
        const systemInfo = wx.getDeviceInfo();
        // 如果有安全区域信息，返回底部安全区域高度
        if (systemInfo && systemInfo.safeArea) {
          const { screenHeight, safeArea } = systemInfo;
          return screenHeight - safeArea.bottom;
        }
        return 0;
      } catch (e) {
        console.error('获取系统信息失败', e);
        return 0;
      }
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



    // 清空输入框
    clearInput() {
      this.setData({
        inputValue: '',
        hasContent: false
      });
      // 通知页面输入值已更新
      this.triggerEvent('input', { value: '' });
    },


  }
})