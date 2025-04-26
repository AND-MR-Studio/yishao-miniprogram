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
    defaultAvatarUrl: api.default_avatar_url, // 使用api.js中定义的云端默认头像URL
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
   * @param {boolean} showLoading - 是否显示加载提示
   */
  refreshPageData(showLoading = false) {
    // 如果需要显示加载提示，则显示
    if (showLoading) {
      wx.showLoading({
        title: '加载中...',
        mask: false
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

      // 如果显示了加载提示，则隐藏
      if (showLoading) {
        wx.hideLoading();
      }
      return;
    }

    // 已登录，从后端获取最新用户信息
    // 传入false表示不显示加载提示，因为我们可能已经显示了
    userService.getCompleteUserInfo(false)
      .then(detectiveInfo => {
        if (detectiveInfo) {
          // 检查用户是否已签到
          const today = new Date().toISOString().split('T')[0];
          const lastSignInDate = detectiveInfo.lastSignInDate || '';
          const hasSignedIn = lastSignInDate === today;

          this.setData({
            userInfo: userService.getUserInfo(),
            detectiveInfo: detectiveInfo,
            hasSignedIn: hasSignedIn,
            buttonConfig: {
              type: 'unlight',
              text: '退出登录'
            }
          });
        } else {
          // 获取失败，使用本地存储的基本登录信息
          const userInfo = userService.getUserInfo();
          this.setData({
            userInfo: userInfo,
            detectiveInfo: null,
            buttonConfig: {
              type: userInfo ? 'unlight' : 'light',
              text: userInfo ? '退出登录' : '登录'
            }
          });
        }

        // 更新统计数据
        this.updateStatistics();

        // 如果显示了加载提示，则隐藏
        if (showLoading) {
          wx.hideLoading();
        }
      })
      .catch(error => {
        console.error('获取用户信息失败:', error);

        // 获取失败，使用本地存储的基本登录信息
        const userInfo = userService.getUserInfo();
        this.setData({
          userInfo: userInfo,
          detectiveInfo: null,
          buttonConfig: {
            type: userInfo ? 'unlight' : 'light',
            text: userInfo ? '退出登录' : '登录'
          }
        });

        // 更新统计数据
        this.updateStatistics();

        // 如果显示了加载提示，则隐藏
        if (showLoading) {
          wx.hideLoading();
        }
      });
  },

  // updateUserInfo 方法已被 refreshPageData 方法替代

  /**
   * 更新统计数据
   */
  updateStatistics() {
    // 这里可以调用API获取真实数据
    // 目前使用模拟数据
    this.setData({
      totalSoupCount: 22,
      pointsCount: 25
    });
  },

  /**
   * 处理头像选择
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (!avatarUrl) return;

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
      });
  },

  /**
   * 处理昵称输入
   */
  onInputNickname(e) {
    let value = e.detail.value || '';

    // 允许输入框为空，以便显示占位符
    if (e.type === 'nicknamereview' || e.type === 'input') {
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

      // 更新本地数据，但不立即提交到服务器
      if (this.data.userInfo) {
        // 创建一个新的对象，避免直接修改原对象
        const userInfo = { ...this.data.userInfo };
        userInfo.nickName = value;

        // 只更新弹窗中显示的昵称，不影响侦探名片
        this.setData({
          'userInfo.nickName': value
        });
      }
    }
  },

  /**
   * 打开用户信息设置弹窗
   * @param {boolean} showLoading - 是否显示加载提示
   */
  openUserInfoModal(showLoading = true) {
    // 检查登录状态
    if (!userService.checkLoginStatus(false)) {
      return;
    }

    // 如果需要显示加载提示，则显示
    if (showLoading) {
      wx.showLoading({
        title: '加载中...',
        mask: false
      });
    }

    // 从后端获取最新用户信息
    userService.getUserInfo(true)
      .then(userInfo => {
        // 更新本地存储的用户信息
        const localUserInfo = userService.getUserInfo();
        if (localUserInfo) {
          // 更新昵称和头像
          localUserInfo.nickName = userInfo.userInfo?.nickName || localUserInfo.nickName;
          localUserInfo.avatarUrl = userInfo.userInfo?.avatarUrl || localUserInfo.avatarUrl;
          localUserInfo.detectiveId = userInfo.userInfo?.detectiveId || localUserInfo.detectiveId;

          // 保存到本地存储
          wx.setStorageSync(userService.USER_INFO_KEY, localUserInfo);

          // 更新页面数据
          this.setData({
            userInfo: localUserInfo
          });
        }

        // 如果显示了加载提示，则隐藏
        if (showLoading) {
          wx.hideLoading();
        }

        // 打开弹窗，保留用户的原始昵称
        // 如果用户清空输入框，将显示占位符
        this.setData({ showUserInfoModal: true });
      })
      .catch(error => {
        console.error('获取用户信息失败:', error);

        // 如果显示了加载提示，则隐藏
        if (showLoading) {
          wx.hideLoading();
        }

        // 即使获取失败，也打开弹窗，使用本地存储的信息
        this.setData({ showUserInfoModal: true });
      });
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

    // 防止重复调用
    if (this._isSettingUserInfo) return;
    this._isSettingUserInfo = true;

    // 使用userService设置用户信息
    // 如果昵称为空，后端会自动生成
    userService.setUserInfo(userInfo)
      .then(() => {
        // 更新成功，关闭弹窗
        this.closeUserInfoModal();

        // 显示成功提示
        wx.showToast({
          title: '侦探信息已设置',
          icon: 'success',
          duration: 2000
        });

        // 显示加载中提示
        wx.showLoading({
          title: '更新中...',
          mask: false
        });

        // 延迟一下再刷新数据，避免后端数据还没更新完成
        setTimeout(() => {
          // 直接调用 getCompleteUserInfo 获取最新数据
          userService.getCompleteUserInfo(false)
            .then(detectiveInfo => {
              if (detectiveInfo) {
                this.setData({
                  userInfo: userService.getUserInfo(),
                  detectiveInfo: detectiveInfo,
                  buttonConfig: {
                    type: 'unlight',
                    text: '退出登录'
                  }
                });
              }

              // 更新统计数据
              this.updateStatistics();

              // 隐藏加载提示
              wx.hideLoading();
            })
            .catch(() => {
              // 出错时也要隐藏加载提示
              wx.hideLoading();
            });
        }, 500);
      })
      .catch((error) => {
        console.error('设置用户信息失败:', error);

        // 如果是未登录错误，提示用户登录
        if (error.includes && error.includes('未登录')) {
          wx.showToast({
            title: '请先登录',
            icon: 'none',
            duration: 2000
          });
        }

        // 关闭弹窗
        this.closeUserInfoModal();
      })
      .finally(() => {
        // 重置标志
        setTimeout(() => {
          this._isSettingUserInfo = false;
        }, 500);
      });
  },

  /**
   * 使用默认侦探信息
   */
  skipUserInfo() {
    // 清空昵称，让后端生成默认昵称
    const userInfo = this.data.userInfo;
    if (userInfo) {
      userInfo.nickName = '';
      this.setData({ userInfo });
    }

    // 防止重复调用
    if (this._isSettingUserInfo) return;
    this._isSettingUserInfo = true;

    // 使用userService设置用户信息
    userService.setUserInfo(userInfo)
      .then(() => {
        // 更新成功，关闭弹窗
        this.closeUserInfoModal();

        // 显示成功提示
        wx.showToast({
          title: '使用默认侦探信息',
          icon: 'success',
          duration: 2000
        });

        // 显示加载中提示
        wx.showLoading({
          title: '更新中...',
          mask: false
        });

        // 延迟一下再刷新数据，避免后端数据还没更新完成
        setTimeout(() => {
          // 直接调用 getCompleteUserInfo 获取最新数据
          userService.getCompleteUserInfo(false)
            .then(detectiveInfo => {
              if (detectiveInfo) {
                this.setData({
                  userInfo: userService.getUserInfo(),
                  detectiveInfo: detectiveInfo,
                  buttonConfig: {
                    type: 'unlight',
                    text: '退出登录'
                  }
                });
              }

              // 更新统计数据
              this.updateStatistics();

              // 隐藏加载提示
              wx.hideLoading();
            })
            .catch(() => {
              // 出错时也要隐藏加载提示
              wx.hideLoading();
            });
        }, 500);
      })
      .catch((error) => {
        console.error('设置用户信息失败:', error);

        // 如果是未登录错误，提示用户登录
        if (error.includes && error.includes('未登录')) {
          wx.showToast({
            title: '请先登录',
            icon: 'none',
            duration: 2000
          });
        }

        // 关闭弹窗
        this.closeUserInfoModal();
      })
      .finally(() => {
        // 重置标志
        setTimeout(() => {
          this._isSettingUserInfo = false;
        }, 500);
      });
  },

  /**
   * 处理登录
   */
  handleLogin() {
    // 显示加载中提示
    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    // 使用userService登录，不使用回调方式，统一使用Promise
    userService.login(true) // 传入true表示如果后端已有用户数据则跳过弹窗
      .then(result => {
        const { skipPopup } = result;

        // 登录成功后，从后端获取最新的用户信息
        return userService.getUserInfo(true).then(backendUserInfo => {
          return { backendUserInfo, skipPopup };
        });
      })
      .then(({ backendUserInfo, skipPopup }) => {
        // 隐藏加载提示
        wx.hideLoading();

        // 更新本地存储的用户信息
        const localUserInfo = userService.getUserInfo();
        if (localUserInfo) {
          // 更新昵称和头像
          localUserInfo.nickName = backendUserInfo.userInfo?.nickName || localUserInfo.nickName;
          localUserInfo.avatarUrl = backendUserInfo.userInfo?.avatarUrl || localUserInfo.avatarUrl;
          localUserInfo.detectiveId = backendUserInfo.userInfo?.detectiveId || localUserInfo.detectiveId;

          // 保存到本地存储
          wx.setStorageSync(userService.USER_INFO_KEY, localUserInfo);

          // 检查是否是每日首次登录
          if (localUserInfo.isDailyFirstLogin) {
            // 调用后端接口增加回答次数
            api.userRequest({
              url: api.user_signin_url,
              method: 'POST',
              data: {
                dailyFirstLogin: true
              }
            }).then(res => {
              if (res.success) {
                console.log('每日首次登录增加回答次数成功');

                // 更新剩余回答次数
                console.log('每日首次登录回答次数数据:', res.data);
                if (res.data) {
                  // 如果返回了回答次数，直接更新
                  if (res.data.remainingAnswers !== undefined) {
                    this.setData({
                      'detectiveInfo.remainingAnswers': res.data.remainingAnswers
                    });
                  }

                  // 刷新页面数据以显示更新后的回答次数
                  this.refreshPageData(false);
                }
              } else {
                console.error('每日首次登录增加回答次数失败:', res.error);
              }
            }).catch(error => {
              console.error('每日首次登录增加回答次数请求失败:', error);
            });
          }
        }

        // 更新页面数据
        this.setData({
          userInfo: localUserInfo,
          buttonConfig: {
            type: 'unlight',
            text: '退出登录'
          }
        });

        // 检查是否需要显示用户信息设置弹窗
        if (!skipPopup) {
          // 如果后端没有用户数据，则显示设置弹窗
          // 传入false表示不显示加载提示，因为我们已经显示了
          this.openUserInfoModal(false);
        } else {
          // 如果后端已有用户数据，则直接刷新页面数据
          // 传入false表示不显示加载提示，因为我们已经显示了
          this.refreshPageData(false);

          // 显示登录成功提示
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 2000
          });
        }
      })
      .catch(() => {
        // 隐藏加载提示
        wx.hideLoading();
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
            detectiveInfo: null, // 确保侦探信息也被重置
            remainingAnswers: 0,
            hasSignedIn: false, // 重置签到状态为未签到
            buttonConfig: {
              type: 'light',
              text: '登录'
            }
          });

          // 不需要再次刷新页面数据，因为我们已经手动设置了所有必要的状态
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
  handleSignIn(e) {
    // 从组件获取状态信息
    const { isLoggedIn, hasSignedIn } = e.detail || {};

    // 检查登录状态
    if (!isLoggedIn) {
      // 显示登录提示
      userService.checkLoginStatus();
      return;
    }

    // 前端UI提示已签到（但仍然继续处理，让后端做最终检查）
    if (hasSignedIn) {
      wx.showToast({
        title: '今日已签到',
        icon: 'none',
        duration: 2000
      });
    }

    // 显示加载中提示
    wx.showLoading({
      title: '签到中...',
      mask: true
    });

    // 调用后端签到接口
    const config = {
      url: api.user_signin_url,
      method: 'POST'
    };

    // 发送请求
    api.userRequest(config)
      .then(res => {
        wx.hideLoading();

        if (res.success && res.data) {
          const data = res.data;

          // 更新积分和回答次数
          this.setData({
            pointsCount: data.points || this.data.pointsCount
          });

          // 显示签到成功提示
          wx.showToast({
            title: '签到成功，回答次数+10',
            icon: 'success',
            duration: 2000
          });

          // 更新剩余回答次数
          console.log('签到成功，回答次数数据:', data);
          if (data.remainingAnswers !== undefined) {
            this.setData({
              'detectiveInfo.remainingAnswers': data.remainingAnswers
            });
          }

          // 如果升级了，显示升级提示
          if (data.levelUp) {
            // 使用userService显示升级提示
            userService.showLevelUpNotification(data.levelTitle);
          }

          // 更新签到状态
          this.setData({
            hasSignedIn: true
          });

          // 刷新页面数据
          this.refreshPageData(true);
        } else {
          // 显示错误提示
          wx.showToast({
            title: res.error || '签到失败',
            icon: 'none',
            duration: 2000
          });

          // 如果是"今日已签到"的错误，更新UI状态
          if (res.error === '今日已签到') {
            this.setData({
              hasSignedIn: true
            });
          }
        }
      })
      .catch(error => {
        wx.hideLoading();
        console.error('签到失败:', error);
        wx.showToast({
          title: '签到失败，请重试',
          icon: 'none',
          duration: 2000
        });
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