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
      value: '一勺海龟汤'
    },
    // 标题样式
    titleStyle: {
      type: String,
      value: ''
    }
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
      // 返回上一页
      wx.navigateBack({
        delta: 1
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
      this.setData({
        showSettingPanel: false
      });
    },
    
    // 添加设置相关回调函数
    onSwitchChange(e) {
      const { type, value } = e.detail;
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
    }
  }
})