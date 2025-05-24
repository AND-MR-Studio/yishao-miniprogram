// pages/mine/mine.js
// 引入用户服务模块
const userService = require('../../service/userService');
// 引入API模块
const api = require('../../config/api');
// 引入rootStore 和 mobx-miniprogram-bindings
const { rootStore } = require('../../stores/rootStore');
const { storeBindingsBehavior } = require('mobx-miniprogram-bindings');

Page({
  behaviors: [storeBindingsBehavior],

  storeBindings: {
    store: rootStore,
    fields: {
      // 将 rootStore.userStore.userInfo 映射到 this.data.userInfo
      userInfo: () => rootStore.userStore.userInfo,
      // 将 rootStore.userStore.detectiveInfo 映射到 this.data.detectiveInfo
      detectiveInfo: () => rootStore.userStore.detectiveInfo,
      // 将 rootStore.userStore.hasSignedIn 映射到 this.data.hasSignedIn
      hasSignedIn: () => rootStore.userStore.hasSignedIn,
      // 将 rootStore.userStore.totalSoupCount 映射到 this.data.totalSoupCount
      totalSoupCount: () => rootStore.userStore.totalSoupCount,
      // 将 rootStore.userStore.pointsCount 映射到 this.data.pointsCount
      pointsCount: () => rootStore.userStore.pointsCount,
    },
    actions: {
      // 将 rootStore.userStore.updateAvatar 映射到 this.updateAvatarAction
      updateAvatarAction: 'userStore/updateAvatar',
      // 将 rootStore.userStore.updateUserProfile 映射到 this.updateUserProfile
      updateUserProfile: 'userStore/updateUserProfile',
      // 将 rootStore.userStore.signIn 映射到 this.signInAction
      signInAction: 'userStore/signIn',
      // 将 rootStore.userStore.refreshPageData 映射到 this.refreshPageDataStore
      refreshPageDataStore: 'userStore/refreshPageData',
    },
  },

  /**
   * 页面的初始数据
   */
  data: {
    // userInfo, detectiveInfo, hasSignedIn, totalSoupCount, pointsCount 将由 storeBindings 提供
    defaultAvatarUrl: api.assets.local.avatar,
    buttonConfig: {
      type: 'light',
      text: '登录'
    },
    isLoggingOut: false,
    // 用户信息设置弹窗
    showUserInfoModal: false,
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

    // 同步用户ID，确保用户状态最新
    // refreshPageDataStore 会处理 rootStore.syncUserInfo
    this.refreshPageDataStore();
    // 更新tabBar状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      });
    }
  },

  /**
   * 刷新页面数据
   * 使用async/await优化异步流程
   * @param {boolean} showToast - 是否显示操作成功提示
   * @returns {Promise<void>}
   */
  async refreshPageData(showToast = false) {
    // 调用 store action 刷新数据
    await this.refreshPageDataStore(showToast);
    // 根据登录状态更新按钮
    this.updateButtonConfig();
  },

  updateButtonConfig() {
    if (rootStore.isLoggedIn) {
      this.setData({
        buttonConfig: {
          type: 'unlight',
          text: '退出登录'
        }
      });
    } else {
      this.setData({
        buttonConfig: {
          type: 'light',
          text: '登录'
        }
      });
    }
  },

  // updateStatistics 方法已移至 userStore，通过 storeBindings 自动更新
  // 此处已移除 updateUserInfo 方法，使用 refreshPageData 方法替代

  /**
   * 处理头像选择
   * 增强版本，解决chooseAvatar:fail another chooseAvatar is in progress错误
   */
  async onChooseAvatar(e) {
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

    try {
      // 添加延迟，确保微信内部的chooseAvatar操作完全结束
      await new Promise(resolve => setTimeout(resolve, 500));
      // 调用 store action 更新头像
      await this.updateAvatarAction(avatarUrl);
      wx.showToast({
        title: '头像上传成功',
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      wx.showToast({
        title: '头像上传失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      // 延迟重置标志，避免快速连续点击
      // 使用更长的延迟时间
      setTimeout(() => {
        this._isUploadingAvatar = false;
        // 确保两个状态都被重置
        this._isChoosingAvatar = false;
      }, 2000);
    }
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

      // 更新本地编辑中的昵称
      this.setData({
        editingNickName: value
      });
    }, 500);
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

      // 从 store 获取用户信息
      const currentUserInfo = rootStore.userStore.userInfo;

      // 更新页面数据，显示弹窗
      // userInfo 将通过 storeBindings 自动更新，这里只需确保 modal 显示时数据已准备好
      this.setData({
        // 临时存储用于编辑的昵称，避免直接修改 store 中的数据
        editingNickName: currentUserInfo?.nickName || '',
        editingAvatarUrl: currentUserInfo?.avatarUrl || this.data.defaultAvatarUrl,
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
    this.refreshPageDataStore(false);
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
      // 获取当前编辑中的用户信息
      const nickName = useDefault ? '' : this.data.editingNickName;
      // avatarUrl 不需要在这里更新，头像更新有单独的 onChooseAvatar 逻辑

      // 异步设置用户信息
      await this.updateUserProfile({ nickName });

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
      await this.refreshPageDataStore(false);

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
      this.refreshPageDataStore(false);

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

      // 登录成功后，syncUserInfo 会在 userService.login 内部或 rootStore 中处理
      // refreshPageDataStore 会自动获取最新数据
      await this.refreshPageDataStore(false);
      this.updateButtonConfig(); // 更新按钮状态

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
          userService.logout().then(async () => {
            // 退出登录后，同步用户信息（这将清除本地缓存和store中的用户信息）
            await rootStore.syncUserInfo(); 
            // 刷新页面数据，store会自动更新UI
            await this.refreshPageDataStore(false);
            this.updateButtonConfig(); // 更新按钮状态
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
   * 刷新用户信息 - 由detective-card组件触发
   */
  async refreshUserInfo() {
    // 调用 store action 刷新数据
    await this.refreshPageDataStore(true); // showToast = true
    // detective-card 组件应通过 props 或事件与页面通信，或直接绑定到 store
    // 此处假设 detective-card 能够响应 store 的变化或通过事件触发更新
  },

  /**
   * 检查登录状态 - 由detective-card组件触发
   */
  checkLoginStatus() {
    // 登录状态检查应由 rootStore.isLoggedIn 或 userService.checkLoginStatus(true) 处理
    // 通常在需要执行操作前检查，而不是作为一个独立的页面方法暴露给组件
    // 如果组件需要知道登录状态，应通过 props 传递或绑定到 store
    return rootStore.isLoggedIn;
  },

  /**
   * 处理detective-card组件的签到请求
   */
  async handleDetectiveCardSignIn() {
    try {
      // 调用 store action 进行签到
      const signInResult = await this.signInAction();

      if (signInResult.success) {
        wx.showToast({
          title: '签到成功',
          icon: 'success',
          duration: 2000
        });
        wx.vibrateShort({ type: 'medium' });
        if (signInResult.data?.levelUp) {
          userService.showLevelUpNotification(signInResult.data.levelTitle);
        }
        // 刷新用户信息，store 会自动更新相关数据
        await this.refreshPageDataStore(false);
        this.handleSignInResult({ detail: signInResult });
      } else {
        wx.showToast({
          title: signInResult.error || '签到失败',
          icon: 'none',
          duration: 2000
        });
        this.handleSignInResult({ detail: signInResult });
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

        // 通知detective-card组件已签到
        this.handleSignInResult({
          detail: {
            success: true,
            alreadySignedIn: true
          }
        });
      } else {
        wx.showToast({
          title: '签到失败，请重试',
          icon: 'none',
          duration: 2000
        });

        // 通知detective-card组件签到失败
        this.handleSignInResult({
          detail: {
            success: false,
            error: errorMsg
          }
        });
      }
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
        await this.refreshPageDataStore(false);
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
   * 刷新页面数据
   * 当导航栏左侧按钮点击时触发
   */
  onRefreshPage() {
    console.log('刷新个人中心页面数据');
    // 刷新页面数据并显示提示
    this.refreshPageDataStore(true);
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