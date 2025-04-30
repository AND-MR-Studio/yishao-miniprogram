// components/detective-card/detective-card.js
const api = require('../../utils/api');
const userService = require('../../utils/userService');

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
      value: api.default_avatar_url
    },
    // 是否已经签到
    hasSignedIn: {
      type: Boolean,
      value: false
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
    // 剩余回答次数
    remainingAnswers: 0,
    // 四栏数据
    unsolvedCount: 0,
    solvedCount: 0,
    creationCount: 0,
    favoriteCount: 0
  },

  /**
   * 数据监听器
   */
  observers: {
    // 移除userInfo的观察者，避免实时更新
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
     * 组件内部处理签到逻辑，并通知父页面结果
     */
    async handleSignIn() {
      try {
        // 检查登录状态
        if (!this.data.isLoggedIn) {
          userService.checkLoginStatus();
          return;
        }

        // 检查是否已签到
        if (this.data.hasSignedIn) {
          wx.showToast({
            title: '今天已经签到过啦~',
            icon: 'none',
            duration: 2000
          });
          wx.vibrateShort({ type: 'light' });
          return;
        }

        // 显示加载中提示
        wx.showLoading({
          title: '签到中...',
          mask: true
        });

        try {
          // 调用后端签到接口
          const res = await api.userRequest({
            url: api.user_signin_url,
            method: 'POST'
          });

          if (res.success && res.data) {
            // 更新组件内部状态
            this.setData({ hasSignedIn: true });

            // 显示签到成功提示
            wx.showToast({
              title: '签到成功',
              icon: 'success',
              duration: 2000
            });

            // 振动反馈
            wx.vibrateShort({ type: 'medium' });

            // 处理升级提示
            if (res.data.levelUp) {
              userService.showLevelUpNotification(res.data.levelTitle);
            }

            // 刷新用户信息
            await this.refreshUserInfo();

            // 通知父页面签到成功
            this.triggerEvent('signinresult', {
              success: true,
              data: res.data
            });
          } else {
            wx.showToast({
              title: res.error || '签到失败',
              icon: 'none',
              duration: 2000
            });

            // 通知父页面签到失败
            this.triggerEvent('signinresult', {
              success: false,
              error: res.error || '签到失败'
            });
          }
        } catch (error) {
          const errorMsg = error.toString();

          // 处理"今日已签到"的情况
          if (errorMsg.includes('今日已签到')) {
            this.setData({ hasSignedIn: true });

            wx.showToast({
              title: '今天已经签到过啦~',
              icon: 'none',
              duration: 2000
            });

            wx.vibrateShort({ type: 'light' });

            // 通知父页面已签到
            this.triggerEvent('signinresult', {
              success: true,
              alreadySignedIn: true
            });
          } else {
            wx.showToast({
              title: '签到失败，请重试',
              icon: 'none',
              duration: 2000
            });

            // 通知父页面签到失败
            this.triggerEvent('signinresult', {
              success: false,
              error: errorMsg
            });
          }
        }
      } finally {
        wx.hideLoading();
      }
    },

    /**
     * 刷新用户信息
     * 从后端获取最新用户信息并更新组件显示
     */
    async refreshUserInfo() {
      try {
        // 获取最新用户信息
        const detectiveInfo = await userService.getFormattedUserInfo(false);
        if (!detectiveInfo) return;

        // 更新组件数据
        this.updateCardDisplay(detectiveInfo);

        // 通知父页面用户信息已更新
        this.triggerEvent('userinforefreshed', { detectiveInfo });
      } catch (error) {
        console.error('刷新用户信息失败:', error);
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

      // 如果detectiveInfo存在，更新其avatarUrl为默认头像
      if (this.properties.detectiveInfo) {
        // 创建一个新对象，避免直接修改原对象
        const updatedInfo = { ...this.properties.detectiveInfo };

        // 添加时间戳参数，避免缓存问题
        const defaultUrl = this.properties.defaultAvatarUrl + '?t=' + new Date().getTime();
        updatedInfo.avatarUrl = defaultUrl;

        // 更新组件属性
        this.setData({
          'detectiveInfo.avatarUrl': defaultUrl
        });
      }
    }
  }
})
