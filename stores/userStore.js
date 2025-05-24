// stores/userStore.js
const { makeAutoObservable, flow } = require('mobx-miniprogram');
const userService = require('../service/userService');
const { api, assets, userRequest, assetRequestOpen, uploadFile } = require('../config/api'); // 引入需要的API配置和请求方法

// 定义常量
const TOKEN_KEY = 'token'; // 使用token作为唯一的本地存储键
// 本地默认头像URL，仅作为前端兜底显示
const DEFAULT_AVATAR_URL = assets.local.avatar;

class UserStore {
  rootStore = null;
  // 用户相关的状态，例如：
  // settings = {}; // 用户设置
  // activityHistory = []; // 用户活动历史

  constructor(rootStore) {
    makeAutoObservable(this, {
      rootStore: false, // rootStore 不需要响应式
      // 异步操作标记为 flow
      // exampleAsyncAction: flow,
      updateAvatar: flow,
      updateUserProfile: flow,
    });
    this.rootStore = rootStore;
  }

  // 可以在这里定义用户相关的 actions 和 computed properties

  /**
   * 获取当前用户头像，优先从 rootStore.userInfo 中获取，如果不存在则使用默认头像
   * @returns {string} 头像URL
   */
  get userAvatar() {
    return this.rootStore.userInfo?.avatarUrl || DEFAULT_AVATAR_URL;
  }


  /**
   * 获取剩余提问次数，从 rootStore.userInfo 中获取
   * @returns {number} 剩余提问次数
   */
  get remainingAnswers() {
    return this.rootStore.userInfo?.remainingAnswers || 0;
  }

  /**
   * 获取用户侦探ID，从 rootStore.userInfo 中获取
   * @returns {string | null} 侦探ID或null
   */
  get detectiveId() {
    return this.rootStore.userInfo?.detectiveId || null;
  }

  /**
   * 上传用户头像图片
   * @param {string} avatarPath - 头像临时文件路径
   * @returns {Promise<object>} 上传结果 { success: boolean, avatarUrl?: string, message: string }
   */
  *updateAvatar(avatarPath) {
    if (!avatarPath) return { success: false, message: '头像路径为空' };

    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return { success: false, message: '用户未登录，请先登录' };
    }

    const userId = this.rootStore.userId;
    if (!userId) {
      return { success: false, message: '获取用户ID失败' };
    }

    try {
      wx.showToast({
        title: '上传头像中...',
        icon: 'loading',
        duration: 10000
      });

      const result = yield uploadFile({
        url: api.asset.upload,
        filePath: avatarPath,
        name: 'file',
        formData: {
          type: 'avatar',
          userId: userId,
          timestamp: new Date().getTime()
        }
      });

      wx.hideToast();

      if (result.success && result.data && result.data.url) {
        // 头像上传成功后，调用 rootStore.syncUserInfo 来刷新整个用户信息
        // 这会确保 userInfo.avatarUrl 以及其他可能变更的信息得到更新
        yield this.rootStore.syncUserInfo(); 
        wx.showToast({
          title: '头像上传成功',
          icon: 'success',
          duration: 2000
        });
        return {
          success: true,
          avatarUrl: result.data.url,
          message: '头像上传成功'
        };
      } else {
        wx.showToast({
          title: result.error || '上传头像失败',
          icon: 'none',
          duration: 2000
        });
        return { success: false, message: result.error || '上传头像失败' };
      }
    } catch (error) {
      wx.hideToast();
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none',
        duration: 2000
      });
      console.error('Update avatar error:', error);
      return { success: false, message: '上传失败，请重试' };
    }
  }

  /**
   * 登录
   * @returns {Promise<object>} 登录结果 { success: boolean, message: string }
   */
  *login() {
    try {
      const res = yield userService.login(); // 调用 userService 中的登录逻辑
      if (res.success) {
        yield this.rootStore.syncUserInfo(); // 登录成功后同步用户信息
        return { success: true, message: '登录成功' };
      } else {
        return { success: false, message: res.error || '登录失败' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: '登录失败，请重试' };
    }
  }

  /**
   * 退出登录
   * @returns {Promise<object>} 退出登录结果 { success: boolean, message: string }
   */
  *logout() {
    try {
      const res = yield userService.logout(); // 调用 userService 中的退出登录逻辑
      if (res.success) {
        yield this.rootStore.syncUserInfo(); // 退出登录成功后同步用户信息（会清除本地缓存和store中的用户信息）
        return { success: true, message: '退出登录成功' };
      } else {
        return { success: false, message: res.error || '退出登录失败' };
      }
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: '退出登录失败，请重试' };
    }
  }

  /**
   * 更新用户昵称等基本信息
   * @param {object} profileData - 需要更新的用户信息，例如 { nickname: '新的昵称' }
   * @returns {Promise<object>} 更新结果 { success: boolean, message: string, data?: object }
   */
  *updateUserProfile(profileData) {
    if (!profileData || Object.keys(profileData).length === 0) {
      return { success: false, message: '无更新内容' };
    }
    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return { success: false, message: '用户未登录' };
    }

    try {
      const config = {
        url: api.user.update, // 假设存在更新用户信息的API端点
        method: 'POST',
        data: profileData
      };
      const response = yield userRequest(config);
      if (response.success) {
        // 更新成功后，也需要同步 rootStore 中的用户信息
        yield this.rootStore.syncUserInfo();
        return { success: true, message: '用户信息更新成功', data: response.data };
      } else {
        return { success: false, message: response.error || '用户信息更新失败' };
      }
    } catch (error) {
      console.error('Update user profile error:', error);
      return { success: false, message: '用户信息更新失败，请重试' };
    }
  }
}

module.exports = {
  UserStoreClass: UserStore, // 导出类本身，在 rootStore 中实例化
};