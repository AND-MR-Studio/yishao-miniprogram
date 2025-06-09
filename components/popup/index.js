// components/popup/index.js
const { assets } = require('../../config/api');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示弹窗
    visible: {
      type: Boolean,
      value: false
    },
    // 弹窗标题
    title: {
      type: String,
      value: ''
    },
    // 弹窗内容
    content: {
      type: String,
      value: ''
    },
    // 是否显示关闭按钮
    showClose: {
      type: Boolean,
      value: true
    },
    // 是否显示确认按钮
    showConfirm: {
      type: Boolean,
      value: true
    },
    // 是否显示取消按钮
    showCancel: {
      type: Boolean,
      value: true
    },
    // 确认按钮文字
    confirmText: {
      type: String,
      value: '确定'
    },
    // 取消按钮文字
    cancelText: {
      type: String,
      value: '取消'
    },
    // 点击遮罩是否关闭
    maskClosable: {
      type: Boolean,
      value: true
    },
    // 是否显示登录图标
    showLoginIcon: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 组件内部数据
    assets
  },

  /**
   * 组件样式隔离
   */
  options: {
    styleIsolation: 'isolated'
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 点击遮罩
     */
    onMaskClick() {
      if (this.properties.maskClosable) {
        this.onClose();
      }
    },

    /**
     * 关闭弹窗
     */
    onClose() {
      this.setData({ visible: false });
      this.triggerEvent('close');
    },

    /**
     * 点击确认按钮
     */
    onConfirm() {
      // 如果是登录弹窗，直接跳转到个人中心页面
      if (this.properties.showLoginIcon) {
        wx.switchTab({
          url: "/pages/mine/mine",
        });
      }
      
      this.triggerEvent('confirm');
      // 默认点击确认后关闭弹窗
      this.onClose();
    },

    /**
     * 点击取消按钮
     */
    onCancel() {
      // 如果是登录弹窗，记录用户取消登录
      if (this.properties.showLoginIcon) {
        console.log('用户取消登录');
      }
      
      this.triggerEvent('cancel');
      // 默认点击取消后关闭弹窗
      this.onClose();
    },

    /**
     * 阻止事件冒泡
     */
    preventBubble() {
      return false;
    },

    /**
     * 显示弹窗
     */
    show() {
      this.setData({ visible: true });
    },

    /**
     * 隐藏弹窗
     */
    hide() {
      this.setData({ visible: false });
    }
  }
})