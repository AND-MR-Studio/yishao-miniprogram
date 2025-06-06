// components/input-bar/index.js
Component({
  /**
   * 组件的属性列表 - 纯UI组件，数据来源于外部props
   */
  properties: {
    // 输入框的值 - 来源于chatStore
    inputValue: {
      type: String,
      value: ''
    },
    // 是否禁用 - 基于chatStore的状态计算
    disabled: {
      type: Boolean,
      value: false
    },
    // 是否正在发送 - 来源于chatStore的loading状态
    sending: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据 - 只包含纯UI状态
   */
  data: {
    hasContent: false,
    bottom: -1,          // 输入框距离底部的距离（-1表示使用默认位置，正数表示键盘高度，单位px）
  },

  observers: {
    // 监听外部传入的inputValue变化，更新UI状态
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
    },    // 处理输入事件 - 纯UI交互，通知外部数据变化
    handleInput(e) {
      const value = e.detail.value || '';

      // 不直接修改内部状态，只通知外部
      // 外部(page层)会更新chatStore，然后通过props传回来更新UI
      this.triggerEvent('input', { value: value });
    },

    // 处理发送事件 - 纯UI交互，通知外部发送请求
    handleSend() {
      // 不使用内部的inputValue，使用外部传入的props
      const value = this.properties.inputValue;
      
      // 只通知外部发送事件，不处理任何业务逻辑
      this.triggerEvent('send', { value: value });
    },

    // 清空输入框 - 通知外部清空数据
    clearInput() {
      // 不直接修改内部状态，通知外部清空inputValue
      this.triggerEvent('clear');
    },


  }
})