// components/detective-card/detective-card.js
const api = require('../../utils/api');

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
      value: api.default_avatar_url // 使用api.js中定义的云端默认头像URL
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
          nickName: this.data.nickName,
          detectiveId: this.data.detectiveId,
          levelTitle: this.data.levelTitle,
          remainingAnswers: this.data.remainingAnswers,
          unsolvedCount: this.data.unsolvedCount,
          solvedCount: this.data.solvedCount,
          creationCount: this.data.creationCount,
          favoriteCount: this.data.favoriteCount
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
     * 纯粹触发事件，所有业务逻辑由父页面处理
     */
    handleSignIn() {
      // 直接触发签到事件，由页面处理所有逻辑
      // 包括登录检查和已签到提示
      this.triggerEvent('signin', {
        isLoggedIn: this.data.isLoggedIn,
        hasSignedIn: this.properties.hasSignedIn
      });
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
