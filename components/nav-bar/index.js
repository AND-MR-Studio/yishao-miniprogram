// components/nav-bar/index.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    // 自定义导航栏背景色
    backgroundColor: {
      type: String,
      value: '#061429'
    },
    // 图标颜色
    iconColor: {
      type: String,
      value: '#fff'
    },
    // 是否显示左侧图标
    showLeft: {
      type: Boolean,
      value: true
    },
    // 是否显示右侧图标
    showRight: {
      type: Boolean,
      value: true
    },
    // 标题内容
    title: {
      type: String,
      value: ''
    },
    // 标题样式
    titleStyle: {
      type: String,
      value: ''
    },
    // 页面状态，用于设置面板显示不同内容
    pageState: {
      type: String,
      value: ''
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    statusBarHeight: 0,
    navBarHeight: 44,
    showSettingPanel: false
  },

  lifetimes: {
    attached() {
      // 获取状态栏高度
      const { statusBarHeight } = wx.getWindowInfo();
      this.setData({ statusBarHeight });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 处理点击左侧图标
    onClickLeft() {
      wx.switchTab({
        url: '/pages/index/index'
      });
    },

    // 处理点击右侧图标
    onClickRight() {
      // 显示设置面板
      this.showSetting();
    },

    showSetting() {
      this.setData({
        showSettingPanel: true
      });
    },

    onSettingClose() {
      console.log('关闭设置面板');
      this.setData({
        showSettingPanel: false
      });
    },

    // 添加设置相关回调函数
    onSwitchChange(e) {
      const { type, value } = e.detail;

      // 打印日志便于调试
      console.log('nav-bar 接收到switchchange事件:', { type, value });
      console.log('触发settingchange事件给页面');

      // 触发事件给页面处理
      this.triggerEvent('settingchange', { type, value });
    },

    onFontSizeChange(e) {
      const { size } = e.detail;
      // 触发事件给页面处理
      this.triggerEvent('fontsizechange', { size });
    },

    onContact() {
      // 触发联系我们事件
      this.triggerEvent('contact');
    },

    onAbout() {
      // 触发关于我们事件
      this.triggerEvent('about');
    },

    // 处理清理上下文事件
    onClearContext(e) {
      // 获取对话ID和用户ID
      const { dialogId, userId } = e.detail;
      if (!dialogId || !userId) return;

      // 触发清理上下文事件给页面处理
      this.triggerEvent('clearcontext', { dialogId, userId });
    }
  }
})