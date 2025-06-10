// stores/userStore.js - 标准MobX用户状态管理
const { makeAutoObservable, flow } = require('mobx-miniprogram');
const userService = require('../service/userService');
const { assets } = require('../config/assets');

class UserStore {
  // ===== 可观察状态 =====
  // 用户基础信息
  userInfo = null; // 用户信息

  // 统一加载状态管理 - MobX 最佳实践
  loading = {
    login: false,      // 登录操作加载状态
    logout: false,     // 退出登录操作加载状态
    profile: false,    // 用户资料更新加载状态（包括头像上传）
    sync: false        // 用户信息同步加载状态
  };
  constructor() {
    makeAutoObservable(this, {
      // 标记异步方法为flow
      login: flow,
      logout: flow,
      updateUserProfile: flow,
      syncUserInfo: flow,
      favoriteSoup: flow,
      likeSoup: flow,
      solveSoup: flow,
      updateAnsweredSoup: flow,
      toggleFavorite: flow,
      toggleLike: flow,
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
      avatarUrl: info.avatarUrl || assets.local.avatar
    };
  }

  get hasSignedIn() {
    return this.userInfo?.hasSignedIn || false;
  }

  // ===== Actions =====

  *syncUserInfo() {
    // 防止重复调用
    if (this.loading.sync) {
      console.log('用户信息正在同步中，跳过重复调用');
      return { success: false, error: '正在同步中' };
    }

    try {
      this.loading.sync = true;
      const result = yield userService.getUserInfo();
      
      if (result.success) {
        this.userInfo = result.data;
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || '获取用户信息失败' };
      }
    } catch (error) {
      console.error('同步用户信息失败:', error);
      this.userInfo = null;
      return { success: false, error: '同步用户信息失败' };
    } finally {
      this.loading.sync = false;
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
      this.loading.login = true;
      const result = yield userService.login();

      if (result.success) {
        this.userInfo = result.data;
        console.log('登录成功，用户信息已更新');
      }

      return result;
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: '登录失败' };
    } finally {
      this.loading.login = false;
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
      this.loading.logout = true;
      const result = yield userService.logout();

      if (result.success) {
        this.userInfo = null;
        console.log('退出登录成功，用户信息已清空');
      }

      return result;
    } catch (error) {
      console.error('退出登录失败:', error);
      return { success: false, error: '退出登录失败' };
    } finally {
      this.loading.logout = false;
    }
  }  
  
  *updateUserProfile(profileData) {
    if (!profileData || Object.keys(profileData).length === 0) {
      return { success: false, error: '无更新内容' };
    }


    try {
      this.loading.profile = true;
      const result = yield userService.updateUserInfo(profileData);

      if (result.success) {
        // 更新成功后同步用户信息
        yield this.syncUserInfo();
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || '更新用户资料失败' };
      }
    } catch (error) {
      console.error('更新用户资料失败:', error);
      return { success: false, error: '更新用户资料失败' };
    } finally {
      this.loading.profile = false;
    }
  }

  *favoriteSoup(soupId, isFavorite) {
    try {
      const result = isFavorite 
        ? yield userService.favoriteSoup(soupId)
        : yield userService.unfavoriteSoup(soupId);

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

  *toggleFavorite(soupId) {
    const currentStatus = this.isFavoriteSoup(soupId);
    return yield this.favoriteSoup(soupId, !currentStatus);
  }

  *likeSoup(soupId, isLike) {
    try {
      const result = isLike 
        ? yield userService.likeSoup(soupId)
        : yield userService.unlikeSoup(soupId);

      if (result.success) {
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

  *toggleLike(soupId) {
    const currentStatus = this.isLikedSoup(soupId);
    return yield this.likeSoup(soupId, !currentStatus);
  }

  *solveSoup(soupId) {
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

  *updateAnsweredSoup(soupId) {
    try {
      // 直接发起操作请求
      const result = yield userService.updateAnsweredSoup(soupId);

      if (result.success) {
        return {
          success: true,
          data: result.data,
          message: result.message || '已更新回答记录'
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('更新回答记录失败:', error);
      return { success: false, error: '更新回答记录失败' };
    }
  }

  // ===== 状态查询方法 =====

  isFavoriteSoup(soupId) {
    if (!this.isLoggedIn || !this.userInfo) {
      return false;
    }
    return Array.isArray(this.userInfo.favoriteSoups) && this.userInfo.favoriteSoups.includes(soupId);
  }

  isLikedSoup(soupId) {
    if (!this.isLoggedIn || !this.userInfo) {
      return false;
    }
    return Array.isArray(this.userInfo.likedSoups) && this.userInfo.likedSoups.includes(soupId);
  }

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