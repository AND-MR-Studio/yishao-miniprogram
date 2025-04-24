// pages/mine/mine.js
// 引入用户服务模块
const userService = require('../../utils/userService');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    remainingAnswers: 0,
    defaultAvatarUrl: userService.DEFAULT_AVATAR_URL,
    buttonConfig: {
      type: 'light',
      text: '登录'
    },
    isLoggingOut: false,
    // 用户信息设置弹窗
    showUserInfoModal: false,
    // 统计数据
    unsolvedCount: 0,
    solvedCount: 0,
    favoriteCount: 0,
    creationCount: 0,
    totalSoupCount: 0,
    pointsCount: 0,
    // 等级信息
    level: 1,
    levelTitle: '见习侦探',
    experience: 350,
    maxExperience: 1000
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.refreshPageData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }
    // 每次显示页面时更新数据
    this.refreshPageData();
  },

  /**
   * 刷新页面数据
   */
  refreshPageData() {
    this.updateUserInfo();
    this.updateRemainingAnswers();
    this.updateStatistics();
    this.updateLevelInfo();
  },

  /**
   * 更新用户信息
   */
  updateUserInfo() {
    // 使用userService获取用户信息
    const userInfo = userService.getUserInfo();

    this.setData({
      userInfo: userInfo,
      buttonConfig: {
        type: userInfo ? 'unlight' : 'light',
        text: userInfo ? '退出登录' : '登录'
      }
    });
  },

  /**
   * 更新剩余回答次数
   */
  updateRemainingAnswers() {
    // 使用userService获取剩余回答次数
    const remainingAnswers = userService.getRemainingAnswers();
    this.setData({ remainingAnswers });
  },

  /**
   * 更新统计数据
   */
  updateStatistics() {
    // 这里可以调用API获取真实数据
    // 目前使用模拟数据
    this.setData({
      unsolvedCount: 10,
      solvedCount: 2,
      favoriteCount: 12,
      creationCount: 8,
      totalSoupCount: 22,
      pointsCount: 25
    });
  },

  /**
   * 更新等级信息
   */
  updateLevelInfo() {
    // 使用userService获取等级信息
    const levelInfo = userService.getLevelInfo(this.data.experience);
    this.setData(levelInfo);
  },

  /**
   * 处理头像选择
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;

    // 使用userService更新头像
    userService.updateAvatar(avatarUrl, this.data.userInfo)
      .then(() => {
        // 头像更新成功，更新页面数据
        this.updateUserInfo();
      })
      .catch(() => {
        // 头像更新失败，但本地可能已更新
        this.updateUserInfo();
      });
  },

  /**
   * 处理昵称输入
   */
  onInputNickname(e) {
    const value = e.detail.value || '';
    if (!value) return;

    if (e.type === 'nicknamereview' || e.type === 'input') {
      // 使用userService更新昵称
      userService.updateNickname(value, this.data.userInfo)
        .then(() => {
          // 昵称更新成功，更新页面数据
          this.updateUserInfo();
        })
        .catch(() => {
          // 昵称更新失败，但本地可能已更新
          this.updateUserInfo();
        });
    }
  },

  /**
   * 打开用户信息设置弹窗
   */
  openUserInfoModal() {
    const userInfo = this.data.userInfo;

    // 如果昵称为空，生成随机侦探ID
    if (userInfo && !userInfo.nickName) {
      userInfo.nickName = userService.generateDetectiveId();
      this.setData({ userInfo });
    }

    this.setData({ showUserInfoModal: true });
  },

  /**
   * 关闭用户信息设置弹窗
   */
  closeUserInfoModal() {
    this.setData({ showUserInfoModal: false });
  },

  /**
   * 确认信息设置
   */
  confirmUserInfo() {
    const userInfo = this.data.userInfo;

    // 使用userService设置用户信息
    userService.setUserInfo(userInfo)
      .then(() => {
        // 更新成功，关闭弹窗
        this.closeUserInfoModal();

        // 显示提示
        wx.showToast({
          title: '侦探信息已设置',
          icon: 'success',
          duration: 2000
        });
      })
      .catch(() => {
        // 更新失败，但本地可能已更新
        this.closeUserInfoModal();
      });
  },

  /**
   * 使用默认侦探信息
   */
  skipUserInfo() {
    this.confirmUserInfo();
  },

  /**
   * 处理登录
   */
  handleLogin() {
    // 使用userService登录
    userService.login((userInfo) => {
      // 更新页面数据
      this.setData({
        userInfo,
        buttonConfig: {
          type: 'unlight',
          text: '退出登录'
        }
      });

      // 显示用户信息设置弹窗
      this.openUserInfoModal();
    }).catch(() => {
      // 登录失败，不需要处理，userService已经显示了提示
    });
  },

  /**
   * 处理退出登录
   */
  handleLogout() {
    // 如果未登录，则执行登录操作
    if (!this.data.userInfo) {
      this.handleLogin();
      return;
    }

    // 如果正在退出登录，则不再显示弹窗
    if (this.data.isLoggingOut) return;

    // 已登录，执行退出操作
    this.setData({ isLoggingOut: true });
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 使用userService退出登录
          userService.logout();

          // 重置页面数据
          this.setData({
            userInfo: null,
            remainingAnswers: 0,
            buttonConfig: {
              type: 'light',
              text: '登录'
            }
          });
        }
        this.setData({ isLoggingOut: false });
      },
      fail: () => this.setData({ isLoggingOut: false })
    });
  },

  /**
   * 防止滚动穿透
   */
  catchTouchMove() {
    return false;
  },

  /**
   * 显示功能开发中提示
   * @param {string} featureName - 功能名称
   * @param {string} _url - 实际导航URL（当功能开发完成后使用）
   * @param {boolean} requireLogin - 是否需要登录
   */
  showFeatureInDevelopment(featureName, _url = '', requireLogin = true) {
    // 如果需要登录且未登录，则提示登录
    if (requireLogin && !userService.checkLoginStatus()) return;

    wx.showToast({
      title: `${featureName}功能开发中`,
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 导航到历史浏览页面
   */
  navigateToHistory() {
    this.showFeatureInDevelopment('历史浏览', '/pages/history/history');
  },

  /**
   * 导航到帮助与反馈页面
   */
  navigateToHelp() {
    this.showFeatureInDevelopment('帮助与反馈', '/pages/help/help', false);
  },

  /**
   * 导航到关于一勺推理社页面
   */
  navigateToAbout() {
    this.showFeatureInDevelopment('关于', '/pages/about/about', false);
  },

  /**
   * 导航到未解决页面
   */
  navigateToUnsolved() {
    this.showFeatureInDevelopment('未解决', '/pages/unsolved/unsolved');
  },

  /**
   * 导航到已解决页面
   */
  navigateToSolved() {
    this.showFeatureInDevelopment('已解决', '/pages/solved/solved');
  },

  /**
   * 处理签到 - 由detective-card组件触发
   */
  handleSignIn() {
    // 获取detective-card组件实例
    const detectiveCard = this.selectComponent('#detective-card');
    if (!detectiveCard) return;

    // 更新积分
    this.setData({
      pointsCount: this.data.pointsCount + 10
    });

    // 增加经验值
    detectiveCard.addExperience(20);

    // 显示提示
    wx.showToast({
      title: '签到成功，积分+10',
      icon: 'success',
      duration: 2000
    });
  },

  /**
   * 处理导航事件 - 由detective-card组件触发
   */
  handleNavigate(e) {
    const { page } = e.detail;

    switch (page) {
      case 'unsolved':
        this.navigateToUnsolved();
        break;
      case 'solved':
        this.navigateToSolved();
        break;
      case 'creations':
        this.navigateToCreations();
        break;
      case 'favorites':
        this.navigateToFavorites();
        break;
      default:
        break;
    }
  }
})