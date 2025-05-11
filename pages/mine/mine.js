// pages/mine/mine.js
// 引入用户服务模块
const userService = require('../../service/userService');
// 引入API模块
const api = require('../../config/api');

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
    hasSignedIn: false,
    // 汤面列表弹窗
    showSoupListModal: false,
    // 汤面列表类型: 'unsolved', 'solved', 'creations', 'favorites'
    soupListType: 'unsolved'
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
   * @param {boolean} showToast - 是否显示操作成功提示
   * @returns {Promise<void>}
   */
  async refreshPageData(showToast = false) {
    // 防止重复调用
    if (this._isRefreshingPageData) {
      return;
    }
    this._isRefreshingPageData = true;

    try {
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

      // 如果需要显示提示，则显示
      if (showToast) {
        wx.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1000
        });
      }

    } finally {
      // 重置刷新状态标志
      setTimeout(() => {
        this._isRefreshingPageData = false;
      }, 300);
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
      // 后端已返回扁平化的数据结构
      const userInfo = await userService.getUserInfo();

      // 更新统计数据
      this.setData({
        totalSoupCount: userInfo?.totalSoupCount || 0,
        pointsCount: userInfo?.points || 0
      });
    } catch (error) {
      console.error('更新统计数据失败:', error);
      // 出错时使用默认值
      this.setData({
        totalSoupCount: 0,
        pointsCount: 0
      });
    }
  },

  /**
   * 处理头像选择
   * 增强版本，解决chooseAvatar:fail another chooseAvatar is in progress错误
   */
  onChooseAvatar(e) {
    // 防止重复调用 - 使用更严格的检查
    if (this._isUploadingAvatar || this._isChoosingAvatar) {

      return;
    }

    // 设置两个状态标志，分别跟踪选择和上传过程
    this._isChoosingAvatar = true;
    this._isUploadingAvatar = true;

    const { avatarUrl } = e.detail;
    if (!avatarUrl) {

      this._isChoosingAvatar = false;
      this._isUploadingAvatar = false;
      return;
    }

    // 添加延迟，确保微信内部的chooseAvatar操作完全结束
    setTimeout(() => {
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
        .catch(() => {
          wx.showToast({
            title: '头像上传失败',
            icon: 'none',
            duration: 2000
          });
        })
        .finally(() => {
          // 延迟重置标志，避免快速连续点击
          // 使用更长的延迟时间
          setTimeout(() => {
            this._isUploadingAvatar = false;
            // 确保两个状态都被重置
            this._isChoosingAvatar = false;
          }, 2000);
        });
    }, 500); // 添加500ms延迟，确保微信内部的chooseAvatar操作完全结束
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
   * @param {boolean} showToast - 是否显示操作成功提示
   */
  async openUserInfoModal(showToast = false) {
    // 防止重复调用
    if (this._isOpeningUserInfoModal) {
      return;
    }
    this._isOpeningUserInfoModal = true;

    try {
      // 检查登录状态
      if (!userService.checkLoginStatus(false)) {
        return;
      }

      // 异步获取用户信息
      let detectiveInfo;
      try {
        detectiveInfo = await userService.getFormattedUserInfo(false);
      } catch (error) {
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
      // 重置状态标志
      setTimeout(() => {
        this._isOpeningUserInfoModal = false;
      }, 300);
    }
  },

  /**
   * 关闭用户信息设置弹窗
   */
  closeUserInfoModal() {
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
    // 防止重复调用
    if (this._isSettingUserInfo) {
      return;
    }
    this._isSettingUserInfo = true;

    try {
      // 获取当前用户信息
      const userInfo = this.data.userInfo;
      if (!userInfo) return;

      // 如果选择使用默认信息，清空昵称，让后端生成默认昵称
      if (useDefault) {
        userInfo.nickName = '';
        this.setData({ userInfo });
      }

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
    // 防止重复调用
    if (this._isSkippingUserInfo) {
      return;
    }
    this._isSkippingUserInfo = true;

    try {
      // 关闭弹窗
      this.closeUserInfoModal();

      // 刷新页面数据，显示最新的用户信息
      this.refreshPageData(false);

      // 显示提示
      wx.showToast({
        title: '已跳过设置',
        icon: 'none',
        duration: 1500
      });
    } finally {
      // 重置状态标志
      setTimeout(() => {
        this._isSkippingUserInfo = false;
      }, 300);
    }
  },

  /**
   * 处理登录
   * 使用async/await优化异步流程
   */
  async handleLogin() {
    // 防止重复调用
    if (this._isLoggingIn) {
      return;
    }
    this._isLoggingIn = true;

    try {
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
      // 重置登录状态标志
      setTimeout(() => {
        this._isLoggingIn = false;
      }, 300);
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
          pointsCount: data.points || this.data.pointsCount
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
  async handleNavigate(e) {
    const { page } = e.detail;

    // 检查页面类型是否有效
    if (!['unsolved', 'solved', 'creations', 'favorites'].includes(page)) {
      return;
    }

    // 检查登录状态
    if (!userService.checkLoginStatus()) return;

    try {
      // 在打开弹窗前刷新用户信息，确保获取最新数据
      if (page === 'favorites') {
        console.log('准备打开收藏列表，刷新用户信息');
        // 刷新用户信息
        await this.refreshPageData(false);
      }

      // 显示对应类型的汤面列表弹窗
      this.setData({
        soupListType: page,
        showSoupListModal: true
      });
    } catch (error) {
      console.error('打开汤面列表弹窗失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 关闭汤面列表弹窗
   */
  closeSoupListModal() {
    this.setData({
      showSoupListModal: false
    });
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