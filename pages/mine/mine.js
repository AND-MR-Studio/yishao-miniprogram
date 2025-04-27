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

      // 已登录，从后端获取最新用户信息
      try {
        const detectiveInfo = await userService.getCompleteUserInfo(false);

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

  // updateUserInfo 方法已被 refreshPageData 方法替代

  /**
   * 更新统计数据
   */
  updateStatistics() {

    this.setData({
      totalSoupCount: 22,
      pointsCount: 25
    });
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
        detectiveInfo = await userService.getCompleteUserInfo(false);
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
   * 使用默认侦探信息
   */
  skipUserInfo() {
    // 关闭弹窗，不更新用户信息
    this.closeUserInfoModal();

    // 刷新页面数据
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
   */
  navigateToHelp() {
    this.showFeatureInDevelopment('帮助与反馈', '/pages/help/help', false);
  },

  /**
   * 处理签到 - 由detective-card组件触发
   */
  async handleSignIn(e) {
    try {
      // 从组件获取状态信息
      const { isLoggedIn } = e.detail || {};

      // 检查登录状态
      if (!isLoggedIn) {
        // 显示登录提示
        userService.checkLoginStatus();
        return;
      }

      // 显示加载中提示
      wx.showLoading({
        title: '签到中...',
        mask: true
      });

      console.log('开始签到请求，URL:', api.user_signin_url);

      try {
        // 调用后端签到接口 - 始终发送请求到后端，让后端决定是否可以签到
        const res = await api.userRequest({
          url: api.user_signin_url,
          method: 'POST'
        });

        console.log('签到请求成功，响应数据:', res);

        if (res.success && res.data) {
          const data = res.data;
          console.log('签到成功，增加回答次数，数据:', data);

          // 设置已签到状态
          this.setData({
            hasSignedIn: true
          });

          // 显示签到成功提示
          wx.showToast({
            title: '签到成功，回答次数+10',
            icon: 'success',
            duration: 2000
          });

          // 如果升级了，显示升级提示
          if (data.levelUp) {
            userService.showLevelUpNotification(data.levelTitle);
          }

          // 等待一小段时间，确保后端数据已更新
          await new Promise(resolve => setTimeout(resolve, 500));

          // 强制从后端刷新用户信息，确保获取最新的回答次数
          const userInfo = await userService.getUserInfo(true);
          console.log('签到后获取的最新用户信息:', userInfo);

          if (userInfo) {
            // 更新侦探卡片信息
            const detectiveInfo = await userService.getCompleteUserInfo(false);
            if (detectiveInfo) {
              this.setData({
                detectiveInfo: detectiveInfo,
                pointsCount: userInfo.points?.points || this.data.pointsCount
              });

              // 更新detective-card组件
              const detectiveCard = this.selectComponent('#detective-card');
              if (detectiveCard) {
                detectiveCard.updateCardDisplay(detectiveInfo);
              }
            }
          }
        } else {
          console.error('签到失败，响应错误:', res.error || '未知错误');
          // 显示错误提示
          wx.showToast({
            title: res.error || '签到失败',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('签到请求失败:', error);

        // 检查错误信息是否包含"今日已签到"
        const errorMsg = error.toString();
        if (errorMsg.includes('今日已签到')) {
          // 如果是"今日已签到"的错误，更新UI状态并显示友好提示
          this.setData({
            hasSignedIn: true
          });

          wx.showToast({
            title: '今天已经签到过啦~',
            icon: 'none',
            duration: 2000
          });
        } else {
          // 其他错误
          wx.showToast({
            title: '签到失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      }
    } finally {
      wx.hideLoading();
    }
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