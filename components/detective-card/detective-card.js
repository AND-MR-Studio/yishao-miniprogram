// components/detective-card/detective-card.js
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { rootStore } = require('../../stores/index');
const { assets } = require('../../config/assets');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 保留默认头像配置，用于未登录状态显示
    defaultAvatarUrl: {
      type: String,
      value: assets.remote.defaultAvatar
    }
  },

  /**
   * 组件的初始数据
   */
  data: {},

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 创建 MobX 绑定
      this.userStoreBindings = createStoreBindings(this, {
        store: rootStore.userStore,
        fields: ['detectiveInfo', 'isLoggedIn']
      });
    },    detached() {
      // 清理 MobX 绑定
      if (this.userStoreBindings) {
        this.userStoreBindings.destroyStoreBindings();
      }
    }
  },
  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 处理编辑资料
     * 触发编辑事件，由父页面处理弹窗显示和资料编辑逻辑
     */
    handleEditProfile() {
      this.triggerEvent('editprofile');
    },

    /**
     * 处理签到
     * 将签到逻辑委托给父页面，通过事件通知父页面处理
     */
    async handleSignIn() {
      // 防止重复调用
      if (this._isSigningIn) {
        return;
      }
      this._isSigningIn = true;

      try {
        // 检查登录状态
        if (!this.data.isLoggedIn) {
          wx.showToast({
            title: '请先登录',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        // 检查是否已签到
        if (this.data.detectiveInfo?.isSignIn) {
          wx.showToast({
            title: '今天已经签到过啦~',
            icon: 'none',
            duration: 2000
          });
          wx.vibrateShort({ type: 'light' });
          return;
        }

        // 通知父页面执行签到操作
        this.triggerEvent('signin');
      } finally {
        // 重置签到状态标志
        setTimeout(() => {
          this._isSigningIn = false;
        }, 300);
      }
    },

    /**
     * 导航到未解决页面
     */
    navigateToUnsolved() {
      this.triggerEvent('navigate', { page: 'unsolved' });
    },

    /**
     * 导航到已解决页面
     */
    navigateToSolved() {
      this.triggerEvent('navigate', { page: 'solved' });
    },

    /**
     * 导航到创作页面
     */
    navigateToCreations() {
      this.triggerEvent('navigate', { page: 'creations' });
    },

    /**
     * 导航到收藏页面
     */
    navigateToFavorites() {
      this.triggerEvent('navigate', { page: 'favorites' });
    }
  }
})
