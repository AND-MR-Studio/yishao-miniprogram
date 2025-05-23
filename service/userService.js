// utils/userService.js
const { userRequest, assetRequestOpen, uploadFile, api, assets } = require('../config/api');

// 定义常量
const TOKEN_KEY = 'token'; // 使用token作为唯一的本地存储键
// 本地默认头像URL，仅作为前端兜底显示
const DEFAULT_AVATAR_URL = assets.local.avatar;

/**
 * 获取用户信息
 * 简洁的实现，每次都从服务器获取最新数据
 * @returns {Promise} - 返回Promise，包含用户信息
 */
function getUserInfo() {
  try {
    // 检查登录状态
    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return Promise.reject('未登录');
    }

    // 从后端获取最新用户信息
    return new Promise((resolve, reject) => {
      // 调用后端接口获取用户信息
      const config = {
        url: api.user.info,
        method: 'GET'
      };

      // 使用userRequest方法，保持一致性
      userRequest(config).then(res => {
        if (res.success && res.data) {
            // 返回完整的后端数据
            resolve(res.data);
          } else {
          reject('获取用户信息失败');
        }
      }).catch(err => {
        reject(err);
      });
    });
  } catch (error) {
    return Promise.reject('获取用户信息失败');
  }
}





// 登录状态标志
let isLoggingIn = false;

/**
 * 登录
 * @returns {Promise} - 登录结果，包含用户信息和是否已完成资料设置的标志
 */
function login() {
  // 如果已经在登录中，直接返回一个等待的Promise
  if (isLoggingIn) {
    return new Promise((resolve, reject) => {
      // 每100ms检查一次登录状态
      const checkLoginStatus = () => {
        const token = wx.getStorageSync(TOKEN_KEY);

        if (token) {
          // 登录成功，获取用户信息
          getUserInfo()
            .then(userInfo => {
              resolve({userInfo});
            })
            .catch(() => {
              // 即使获取用户信息失败，也认为登录成功
              resolve({userInfo: {isLoggedIn: true}});
            });
        } else if (!isLoggingIn) {
          // 登录已完成但失败
          reject('登录失败');
        } else {
          // 继续等待
          setTimeout(checkLoginStatus, 100);
        }
      };

      checkLoginStatus();
    });
  }

  // 设置登录标志
  isLoggingIn = true;

  return new Promise((resolve, reject) => {
    // 检查是否已经登录
    const token = wx.getStorageSync(TOKEN_KEY);

    if (token) {
      isLoggingIn = false;
      // 如果已登录，从后端获取用户信息
      return getUserInfo()
        .then(backendUserInfo => {
          resolve({
            userInfo: backendUserInfo,
            hasCompletedSetup: false // 始终返回false，强制显示用户信息设置弹窗
          });
        })
        .catch(() => {
          // 即使获取失败，也返回成功，标记为未完成设置
          resolve({
            userInfo: {isLoggedIn: true},
            hasCompletedSetup: false
          });
        });
    }

    // 未登录，执行登录流程
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        const config = {
          url: api.user.login,
          method: 'POST',
          data: {
            code: res.code,
            userInfo: {
              nickName: ''
            }
          }
        };

        userRequest(config).then(res => {
          if (res.success && res.data) {
            // 单独保存 token 到本地存储
            if (res.data.token) {
              wx.setStorageSync('token', res.data.token);
            }

            isLoggingIn = false;



            // 返回登录结果，包含用户信息，始终设置hasCompletedSetup为false
            resolve({
              userInfo: res.data,
              hasCompletedSetup: false // 始终返回false，强制显示用户信息设置弹窗
            });
          } else {
            wx.showToast({
              title: '登录失败，请重试',
              icon: 'none'
            });
            isLoggingIn = false;
            reject('登录失败');
          }
        }).catch(() => {
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
          isLoggingIn = false;
          reject('登录失败');
        });
      },
      fail: () => {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
        isLoggingIn = false;
        reject('登录失败');
      }
    });
  });
}

/**
 * 退出登录
 * @returns {Object} - 退出结果
 */
function logout() {
  // 清除本地存储
  wx.removeStorageSync('loginTimestamp');
  wx.removeStorageSync(TOKEN_KEY); // 清除token

  // 不需要清除缓存，每次都从服务器获取最新数据

  // 清除可能存在的其他用户相关缓存
  wx.removeStorageSync('userStats');
  wx.removeStorageSync('userLevel');

  // 清除任何可能的缓存数据
  const app = getApp();
  if (app && app.globalData) {
    if (app.globalData.userInfo) {
      app.globalData.userInfo = null;
    }
    // 清除其他可能的全局用户数据
    if (app.globalData.detectiveInfo) {
      app.globalData.detectiveInfo = null;
    }
  }

  // 提示用户
  wx.showToast({
    title: '已退出登录',
    icon: 'success',
    duration: 2000
  });

  return {
    success: true,
    message: '已退出登录'
  };
}


/**
 * 更新用户回答过的汤
 * 将当前回答的汤ID添加到用户的answeredSoups数组中
 * 只要创建过dialog对话就算回答过，不管有没有完成
 * @param {string} soupId - 汤ID
 * @returns {Promise} - 更新结果
 */
async function updateAnsweredSoup(soupId) {
  if (!soupId) return Promise.reject('汤ID为空');

  // 检查用户是否已登录
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return Promise.resolve({ success: false, message: '用户未登录' });
  }

  try {
    // 调用后端接口更新用户回答过的汤
    const config = {
      url: api.user.answeredSoup,
      method: 'POST',
      data: {
        soupId: soupId
      }
    };

    const res = await userRequest(config);
    return res;
  } catch (error) {
    // 回答记录更新失败不影响用户体验，返回静默失败
    return { success: false, message: '更新回答记录失败' };
  }
}

/**
 * 通用方法：更新用户与汤的交互状态
 * @param {string} soupId - 汤ID
 * @param {boolean} status - 交互状态（true/false）
 * @param {string} type - 交互类型（'favorite'/'like'）
 * @returns {Promise} - 更新结果
 */
async function updateSoupInteraction(soupId, status, type) {
  if (!soupId) return Promise.reject('汤ID为空');

  // 检查用户是否已登录
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return Promise.resolve({ success: false, message: '用户未登录' });
  }

  try {
    // 根据交互类型确定API和参数
    let url, data;

    if (type === 'favorite') {
      url = api.user.favoriteSoup;
      data = { soupId, isFavorite: status };
    } else if (type === 'like') {
      url = api.user.likedSoup;
      data = { soupId, isLike: status };
    } else {
      return Promise.reject('不支持的交互类型');
    }

    // 调用后端接口更新用户交互状态
    const config = {
      url,
      method: 'POST',
      data
    };

    const res = await userRequest(config);
    return res;
  } catch (error) {
    // 交互记录更新失败不影响用户体验，返回静默失败
    return {
      success: false,
      message: `更新${type === 'favorite' ? '收藏' : '点赞'}记录失败`
    };
  }
}

/**
 * 更新用户收藏的汤
 * 将汤ID添加到用户的favoriteSoups数组中或从中移除
 * @param {string} soupId - 汤ID
 * @param {boolean} isFavorite - 是否收藏
 * @returns {Promise} - 更新结果
 */
async function updateFavoriteSoup(soupId, isFavorite) {
  return updateSoupInteraction(soupId, isFavorite, 'favorite');
}

/**
 * 检查用户是否收藏了某个汤
 * @param {string} soupId - 汤ID
 * @returns {Promise<boolean>} - 是否收藏
 */
async function isFavoriteSoup(soupId) {
  if (!soupId) return false;

  // 检查用户是否已登录
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return false;
  }

  try {
    // 从服务器获取最新用户信息
    const userInfo = await getUserInfo();

    // 检查汤ID是否在收藏列表中
    return userInfo &&
           Array.isArray(userInfo.favoriteSoups) &&
           userInfo.favoriteSoups.includes(soupId);
  } catch (error) {
    return false;
  }
}

/**
 * 更新用户点赞的汤
 * 将汤ID添加到用户的likedSoups数组中或从中移除
 * @param {string} soupId - 汤ID
 * @param {boolean} isLike - 是否点赞
 * @returns {Promise} - 更新结果
 */
async function updateLikedSoup(soupId, isLike) {
  return updateSoupInteraction(soupId, isLike, 'like');
}

/**
 * 检查用户是否点赞了某个汤
 * @param {string} soupId - 汤ID
 * @returns {Promise<boolean>} - 是否点赞
 */
async function isLikedSoup(soupId) {
  if (!soupId) return false;

  // 检查用户是否已登录
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return false;
  }

  try {
    // 从服务器获取最新用户信息
    const userInfo = await getUserInfo();

    // 检查汤ID是否在点赞列表中
    return userInfo &&
           Array.isArray(userInfo.likedSoups) &&
           userInfo.likedSoups.includes(soupId);
  } catch (error) {
    return false;
  }
}

/**
 * 更新用户创建的汤
 * 将汤ID添加到用户的createSoups数组中
 * @param {string} soupId - 汤ID
 * @returns {Promise} - 更新结果
 */
async function updateCreatedSoup(soupId) {
  if (!soupId) return Promise.reject('汤ID为空');

  // 检查用户是否已登录
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return Promise.resolve({ success: false, message: '用户未登录' });
  }

  try {
    // 调用后端接口更新用户创建的汤
    const config = {
      url: api.user.createdSoup,
      method: 'POST',
      data: {
        soupId: soupId
      }
    };

    const res = await userRequest(config);
    return res;
  } catch (error) {
    // 创建记录更新失败不影响用户体验，返回静默失败
    return { success: false, message: '更新创建记录失败' };
  }
}

/**
 * 更新用户已解决的汤
 * 将汤ID添加到用户的solvedSoups数组中
 * @param {string} soupId - 汤ID
 * @returns {Promise} - 更新结果
 */
async function updateSolvedSoup(soupId) {
  if (!soupId) return Promise.reject('汤ID为空');

  // 检查用户是否已登录
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return Promise.resolve({ success: false, message: '用户未登录' });
  }

  try {
    // 调用后端接口更新用户已解决的汤
    const config = {
      url: api.user.solvedSoup,
      method: 'POST',
      data: {
        soupId: soupId
      }
    };

    const res = await userRequest(config);

    // 如果成功且有升级，显示升级提示
    if (res.success && res.data && res.data.levelUp) {
      showLevelUpNotification(res.data.levelTitle);
    }

    return res;
  } catch (error) {
    // 解决记录更新失败不影响用户体验，返回静默失败
    return { success: false, message: '更新解决记录失败' };
  }
}

/**
 * 检查用户是否已解决某个汤
 * @param {string} soupId - 汤ID
 * @returns {Promise<boolean>} - 是否已解决
 */
async function isSolvedSoup(soupId) {
  if (!soupId) return false;

  // 检查用户是否已登录
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return false;
  }

  try {
    // 从服务器获取最新用户信息
    // 后端已返回扁平化的数据结构
    const userInfo = await getUserInfo();

    // 检查汤ID是否在已解决列表中
    return userInfo &&
           Array.isArray(userInfo.solvedSoups) &&
           userInfo.solvedSoups.includes(soupId);
  } catch (error) {
    return false;
  }
}

module.exports = {
  getUserInfo,
  login,
  logout,
  updateAnsweredSoup,
  updateFavoriteSoup,
  isFavoriteSoup,
  updateLikedSoup,  isLikedSoup,
  updateCreatedSoup,
  updateSolvedSoup,
  isSolvedSoup
};
