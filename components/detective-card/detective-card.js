// components/detective-card/detective-card.js
const userService = require('../../utils/userService');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    userInfo: {
      type: Object,
      value: null
    },
    defaultAvatarUrl: {
      type: String,
      value: ''
    },
    remainingAnswers: {
      type: Number,
      value: 0
    },
    level: {
      type: Number,
      value: 1
    },
    levelTitle: {
      type: String,
      value: '见习侦探'
    },
    experience: {
      type: Number,
      value: 0
    },
    maxExperience: {
      type: Number,
      value: 1000
    },
    // 四栏数据
    unsolvedCount: {
      type: Number,
      value: 0
    },
    solvedCount: {
      type: Number,
      value: 0
    },
    creationCount: {
      type: Number,
      value: 0
    },
    favoriteCount: {
      type: Number,
      value: 0
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 解析后的侦探名称和ID
    detectiveName: '',
    detectiveId: '',
    // 完整的昵称（包含ID部分）
    fullNickname: '',
    // 是否已登录
    isLoggedIn: false
  },

  /**
   * 数据监听器
   */
  observers: {
    'userInfo': function(userInfo) {
      // 当userInfo变化时，解析侦探ID
      this.parseDetectiveInfo(userInfo);
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时，初始化侦探信息
      this.parseDetectiveInfo(this.properties.userInfo);
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 解析侦探信息
     * @param {Object} userInfo - 用户信息
     */
    parseDetectiveInfo(userInfo) {
      // 检查是否已登录
      const isLoggedIn = userInfo && userService.checkLoginStatus(false);

      // 保存完整的昵称
      const fullNickname = userInfo?.nickName || '';

      // 解析侦探名称和ID
      const { name, id } = userService.parseDetectiveId(fullNickname);

      // 更新组件数据
      this.setData({
        detectiveName: name,
        detectiveId: id,
        fullNickname: fullNickname,
        isLoggedIn: isLoggedIn,
        // 未登录状态下，显示"未知侦探"，否则使用后端返回的等级称号
        levelTitle: isLoggedIn ? (userInfo?.levelTitle || this.properties.levelTitle) : '未知侦探'
      });
    },

    /**
     * 处理签到
     */
    handleSignIn() {
      // 检查登录状态
      if (!userService.checkLoginStatus()) {
        return;
      }

      // 触发签到事件
      this.triggerEvent('signin');
    },

    /**
     * 增加经验值
     * @param {number} amount - 增加的经验值
     */
    addExperience(amount) {
      // 获取当前等级信息
      const { level, experience, maxExperience } = this.data;

      // 使用userService增加经验值
      const newLevelInfo = userService.addExperience(experience, level, maxExperience, amount);

      // 更新组件数据
      this.setData({
        level: newLevelInfo.level,
        levelTitle: newLevelInfo.levelTitle,
        experience: newLevelInfo.experience,
        maxExperience: newLevelInfo.maxExperience
      });

      // 如果升级了，显示提示
      if (newLevelInfo.levelUp) {
        wx.showToast({
          title: '恭喜升级！',
          icon: 'success',
          duration: 2000
        });
      }

      // 触发经验值更新事件
      this.triggerEvent('experiencechange', newLevelInfo);
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
