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
    // 是否为TabBar页面（首页、煮汤、我的）
    isTabBarPage: {
      type: Boolean,
      value: false
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
      if (this.data.isTabBarPage) {
        this.triggerEvent('refreshPage');
      } else {
        wx.navigateBack({
          fail: () => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        });
      }
    },

    // 处理点击右侧图标
    onClickRight() {
      this.showSetting();
    },

    // 显示设置面板
    showSetting() {
      this.setData({
        showSettingPanel: true
      });
    },

    // 关闭设置面板
    onSettingClose() {
      this.setData({
        showSettingPanel: false
      });
    },

    // 处理设置开关变化
    onSwitchChange(e) {
      const { type, value } = e.detail;
      this.triggerEvent('settingchange', { type, value });
    },

    // 处理联系我们事件
    onContact() {
      this.triggerEvent('contact');
    },

    // 处理关于我们事件
    onAbout() {
      this.triggerEvent('about');
    },

    // 处理显示引导事件
    onShowGuide() {
      this.triggerEvent('showguide');
    },

    // 处理清理上下文事件
    onClearContext(e) {
      const { dialogId, userId } = e.detail;
      if (!dialogId || !userId) return;
      this.triggerEvent('clearcontext', { dialogId, userId });
    }
  }
})