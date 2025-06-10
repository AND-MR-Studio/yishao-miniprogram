// components/detective-card/detective-card.js

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 用户信息对象，包含所有需要显示的数据
    detectiveInfo: {
      type: Object,
      value: null,
      observer: function(newVal) {
        this.updateCardDisplay(newVal);
      }
    },
    defaultAvatarUrl: {
      type: String,
      value: null
    }
  },

  /**
   * 组件的初始数据 - 定义未登录状态的默认值
   */
  data: {
    // 解析后的侦探名称和ID
    nickName: '未登录的侦探',
    detectiveId: '未知',
    // 是否已登录
    isLoggedIn: false,
    // 等级称号
    levelTitle: '未知侦探',
    // 剩余提问次数
    remainingAnswers: 0,
    // 四栏数据
    unsolvedCount: 0,
    solvedCount: 0,
    creationCount: 0,
    favoriteCount: 0
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时，如果有传入detectiveInfo则更新显示
      if (this.properties.detectiveInfo) {
        this.updateCardDisplay(this.properties.detectiveInfo);
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 更新卡片显示
     * @param {Object} detectiveInfo - 侦探信息
     */
    updateCardDisplay(detectiveInfo) {
      // 检查是否有有效的侦探信息
      const isLoggedIn = detectiveInfo && detectiveInfo.isLoggedIn;

      // 如果未登录或没有侦探信息，重置为初始未登录状态
      if (!isLoggedIn || !detectiveInfo) {
        // 重置为组件初始化时定义的默认值
        this.setData({
          isLoggedIn: false,
          nickName: '未登录的侦探',
          detectiveId: '未知',
          levelTitle: '未知侦探',
          remainingAnswers: 0,
          unsolvedCount: 0,
          solvedCount: 0,
          creationCount: 0,
          favoriteCount: 0
        });
        return;
      }

      // 已登录，更新组件数据
      this.setData({
        nickName: detectiveInfo.nickName || '',
        detectiveId: detectiveInfo.detectiveId || '',
        isLoggedIn: true,
        levelTitle: detectiveInfo.levelTitle || '',
        remainingAnswers: detectiveInfo.remainingAnswers || 0,
        unsolvedCount: detectiveInfo.unsolvedCount || 0,
        solvedCount: detectiveInfo.solvedCount || 0,
        creationCount: detectiveInfo.creationCount || 0,
        favoriteCount: detectiveInfo.favoriteCount || 0
      });
    },

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
        if (this.properties.detectiveInfo?.isSignIn) {
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
    },

    /**
     * 处理头像图片加载错误
     */
    handleImageError() {
      console.error('头像图片加载失败，使用默认头像');
      
      // 使用默认头像
      if (this.properties.defaultAvatarUrl) {
        this.setData({
          'detectiveInfo.avatarUrl': this.properties.defaultAvatarUrl
        });
      }
    }
  }
})
