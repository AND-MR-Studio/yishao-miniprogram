/**
 * 用户API接口实现
 * 负责封装所有与用户API相关的接口调用
 * 实现接口层设计，与服务层解耦
 */
const { get, post } = require('../utils/request');
const urlConfig = require('../config/url-config');

/**
 * 用户API接口实现类
 * 提供所有用户相关的API调用方法
 */
const userApiImpl = {
  /**
   * 获取用户信息
   * @returns {Promise<Object>} 用户信息
   */
  getUserInfo: async () => {
    try {
      const response = await get('get_user_info', {
        url: urlConfig.userUrl.info()
      });
      
      return response;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return { success: false, error: '获取用户信息失败' };
    }
  },

  /**
   * 登录
   * @returns {Promise<Object>} 登录结果
   */
  login: async () => {
    try {
      // 执行微信登录
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        });
      });

      // 发送code到后台换取token
      const response = await post('user_login', {
        url: urlConfig.userUrl.login(),
        data: {
          code: loginResult.code,
          userInfo: {
            nickName: ''
          }
        }
      });

      return response;
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: '登录失败' };
    }
  },

  /**
   * 更新用户资料
   * @param {object} profileData - 用户资料数据
   * @returns {Promise<Object>} 更新结果
   */
  updateUserInfo: async (profileData) => {
    if (!profileData || Object.keys(profileData).length === 0) {
      return { success: false, error: '无更新内容' };
    }

    try {
      const response = await post('update_user_info', {
        url: urlConfig.userUrl.update(),
        data: profileData
      });

      return response;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      return { success: false, error: '更新用户资料失败' };
    }
  },

  /**
   * 更新用户收藏的汤
   * @param {string} soupId - 汤ID
   * @param {boolean} isFavorite - 是否收藏
   * @returns {Promise<Object>} 更新结果
   */
  updateFavoriteSoup: async (soupId, isFavorite) => {
    if (!soupId) {
      return { success: false, error: '汤ID为空' };
    }

    try {
      const response = await post('update_favorite_soup', {
        url: urlConfig.userUrl.favoriteSoup(),
        data: { soupId, isFavorite }
      });

      return response;
    } catch (error) {
      console.error('更新收藏记录失败:', error);
      return { success: false, error: '更新收藏记录失败' };
    }
  },

  /**
   * 更新用户点赞的汤
   * @param {string} soupId - 汤ID
   * @param {boolean} isLike - 是否点赞
   * @returns {Promise<Object>} 更新结果
   */
  updateLikedSoup: async (soupId, isLike) => {
    if (!soupId) {
      return { success: false, error: '汤ID为空' };
    }

    try {
      const response = await post('update_liked_soup', {
        url: urlConfig.userUrl.likedSoup(),
        data: { soupId, isLike }
      });

      return response;
    } catch (error) {
      console.error('更新点赞记录失败:', error);
      return { success: false, error: '更新点赞记录失败' };
    }
  },

  /**
   * 更新用户已解决的汤
   * @param {string} soupId - 汤ID
   * @returns {Promise<Object>} 更新结果
   */
  updateSolvedSoup: async (soupId) => {
    if (!soupId) {
      return { success: false, error: '汤ID为空' };
    }

    try {
      const response = await post('update_solved_soup', {
        url: urlConfig.userUrl.solvedSoup(),
        data: { soupId }
      });

      return response;
    } catch (error) {
      console.error('更新解决记录失败:', error);
      return { success: false, error: '更新解决记录失败' };
    }
  },

  /**
   * 获取用户创建的汤面列表
   * @returns {Promise<Object>} 用户创建的汤面列表
   */
  getUserCreatedSoups: async () => {
    try {
      const response = await get('get_user_created_soups', {
        url: urlConfig.userUrl.createdSoup()
      });

      return response;
    } catch (error) {
      console.error('获取用户创建的汤面失败:', error);
      return { success: false, error: '获取用户创建的汤面失败' };
    }
  }
};

module.exports = userApiImpl;