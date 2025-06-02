// components/nav-bar/index.js
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { settingStore } = require('../../stores/index');

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
    navBarHeight: 44
  },

  lifetimes: {
    attached() {
      // 获取状态栏高度
      const { statusBarHeight } = wx.getWindowInfo();
      this.setData({ statusBarHeight });

      // 创建settingStore绑定
      this.settingStoreBindings = createStoreBindings(this, {
        store: settingStore,
        fields: ['showSettingPanel'],
        actions: ['toggleSettingPanel']
      });
    },

    detached() {
      // 清理MobX绑定
      if (this.settingStoreBindings) {
        this.settingStoreBindings.destroyStoreBindings();
      }
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
    },    // 处理点击右侧图标
    onClickRight() {
      this.toggleSettingPanel(true);
    },    // 关闭设置面板
    onSettingClose() {
      this.toggleSettingPanel(false);
    }
  }
})