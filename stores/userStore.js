// stores/userStore.js - 标准MobX用户状态管理
const { makeAutoObservable, flow } = require('mobx-miniprogram');
const userService = require('../service/userService');
const { api, assets, uploadFile } = require('../config/api');

// 定义常量
const DEFAULT_AVATAR_URL = assets.local.avatar;
const TOKEN_KEY = 'token';
const LOGIN_TIMESTAMP_KEY = 'loginTimestamp';

class UserStore {
  // ===== 可观察状态 =====
  // 用户基础信息
  userInfo = null; // 用户信息

  // 加载状态
  isLoading = false; // 是否正在加载
  loginLoading = false; // 登录加载状态
  logoutLoading = false; // 退出登录加载状态
  avatarUploading = false; // 头像上传状态
  profileUpdating = false; // 资料更新状态

  // 引用rootStore
  rootStore = null;

  constructor(rootStore) {
    this.rootStore = rootStore;

    makeAutoObservable(this, {
      // 标记异步方法为flow
      login: flow,
      logout: flow,
      updateAvatar: flow,
      updateUserProfile: flow,
      syncUserInfo: flow,

      // 标记为非观察属性
      rootStore: false,
    });
  }

  // ===== 计算属性 =====

  /**
   * 用户ID - 单一数据源
   */
  get userId() {
    return this.userInfo?.id || '';
  }

  /**
   * 登录状态
   */
  get isLoggedIn() {
    return !!this.userId;
  }

  /**
   * 用户头像
   */
  get userAvatar() {
    return this.userInfo?.avatarUrl || DEFAULT_AVATAR_URL;
  }

  /**
   * 剩余提问次数
   */
  get remainingAnswers() {
    return this.userInfo?.remainingAnswers || 0;
  }

  /**
   * 侦探ID
   */
  get detectiveId() {
    return this.userInfo?.detectiveId || null;
  }

  /**
   * 用户昵称
   */
  get nickname() {
    return this.userInfo?.nickname || '';
  }

  /**
   * 用户统计信息
   */
  get userStats() {
    const info = this.userInfo;
    return {
      totalSoupCount: info?.totalSoupCount || 0,
      solvedCount: info?.solvedSoups?.length || 0,
      createdCount: info?.createSoups?.length || 0,
      favoriteCount: info?.favoriteSoups?.length || 0,
      pointsCount: info?.pointsCount || 0
    };
  }

  // ===== Actions =====

  /**
   * 同步用户信息 - 优化版本，避免循环调用
   * userStore 作为用户信息的单一数据源
   */
  *syncUserInfo() {
    // 防止重复调用
    if (this.isLoading) {
      console.log('用户信息正在同步中，跳过重复调用');
      return { success: false, error: '正在同步中' };
    }

    try {
      this.isLoading = true;
      const result = yield userService.getUserInfo();

      if (result.success) {
        // 检查数据是否有变化，避免不必要的更新
        const hasChanged = JSON.stringify(this.userInfo) !== JSON.stringify(result.data);
        if (hasChanged) {
          this.userInfo = result.data;
          console.log('用户信息已更新');
        } else {
          console.log('用户信息无变化，跳过更新');
        }
      } else {
        // 获取失败，清空用户信息
        this.userInfo = null;
        console.log('用户信息获取失败，已清空本地数据');
      }

      return result;
    } catch (error) {
      console.error('同步用户信息失败:', error);
      this.userInfo = null;
      return { success: false, error: '同步用户信息失败' };
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 登录 - 包含本地存储管理
   */
  *login() {
    if (this.loginLoading) {
      return { success: false, error: '正在登录中' };
    }

    try {
      this.loginLoading = true;

      // 检查是否已经登录
      const token = wx.getStorageSync(TOKEN_KEY);
      if (token) {
        // 已登录，获取用户信息
        const userInfoResult = yield userService.getUserInfo();
        if (userInfoResult.success) {
          this.userInfo = userInfoResult.data;
          return { success: true, data: userInfoResult.data };
        } else {
          // token可能已过期，继续执行登录流程
          this.clearLocalStorage();
        }
      }

      const result = yield userService.login();

      if (result.success) {
        // 保存token和用户信息到本地存储
        if (result.data.token) {
          wx.setStorageSync(TOKEN_KEY, result.data.token);
          wx.setStorageSync(LOGIN_TIMESTAMP_KEY, Date.now());
        }
        this.userInfo = result.data;
        console.log('登录成功，用户信息已更新');
      }

      return result;
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: '登录失败' };
    } finally {
      this.loginLoading = false;
    }
  }

  /**
   * 退出登录 - 包含本地存储清理
   */
  *logout() {
    if (this.logoutLoading) {
      return { success: false, error: '正在退出登录中' };
    }

    try {
      this.logoutLoading = true;
      const result = yield userService.logout();

      if (result.success) {
        // 清理本地存储和状态
        this.clearLocalStorage();
        this.userInfo = null;
        console.log('退出登录成功，用户信息已清空');
      }

      return result;
    } catch (error) {
      console.error('退出登录失败:', error);
      return { success: false, error: '退出登录失败' };
    } finally {
      this.logoutLoading = false;
    }
  }

  /**
   * 清理本地存储
   */
  clearLocalStorage() {
    try {
      wx.removeStorageSync(TOKEN_KEY);
      wx.removeStorageSync(LOGIN_TIMESTAMP_KEY);
      wx.removeStorageSync('userStats');
      wx.removeStorageSync('userLevel');

      // 清除全局数据
      const app = getApp();
      if (app && app.globalData) {
        if (app.globalData.userInfo) {
          app.globalData.userInfo = null;
        }
        if (app.globalData.detectiveInfo) {
          app.globalData.detectiveInfo = null;
        }
      }
    } catch (error) {
      console.error('清理本地存储失败:', error);
    }
  }

  /**
   * 上传头像
   */
  *updateAvatar(avatarPath) {
    if (!avatarPath) {
      return { success: false, error: '头像路径为空' };
    }

    if (!this.isLoggedIn) {
      return { success: false, error: '用户未登录' };
    }

    try {
      this.avatarUploading = true;

      const result = yield uploadFile({
        url: api.asset.upload,
        filePath: avatarPath,
        name: 'file',
        formData: {
          type: 'avatar',
          userId: this.userId,
          timestamp: new Date().getTime()
        }
      });

      if (result.success && result.data && result.data.url) {
        // 上传成功后同步用户信息
        yield this.syncUserInfo();
        return { success: true, data: result.data.url };
      } else {
        return { success: false, error: result.error || '上传头像失败' };
      }
    } catch (error) {
      console.error('上传头像失败:', error);
      return { success: false, error: '上传头像失败' };
    } finally {
      this.avatarUploading = false;
    }
  }

  /**
   * 更新用户资料
   */
  *updateUserProfile(profileData) {
    if (!profileData || Object.keys(profileData).length === 0) {
      return { success: false, error: '无更新内容' };
    }

    if (!this.isLoggedIn) {
      return { success: false, error: '用户未登录' };
    }

    try {
      this.profileUpdating = true;
      const result = yield userService.updateUserInfo(profileData);

      if (result.success) {
        // 更新成功后同步用户信息
        yield this.syncUserInfo();
      }

      return result;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      return { success: false, error: '更新用户资料失败' };
    } finally {
      this.profileUpdating = false;
    }
  }

  // ===== 用户交互相关方法 =====

  /**
   * 更新用户收藏状态
   */
  async updateFavoriteSoup(soupId, isFavorite) {
    if (!this.isLoggedIn) {
      return { success: false, error: '用户未登录' };
    }
    return await userService.updateFavoriteSoup(soupId, isFavorite);
  }

  /**
   * 检查用户是否收藏了某个汤
   */
  async isFavoriteSoup(soupId) {
    if (!this.isLoggedIn) {
      return { success: true, data: false }; // 未登录默认未收藏
    }

    try {
      if (this.userInfo && Array.isArray(this.userInfo.favoriteSoups)) {
        const isFavorite = this.userInfo.favoriteSoups.includes(soupId);
        return { success: true, data: isFavorite };
      } else {
        return { success: true, data: false };
      }
    } catch (error) {
      return { success: false, error: '检查收藏状态失败' };
    }
  }

  /**
   * 更新用户点赞状态
   */
  async updateLikedSoup(soupId, isLike) {
    if (!this.isLoggedIn) {
      return { success: false, error: '用户未登录' };
    }
    return await userService.updateLikedSoup(soupId, isLike);
  }

  /**
   * 检查用户是否点赞了某个汤
   */
  async isLikedSoup(soupId) {
    if (!this.isLoggedIn) {
      return { success: true, data: false }; // 未登录默认未点赞
    }

    try {
      if (this.userInfo && Array.isArray(this.userInfo.likedSoups)) {
        const isLiked = this.userInfo.likedSoups.includes(soupId);
        return { success: true, data: isLiked };
      } else {
        return { success: true, data: false };
      }
    } catch (error) {
      return { success: false, error: '检查点赞状态失败' };
    }
  }

  /**
   * 检查用户是否已解决某个汤
   */
  async isSolvedSoup(soupId) {
    if (!this.isLoggedIn) {
      return { success: true, data: false }; // 未登录默认未解决
    }

    try {
      if (this.userInfo && Array.isArray(this.userInfo.solvedSoups)) {
        const isSolved = this.userInfo.solvedSoups.includes(soupId);
        return { success: true, data: isSolved };
      } else {
        return { success: true, data: false };
      }
    } catch (error) {
      return { success: false, error: '检查解决状态失败' };
    }
  }
}

module.exports = {
  UserStoreClass: UserStore, // 导出类本身，在 rootStore 中实例化
};