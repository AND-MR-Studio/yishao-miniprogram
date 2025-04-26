// components/detective-card/detective-card.js
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
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 解析后的侦探名称和ID
    nickName: '',
    detectiveId: '',
    // 是否已登录
    isLoggedIn: false,
    // 等级称号
    levelTitle: '',
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

      // 如果未登录或没有侦探信息，显示未登录状态
      if (!isLoggedIn || !detectiveInfo) {
        this.setData({
          nickName: '未登录的侦探',
          detectiveId: '未知',
          isLoggedIn: false,
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
        levelTitle: detectiveInfo.levelTitle || '见习侦探',
        remainingAnswers: detectiveInfo.remainingAnswers || 0,
        unsolvedCount: detectiveInfo.unsolvedCount || 0,
        solvedCount: detectiveInfo.solvedCount || 0,
        creationCount: detectiveInfo.creationCount || 0,
        favoriteCount: detectiveInfo.favoriteCount || 0
      });
    },

    /**
     * 处理签到
     */
    handleSignIn() {
      // 检查登录状态
      if (!this.data.isLoggedIn) {
        userService.checkLoginStatus(); // 显示登录提示
        return;
      }

      // 触发签到事件
      this.triggerEvent('signin');
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
