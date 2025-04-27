// pages/mine/mine.js
// 引入用户服务模块
const userService = require('../../utils/userService');
// 引入API模块
const api = require('../../utils/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    detectiveInfo: null, // 完整的侦探信息，用于传递给detective-card组件
    defaultAvatarUrl: api.default_avatar_url,
    buttonConfig: {
      type: 'light',
      text: '登录'
    },
    isLoggingOut: false,
    // 用户信息设置弹窗
    showUserInfoModal: false,
    // 统计数据
    totalSoupCount: 0,
    pointsCount: 0,
    // 是否已签到
    hasSignedIn: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 页面加载时不主动刷新数据，等待onShow处理
    // 这样可以避免onLoad和onShow重复刷新
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

    // 每次显示页面时刷新数据
    // 由于onLoad不再刷新，这里是唯一的刷新点
    this.refreshPageData();
  },

  /**
   * 刷新页面数据
   * 使用async/await优化异步流程
   * @param {boolean} showLoading - 是否显示加载提示
   * @returns {Promise<void>}
   */
  async refreshPageData(showLoading = false) {
    try {
      // 如果需要显示加载提示，则显示
      if (showLoading) {
        wx.showLoading({
          title: '加载中...',
          mask: true
        });
      }

      // 检查登录状态
      if (!userService.checkLoginStatus(false)) {
        // 未登录，显示未登录状态
        this.setData({
          userInfo: null,
          detectiveInfo: null,
          buttonConfig: {
            type: 'light',
            text: '登录'
          }
        });

        // 更新统计数据
        this.updateStatistics();
        return;
      }

      // 已登录，获取用户信息
      try {
        const detectiveInfo = await userService.getFormattedUserInfo(false);

        if (detectiveInfo) {
          // 检查用户是否已签到
          const today = new Date().toISOString().split('T')[0];
          const lastSignInDate = detectiveInfo.lastSignInDate || '';
          const hasSignedIn = lastSignInDate === today;

          this.setData({
            userInfo: {isLoggedIn: true},
            detectiveInfo: detectiveInfo,
            hasSignedIn: hasSignedIn,
            buttonConfig: {
              type: 'unlight',
              text: '退出登录'
            }
          });
        } else {
          throw new Error('获取用户信息失败');
        }
      } catch (error) {
        console.log('获取用户信息失败:', error);

        // 获取失败，但仍然显示已登录状态
        this.setData({
          userInfo: {isLoggedIn: true},
          detectiveInfo: null,
          buttonConfig: {
            type: 'unlight',
            text: '退出登录'
          }
        });
      }

      // 更新统计数据
      this.updateStatistics();

    } finally {
      // 无论成功失败，都隐藏加载提示
      if (showLoading) {
        wx.hideLoading();
      }
    }
  },

  // 此处已移除 updateUserInfo 方法，使用 refreshPageData 方法替代

  /**
   * 更新统计数据
   * 从后端获取最新的统计数据
   * @returns {Promise<void>}
   */
  async updateStatistics() {
    try {
      // 检查登录状态
      if (!userService.checkLoginStatus(false)) {
        // 未登录时使用默认值
        this.setData({
          totalSoupCount: 0,
          pointsCount: 0
        });
        return;
      }

      // 从后端获取用户信息和统计数据
      const userInfo = await userService.getUserInfo();

      // 更新统计数据
      this.setData({
        totalSoupCount: userInfo?.stats?.totalSoupCount || 0,
        pointsCount: userInfo?.points?.points || 0
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      // 出错时使用默认值
      this.setData({
        totalSoupCount: 0,
        pointsCount: 0
      });
    }
  },

  /**
   * 处理头像选择
   */
  onChooseAvatar(e) {
    // 防止重复调用
    if (this._isUploadingAvatar) return;
    this._isUploadingAvatar = true;

    const { avatarUrl } = e.detail;
    if (!avatarUrl) {
      this._isUploadingAvatar = false;
      return;
    }

    // 使用userService更新头像
    userService.updateAvatar(avatarUrl)
      .then(result => {
        // 更新页面上的头像显示
        const userInfo = this.data.userInfo || {};
        userInfo.avatarUrl = result.avatarUrl;

        this.setData({
          userInfo: userInfo
        });

        wx.showToast({
          title: '头像上传成功',
          icon: 'success',
          duration: 2000
        });
      })
      .catch(error => {
        console.error('头像上传失败:', error);
        wx.showToast({
          title: '头像上传失败',
          icon: 'none',
          duration: 2000
        });
      })
      .finally(() => {
        // 延迟重置标志，避免快速连续点击
        setTimeout(() => {
          this._isUploadingAvatar = false;
        }, 1000);
      });
  },

  /**
   * 处理昵称输入
   * 使用防抖技术优化输入处理
   */
  onInputNickname: function(e) {
    // 清除之前的定时器
    if (this.nicknameDebounceTimer) {
      clearTimeout(this.nicknameDebounceTimer);
    }

    // 获取输入值
    let value = e.detail.value || '';

    // 使用防抖，延迟处理输入
    this.nicknameDebounceTimer = setTimeout(() => {
      // 检查昵称长度是否超过10个字符
      if (value.length > 10) {
        // 截取前10个字符
        value = value.substring(0, 10);

        // 显示提示
        wx.showToast({
          title: '昵称最多10个字',
          icon: 'none',
          duration: 2000
        });
      }

      // 只在本地更新，不发送到后端
      if (this.data.userInfo) {
        this.setData({
          'userInfo.nickName': value
        });
      }
    }, 300); // 300ms的防抖延迟，提供更好的用户体验
  },

  /**
   * 打开用户信息设置弹窗
   * 使用async/await优化异步流程
   * @param {boolean} showLoading - 是否显示加载提示
   */
  async openUserInfoModal(showLoading = true) {
    try {
      // 检查登录状态
      if (!userService.checkLoginStatus(false)) {
        return;
      }

      // 显示加载提示
      if (showLoading) {
        wx.showLoading({
          title: '加载中...',
          mask: true
        });
      }

      // 异步获取用户信息
      let detectiveInfo;
      try {
        detectiveInfo = await userService.getFormattedUserInfo(false);
      } catch (error) {
        console.log('获取用户信息失败，使用默认值', error);
        // 出错时使用空对象，后续代码会处理默认值
        detectiveInfo = {};
      }

      // 构建用户信息对象
      const userInfo = {
        isLoggedIn: true,
        nickName: detectiveInfo?.nickName || '',
        avatarUrl: detectiveInfo?.avatarUrl || this.data.defaultAvatarUrl
      };

      // 更新页面数据，显示弹窗
      this.setData({
        userInfo: userInfo,
        showUserInfoModal: true
      });
    } finally {
      // 无论成功失败，都隐藏加载提示
      if (showLoading) {
        wx.hideLoading();
      }
    }
  },

  /**
   * 关闭用户信息设置弹窗
   */
  closeUserInfoModal() {
    // 简单关闭弹窗，不需要恢复原始信息
    this.setData({ showUserInfoModal: false });

    // 刷新页面数据以获取最新的用户信息
    this.refreshPageData(false);
  },

  /**
   * 设置用户信息
   * 使用async/await优化异步流程
   * @param {boolean} useDefault - 是否使用默认侦探信息
   */
  async setUserInfoAndRefresh(useDefault = false) {
    try {
      // 获取当前用户信息
      const userInfo = this.data.userInfo;
      if (!userInfo) return;

      // 如果选择使用默认信息，清空昵称，让后端生成默认昵称
      if (useDefault) {
        userInfo.nickName = '';
        this.setData({ userInfo });
      }

      // 防止重复调用
      if (this._isSettingUserInfo) return;
      this._isSettingUserInfo = true;

      // 显示加载中提示
      wx.showLoading({
        title: '保存中...',
        mask: true
      });

      // 异步设置用户信息
      await userService.setUserInfo(userInfo);

      // 更新成功，关闭弹窗
      this.closeUserInfoModal();

      // 显示成功提示
      wx.showToast({
        title: useDefault ? '使用默认侦探信息' : '侦探信息已设置',
        icon: 'success',
        duration: 2000
      });

      // 等待一小段时间，确保后端数据已更新
      await new Promise(resolve => setTimeout(resolve, 300));

      // 刷新页面数据
      await this.refreshPageData(false);

    } catch (error) {
      console.error('设置用户信息失败:', error);

      // 如果是未登录错误，提示用户登录
      if (error.includes && error.includes('未登录')) {
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '设置失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }

      // 关闭弹窗
      this.closeUserInfoModal();
    } finally {
      // 隐藏加载提示
      wx.hideLoading();

      // 重置标志
      setTimeout(() => {
        this._isSettingUserInfo = false;
      }, 300);
    }
  },

  /**
   * 确认信息设置
   */
  confirmUserInfo() {
    this.setUserInfoAndRefresh(false);
  },

  /**
   * 跳过用户信息设置
   * 关闭弹窗并刷新页面数据，但不更新用户信息
   */
  skipUserInfo() {
    // 关闭弹窗
    this.closeUserInfoModal();

    // 刷新页面数据，显示最新的用户信息
    this.refreshPageData(true);
  },

  /**
   * 处理登录
   * 使用async/await优化异步流程
   */
  async handleLogin() {
    try {
      // 显示加载中提示
      wx.showLoading({
        title: '登录中...',
        mask: true
      });

      // 使用userService登录
      await userService.login();

      // 登录成功后刷新页面数据
      await this.refreshPageData(false);

      // 无论是否首次登录，都显示用户信息设置弹窗
      await this.openUserInfoModal(false);

    } catch (error) {
      console.error('登录失败:', error);
      // 登录失败，不需要额外处理，userService已经显示了提示
    } finally {
      // 隐藏加载提示
      wx.hideLoading();
    }
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
            detectiveInfo: null,
            hasSignedIn: false,
            buttonConfig: {
              type: 'light',
              text: '登录'
            }
          });

          // 更新统计数据
          this.updateStatistics();
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
   * 处理头像加载错误
   */
  handleAvatarError() {
    // 如果userInfo存在，更新其avatarUrl为默认头像
    if (this.data.userInfo) {
      // 添加时间戳参数，避免缓存问题
      const defaultUrl = this.data.defaultAvatarUrl + '?t=' + new Date().getTime();

      // 更新页面数据
      this.setData({
        'userInfo.avatarUrl': defaultUrl
      });
    }
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
   * 导航到帮助与反馈页面
   * 目前显示"功能开发中"提示，未来将导航到帮助页面
   */
  navigateToHelp() {
    this.showFeatureInDevelopment('帮助与反馈', '/pages/help/help', false);
  },

  /**
   * 导航到关于页面
   * 目前显示"功能开发中"提示，未来将导航到关于页面
   */
  navigateToAbout() {
    this.showFeatureInDevelopment('关于一勺推理社', '/pages/about/about', false);
  },

  /**
   * 处理签到结果 - 由detective-card组件触发
   * @param {Object} e - 事件对象，包含签到结果
   */
  handleSignInResult(e) {
    const { success, data, alreadySignedIn } = e.detail;

    // 更新页面的签到状态
    if (success) {
      this.setData({ hasSignedIn: true });

      // 如果需要，可以在这里更新页面上的其他数据
      // 例如统计数据等
      if (data && data.points) {
        this.setData({
          pointsCount: data.points.points || this.data.pointsCount
        });
      }
    }

    // 记录签到结果，可用于分析或调试
    console.log('签到结果:', success ? '成功' : '失败', alreadySignedIn ? '(已签到)' : '');
  },

  /**
   * 处理用户信息刷新 - 由detective-card组件触发
   * @param {Object} e - 事件对象，包含更新后的用户信息
   */
  handleUserInfoRefreshed(e) {
    const { detectiveInfo } = e.detail;

    // 更新页面数据
    if (detectiveInfo) {
      this.setData({ detectiveInfo });

      // 更新统计数据
      this.updateStatistics();
    }
  },

  /**
   * 处理导航事件 - 由detective-card组件触发
   * @param {Object} e - 事件对象
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
  },

  /**
   * 导航到未解决页面
   * TODO: 实现导航到未解决汤面列表页面
   */
  navigateToUnsolved() {
    this.showFeatureInDevelopment('未解决汤面', '/pages/unsolved/unsolved', true);
  },

  /**
   * 导航到已解决页面
   * TODO: 实现导航到已解决汤面列表页面
   */
  navigateToSolved() {
    this.showFeatureInDevelopment('已解决汤面', '/pages/solved/solved', true);
  },

  /**
   * 导航到创作页面
   * TODO: 实现导航到用户创作汤面列表页面
   */
  navigateToCreations() {
    this.showFeatureInDevelopment('我的创作', '/pages/creations/creations', true);
  },

  /**
   * 导航到收藏页面
   * TODO: 实现导航到收藏汤面列表页面
   */
  navigateToFavorites() {
    this.showFeatureInDevelopment('我的收藏', '/pages/favorites/favorites', true);
  },

  /**
   * 处理banner点击事件
   * @param {Object} e - 事件对象
   */
  handleBannerTap(e) {
    const { banner } = e.detail;
    if (!banner || !banner.linkUrl) return;

    // 简单的页面跳转
    wx.navigateTo({
      url: banner.linkUrl,
      fail: (err) => {
        console.error('Banner页面跳转失败:', err);
      }
    });
  }
})