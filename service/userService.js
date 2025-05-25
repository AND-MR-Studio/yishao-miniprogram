// service/userService.js - 纯服务层，只负责API调用
const { userRequest, api } = require('../config/api');

/**
 * 用户服务层 - 纯函数集合
 * 严格遵循三层架构分离原则：
 * - 只负责API调用，不包含业务逻辑
 * - 不处理本地存储和状态管理
 * - 统一返回 {success, data, error} 格式
 * - 使用函数式API URL格式
 */

/**
 * 获取用户信息
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function getUserInfo() {
  try {
    const config = {
      url: api.user.info,
      method: 'GET'
    };

    const res = await userRequest(config);
    if (res.success && res.data) {
      return { success: true, data: res.data };
    } else {
      return { success: false, error: res.error || '获取用户信息失败' };
    }
  } catch (error) {
    return { success: false, error: '获取用户信息失败' };
  }
}

/**
 * 登录
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function login() {
  try {
    // 执行微信登录
    const loginResult = await new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      });
    });

    // 发送code到后台换取token
    const config = {
      url: api.user.login,
      method: 'POST',
      data: {
        code: loginResult.code,
        userInfo: {
          nickName: ''
        }
      }
    };

    const res = await userRequest(config);
    if (res.success && res.data) {
      return { success: true, data: res.data };
    } else {
      return { success: false, error: res.error || '登录失败' };
    }
  } catch (error) {
    return { success: false, error: '登录失败' };
  }
}

/**
 * 退出登录 - 纯API调用，不处理本地存储
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function logout() {
  try {
    // 只负责API调用，本地存储清理由Store层处理
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: '退出登录失败' };
  }
}


/**
 * 更新用户资料
 * @param {object} profileData - 用户资料数据
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function updateUserInfo(profileData) {
  if (!profileData || Object.keys(profileData).length === 0) {
    return { success: false, error: '无更新内容' };
  }

  try {
    const config = {
      url: api.user.update,
      method: 'POST',
      data: profileData
    };

    const res = await userRequest(config);
    return res.success ? { success: true, data: res.data } : { success: false, error: res.error || '更新用户资料失败' };
  } catch (error) {
    return { success: false, error: '更新用户资料失败' };
  }
}

/**
 * 更新用户收藏的汤
 * @param {string} soupId - 汤ID
 * @param {boolean} isFavorite - 是否收藏
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function updateFavoriteSoup(soupId, isFavorite) {
  if (!soupId) {
    return { success: false, error: '汤ID为空' };
  }

  try {
    const config = {
      url: api.user.favoriteSoup,
      method: 'POST',
      data: { soupId, isFavorite }
    };

    const res = await userRequest(config);
    return res.success ? { success: true, data: res.data } : { success: false, error: res.error || '更新收藏记录失败' };
  } catch (error) {
    return { success: false, error: '更新收藏记录失败' };
  }
}

/**
 * 更新用户点赞的汤
 * @param {string} soupId - 汤ID
 * @param {boolean} isLike - 是否点赞
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function updateLikedSoup(soupId, isLike) {
  if (!soupId) {
    return { success: false, error: '汤ID为空' };
  }

  try {
    const config = {
      url: api.user.likedSoup,
      method: 'POST',
      data: { soupId, isLike }
    };

    const res = await userRequest(config);
    return res.success ? { success: true, data: res.data } : { success: false, error: res.error || '更新点赞记录失败' };
  } catch (error) {
    return { success: false, error: '更新点赞记录失败' };
  }
}

/**
 * 更新用户已解决的汤
 * @param {string} soupId - 汤ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function updateSolvedSoup(soupId) {
  if (!soupId) {
    return { success: false, error: '汤ID为空' };
  }

  try {
    const config = {
      url: api.user.solvedSoup,
      method: 'POST',
      data: { soupId }
    };

    const res = await userRequest(config);
    return res.success ? { success: true, data: res.data } : { success: false, error: res.error || '更新解决记录失败' };
  } catch (error) {
    return { success: false, error: '更新解决记录失败' };
  }
}

module.exports = {
  getUserInfo,
  login,
  logout,
  updateUserInfo,
  updateFavoriteSoup,
  updateLikedSoup,
  updateSolvedSoup
};
