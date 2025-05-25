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

  // 统一加载状态管理 - MobX 最佳实践
  loading = {
    login: false,      // 登录操作加载状态
    logout: false,     // 退出登录操作加载状态
    avatar: false,     // 头像上传加载状态
    profile: false,    // 资料更新加载状态
    sync: false        // 用户信息同步加载状态（对应原来的 isLoading）
  };

  // 引用rootStore
  rootStore = null;

  constructor() {
    makeAutoObservable(this, {
      // 标记异步方法为flow
      login: flow,
      logout: flow,
      updateAvatar: flow,
      updateUserProfile: flow,
      syncUserInfo: flow,
      favoriteSoup: flow,
      likeSoup: flow,
      solveSoup: flow,
      toggleFavorite: flow,
      toggleLike: flow,

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
   * 侦探信息 - 为 detective-card 组件提供完整的侦探信息
   */
  get detectiveInfo() {
    if (!this.isLoggedIn || !this.userInfo) {
      return null;
    }

    const info = this.userInfo;
    return {
      isLoggedIn: true,
      nickName: info.nickname || '',
      detectiveId: info.detectiveId || '',
      levelTitle: info.levelTitle || '新手侦探',
      remainingAnswers: info.remainingAnswers || 0,
      unsolvedCount: info.unsolvedCount || 0,
      solvedCount: info.solvedSoups?.length || 0,
      creationCount: info.createSoups?.length || 0,
      favoriteCount: info.favoriteSoups?.length || 0,
      avatarUrl: info.avatarUrl || DEFAULT_AVATAR_URL
    };
  }

  /**
   * 是否已签到 - 直接使用后端返回的签到状态
   */
  get hasSignedIn() {
    return this.userInfo?.hasSignedIn || false;
  }

  // ===== Actions =====

  /**
   * 统一的加载状态管理方法
   * @param {string} type - 加载类型：'login', 'logout', 'avatar', 'profile', 'sync'
   * @param {boolean} status - 加载状态：true 表示开始加载，false 表示结束加载
   */
  setLoading(type, status) {
    if (this.loading.hasOwnProperty(type)) {
      this.loading[type] = status;
    } else {
      console.warn(`未知的加载类型: ${type}`);
    }
  }

  /**
   * 同步用户信息 - 优化版本，避免循环调用
   * userStore 作为用户信息的单一数据源
   */
  *syncUserInfo() {
    // 防止重复调用
    if (this.loading.sync) {
      console.log('用户信息正在同步中，跳过重复调用');
      return { success: false, error: '正在同步中' };
    }

    try {
      this.setLoading('sync', true);
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
      this.setLoading('sync', false);
    }
  }

  /**
   * 登录 - 包含本地存储管理
   */
  *login() {
    if (this.loading.login) {
      return { success: false, error: '正在登录中' };
    }

    try {
      this.setLoading('login', true);

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
      this.setLoading('login', false);
    }
  }

  /**
   * 退出登录 - 包含本地存储清理
   */
  *logout() {
    if (this.loading.logout) {
      return { success: false, error: '正在退出登录中' };
    }

    try {
      this.setLoading('logout', true);
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
      this.setLoading('logout', false);
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
      this.setLoading('avatar', true);

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
      this.setLoading('avatar', false);
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
      this.setLoading('profile', true);
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
      this.setLoading('profile', false);
    }
  }

  // ===== 用户交互相关方法 - 重构为直接操作模式 =====

  /**
   * 收藏/取消收藏汤面
   * 直接发起操作请求，后端统一处理状态更新
   * @param {string} soupId - 汤ID
   * @param {boolean} isFavorite - 是否收藏
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  *favoriteSoup(soupId, isFavorite) {
    if (!this.isLoggedIn) {
      return { success: false, error: '用户未登录' };
    }

    try {
      // 直接发起操作请求
      const result = yield userService.updateFavoriteSoup(soupId, isFavorite);

      if (result.success) {
        // 操作成功后同步用户信息，获取最新状态
        yield this.syncUserInfo();
        return {
          success: true,
          data: result.data,
          message: isFavorite ? '收藏成功' : '已取消收藏'
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      return { success: false, error: '收藏操作失败' };
    }
  }

  /**
   * 切换收藏状态 - 便捷方法
   * 自动判断当前状态并切换
   * @param {string} soupId - 汤ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  *toggleFavorite(soupId) {
    const currentStatus = this.isFavoriteSoup(soupId);
    return yield this.favoriteSoup(soupId, !currentStatus);
  }

  /**
   * 点赞/取消点赞汤面
   * 直接发起操作请求，后端统一处理状态更新
   * @param {string} soupId - 汤ID
   * @param {boolean} isLike - 是否点赞
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  *likeSoup(soupId, isLike) {
    if (!this.isLoggedIn) {
      return { success: false, error: '用户未登录' };
    }

    try {
      // 直接发起操作请求
      const result = yield userService.updateLikedSoup(soupId, isLike);

      if (result.success) {
        // 操作成功后同步用户信息，获取最新状态
        yield this.syncUserInfo();
        return {
          success: true,
          data: result.data,
          message: isLike ? '点赞成功' : '已取消点赞'
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
      return { success: false, error: '点赞操作失败' };
    }
  }

  /**
   * 切换点赞状态 - 便捷方法
   * 自动判断当前状态并切换
   * @param {string} soupId - 汤ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  *toggleLike(soupId) {
    const currentStatus = this.isLikedSoup(soupId);
    return yield this.likeSoup(soupId, !currentStatus);
  }

  /**
   * 标记汤面为已解决
   * 直接发起操作请求，后端统一处理状态更新
   * @param {string} soupId - 汤ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  *solveSoup(soupId) {
    if (!this.isLoggedIn) {
      return { success: false, error: '用户未登录' };
    }

    try {
      // 直接发起操作请求
      const result = yield userService.updateSolvedSoup(soupId);

      if (result.success) {
        // 操作成功后同步用户信息，获取最新状态
        yield this.syncUserInfo();
        return {
          success: true,
          data: result.data,
          message: '已标记为解决'
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('标记解决失败:', error);
      return { success: false, error: '标记解决失败' };
    }
  }

  // ===== 状态查询方法 - 从本地 userInfo 直接读取 =====

  /**
   * 检查用户是否收藏了某个汤
   * @param {string} soupId - 汤ID
   * @returns {boolean} 是否收藏
   */
  isFavoriteSoup(soupId) {
    if (!this.isLoggedIn || !this.userInfo) {
      return false;
    }
    return Array.isArray(this.userInfo.favoriteSoups) && this.userInfo.favoriteSoups.includes(soupId);
  }

  /**
   * 检查用户是否点赞了某个汤
   * @param {string} soupId - 汤ID
   * @returns {boolean} 是否点赞
   */
  isLikedSoup(soupId) {
    if (!this.isLoggedIn || !this.userInfo) {
      return false;
    }
    return Array.isArray(this.userInfo.likedSoups) && this.userInfo.likedSoups.includes(soupId);
  }

  /**
   * 检查用户是否已解决某个汤
   * @param {string} soupId - 汤ID
   * @returns {boolean} 是否已解决
   */
  isSolvedSoup(soupId) {
    if (!this.isLoggedIn || !this.userInfo) {
      return false;
    }
    return Array.isArray(this.userInfo.solvedSoups) && this.userInfo.solvedSoups.includes(soupId);
  }
}

module.exports = {
  UserStoreClass: UserStore, // 导出类本身，在 rootStore 中实例化
};