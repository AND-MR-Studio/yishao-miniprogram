// utils/userService.js
const api = require('./api');

// 定义常量
const USER_INFO_KEY = 'userInfo';
// 使用api.js中定义的云端默认头像URL
const DEFAULT_AVATAR_URL = api.default_avatar_url;
const LEVEL_TITLES = ['见习侦探', '初级侦探', '中级侦探', '高级侦探', '特级侦探', '神探'];

/**
 * 获取用户信息
 * @param {boolean} forceRefresh - 是否强制从后端刷新
 * @returns {Promise|Object} - 如果forceRefresh为true，返回Promise，否则返回本地存储的用户信息
 */
function getUserInfo(forceRefresh = false) {
  try {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      return forceRefresh ? Promise.reject('未登录') : null;
    }

    // 从本地存储获取基本登录信息
    const userInfo = wx.getStorageSync(USER_INFO_KEY);

    // 如果强制刷新，从后端获取最新用户信息
    if (forceRefresh) {
      return new Promise((resolve, reject) => {
        // 调用后端接口获取用户信息
        const config = {
          url: api.user_info_url,
          method: 'GET'
        };

        // 使用userRequest方法，保持一致性
        api.userRequest(config).then(res => {
          if (res.success && res.data) {
            // 只在本地存储最小必要信息
            const minimalUserInfo = {
              userId: res.data.userId,
              isLoggedIn: true,
              loginTime: new Date().getTime()
            };

            // 保存到本地存储
            wx.setStorageSync(USER_INFO_KEY, minimalUserInfo);

            // 返回完整的后端数据
            resolve(res.data);
          } else {
            reject('获取用户信息失败');
          }
        }).catch(err => {
          reject(err);
        });
      });
    }

    // 否则返回本地存储的基本登录信息
    return userInfo || null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return forceRefresh ? Promise.reject(error) : null;
  }
}

/**
 * 刷新用户信息
 * 从后端获取最新的用户信息
 * @returns {Promise<Object>} 用户信息
 */
function refreshUserInfo() {
  // 直接调用getUserInfo方法，避免代码重复
  return getUserInfo(true);
}

/**
 * 获取用户ID
 * @returns {string} 用户ID
 */
function getUserId() {
  try {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync(USER_INFO_KEY);

    // 如果本地存储中有userId，直接返回
    if (userInfo && userInfo.userId) {
      return userInfo.userId;
    }

    // 检查token是否存在
    const token = wx.getStorageSync('token');
    if (!token) {
      return '';
    }

    // 如果有token但没有userId，返回空字符串
    // 调用方可以决定是否需要刷新用户信息
    return '';
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return '';
  }
}

/**
 * 获取剩余回答次数
 * @returns {Promise<number>} 剩余回答次数
 */
function getRemainingAnswers() {
  return new Promise((resolve) => {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      resolve(0);
      return;
    }

    // 从后端获取最新用户信息
    getUserInfo(true)
      .then(userInfo => {
        resolve(userInfo.answers?.remainingAnswers || 0);
      })
      .catch(() => {
        resolve(0);
      });
  });
}

/**
 * 更新用户头像
 * @param {string} avatarUrl - 头像临时文件路径
 * @returns {Promise} - 更新结果
 */
function updateAvatar(avatarUrl) {
  if (!avatarUrl) return Promise.reject('头像URL为空');

  // 检查登录状态
  const token = wx.getStorageSync('token');
  if (!token) {
    return Promise.reject('用户未登录，请先登录');
  }

  // 显示上传中提示
  wx.showLoading({
    title: '上传头像中...',
    mask: true
  });

  return new Promise((resolve, reject) => {
    // 使用新的头像上传API
    api.uploadFile({
      url: api.user_upload_avatar_url,
      filePath: avatarUrl,
      name: 'avatar',
      formData: {}
    })
    .then(res => {
      wx.hideLoading();

      if (res.success && res.data) {
        // 更新本地存储的用户信息
        const userInfo = wx.getStorageSync(USER_INFO_KEY) || {};
        userInfo.avatarUrl = res.data.avatarUrl;
        wx.setStorageSync(USER_INFO_KEY, userInfo);

        resolve(res.data);
      } else {
        reject(res.error || '上传头像失败');
      }
    })
    .catch(err => {
      wx.hideLoading();
      console.error('上传头像失败:', err);
      reject(err);
    });
  });
}

/**
 * 更新用户昵称
 * @param {string} nickName - 昵称
 * @returns {Promise} - 更新结果
 */
function updateNickname(nickName) {
  if (!nickName) return Promise.reject('昵称为空');

  // 上传到服务器，token会通过request.js自动添加到请求头
  const config = {
    url: api.user_update_url,
    method: 'POST',
    data: {
      nickName: nickName
    }
  };

  return api.userRequest(config);
}

/**
 * 获取侦探ID
 * 从后端获取最新的侦探ID
 * @returns {Promise<string>} - 侦探ID
 */
function getDetectiveId() {
  return new Promise((resolve) => {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      resolve('');
      return;
    }

    // 从后端获取最新用户信息
    getUserInfo(true)
      .then(userInfo => {
        resolve(userInfo.userInfo?.detectiveId || '');
      })
      .catch(() => {
        resolve('');
      });
  });
}

// 登录状态标志
let isLoggingIn = false;

/**
 * 登录
 * @param {boolean} skipPopup - 是否跳过登录设置弹窗
 * @returns {Promise} - 登录结果
 */
function login(skipPopup = false) {
  // 如果已经在登录中，直接返回一个等待的Promise
  if (isLoggingIn) {
    return new Promise((resolve, reject) => {
      // 每100ms检查一次登录状态
      const checkLoginStatus = () => {
        const token = wx.getStorageSync('token');
        const userInfo = wx.getStorageSync(USER_INFO_KEY);

        if (token && userInfo) {
          // 登录成功，返回用户信息
          resolve({userInfo, skipPopup});
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
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync(USER_INFO_KEY);

    if (token && userInfo) {
      isLoggingIn = false;
      // 如果已登录，检查是否需要跳过弹窗
      return resolve({userInfo, skipPopup: true});
    }

    // 未登录，执行登录流程
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        const config = {
          url: api.user_login_url,
          method: 'POST',
          data: {
            code: res.code,
            userInfo: {
              avatarUrl: DEFAULT_AVATAR_URL,
              nickName: ''
            }
          }
        };

        api.userRequest(config).then(res => {
          if (res.success && res.data) {
            // 单独保存 token 到本地存储
            if (res.data.token) {
              wx.setStorageSync('token', res.data.token);
            }

            // 从后端获取登录时间戳
            const currentTime = new Date().getTime();
            const lastLoginTime = res.data.lastLoginTime ? new Date(res.data.lastLoginTime).getTime() : 0;

            // 检查是否是每日首次登录（使用后端返回的lastLoginTime）
            let isDailyFirstLogin = false;

            if (lastLoginTime) {
              const now = new Date();
              const lastLoginDate = new Date(lastLoginTime);

              // 检查是否是每日首次登录
              isDailyFirstLogin = lastLoginDate.getDate() !== now.getDate() ||
                                 lastLoginDate.getMonth() !== now.getMonth() ||
                                 lastLoginDate.getFullYear() !== now.getFullYear();

              // 如果是每日首次登录，显示提示
              if (isDailyFirstLogin) {
                wx.showToast({
                  title: '每日首次登录，回答次数+10',
                  icon: 'success',
                  duration: 2000
                });
              }
            }

            // 保存登录时间戳（使用后端返回的时间）
            wx.setStorageSync('loginTimestamp', lastLoginTime || currentTime);

            // 构建最小必要的用户信息对象
            const minimalUserInfo = {
              userId: res.data.userId,
              isLoggedIn: true,
              loginTime: lastLoginTime || currentTime,
              isDailyFirstLogin: isDailyFirstLogin
            };

            // 保存用户信息到本地存储
            wx.setStorageSync(USER_INFO_KEY, minimalUserInfo);

            isLoggingIn = false;

            // 检查用户是否已经设置过信息
            const hasUserInfo = res.data.userInfo &&
                               (res.data.userInfo.nickName || res.data.userInfo.detectiveId);

            // 如果用户已经设置过信息或者指定跳过弹窗，则跳过弹窗
            resolve({
              userInfo: res.data,
              skipPopup: skipPopup || hasUserInfo
            });
          } else {
            wx.showToast({
              title: '登录失败，请重试',
              icon: 'none'
            });
            isLoggingIn = false;
            reject('登录失败');
          }
        }).catch(err => {
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
          isLoggingIn = false;
          reject(err);
        });
      },
      fail: (err) => {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
        isLoggingIn = false;
        reject(err);
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
  wx.removeStorageSync(USER_INFO_KEY);
  wx.removeStorageSync('loginTimestamp');
  wx.removeStorageSync('token'); // 清除token

  // 清除可能存在的其他用户相关缓存
  try {
    wx.removeStorageSync('userStats');
    wx.removeStorageSync('userLevel');
  } catch (e) {
    console.error('清除额外缓存失败:', e);
  }

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
 * 检查登录状态
 * @param {boolean} showToast - 是否显示提示
 * @returns {boolean} - 是否已登录
 */
function checkLoginStatus(showToast = true) {
  // 只检查token，不触发登录流程
  const token = wx.getStorageSync('token');
  if (!token) {
    if (showToast) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
    }
    return false;
  }
  return true;
}

/**
 * 显示升级提示
 * @param {string} levelTitle - 新的等级称号
 */
function showLevelUpNotification(levelTitle) {
  wx.showToast({
    title: `恭喜升级为${levelTitle}！`,
    icon: 'success',
    duration: 2000
  });
}

/**
 * 获取完整的用户信息（包括等级、经验值等）
 * @param {boolean} showLoading - 是否显示加载提示
 * @returns {Promise<Object>} 完整的用户信息
 */
function getCompleteUserInfo(showLoading = true) {
  return new Promise((resolve) => {
    // 检查登录状态
    if (!checkLoginStatus(false)) {
      return resolve(null);
    }

    // 显示加载中提示
    if (showLoading) {
      wx.showLoading({
        title: '加载中...',
        mask: false
      });
    }

    // 直接使用getUserInfo方法获取最新用户信息
    getUserInfo(true)
      .then(userInfo => {
        if (showLoading) {
          wx.hideLoading();
        }

        if (!userInfo || !userInfo.userInfo) {
          console.error('后端返回的用户信息格式不正确:', userInfo);
          resolve(null);
          return;
        }

        // 返回完整的用户信息
        resolve({
          nickName: userInfo.userInfo?.nickName || '',
          detectiveId: userInfo.userInfo?.detectiveId || '',
          avatarUrl: userInfo.userInfo?.avatarUrl || '',
          levelTitle: userInfo.level?.levelTitle || '',
          level: userInfo.level?.level || 1,
          experience: userInfo.level?.experience || 0,
          maxExperience: userInfo.level?.maxExperience || 1000,
          remainingAnswers: userInfo.answers?.remainingAnswers || 0,
          unsolvedCount: userInfo.stats?.unsolvedCount || 0,
          solvedCount: userInfo.stats?.solvedCount || 0,
          creationCount: userInfo.stats?.creationCount || 0,
          favoriteCount: userInfo.stats?.favoriteCount || 0,
          lastSignInDate: userInfo.points?.lastSignInDate || '',
          isLoggedIn: true
        });
      })
      .catch(error => {
        if (showLoading) {
          wx.hideLoading();
        }
        console.error('获取用户信息请求失败:', error);
        resolve(null);
      });
  });
}

/**
 * 设置用户信息
 * @param {Object} userInfo - 用户信息
 * @returns {Promise} - 设置结果
 */
function setUserInfo(userInfo) {
  if (!userInfo) return Promise.reject('用户信息为空');

  // 检查用户是否已登录（检查token是否存在）
  const token = wx.getStorageSync('token');
  if (!token) {
    return Promise.reject('用户未登录，请先登录');
  }

  // 上传到服务器，token会通过request.js自动添加到请求头
  // 如果昵称为空，后端会自动生成
  const config = {
    url: api.user_update_url,
    method: 'POST',
    data: {
      nickName: userInfo.nickName || '',
      avatarUrl: userInfo.avatarUrl || DEFAULT_AVATAR_URL
    }
  };

  return api.userRequest(config).then(res => {
    if (res.success && res.data) {
      // 更新本地存储的用户ID
      const localUserInfo = wx.getStorageSync(USER_INFO_KEY) || {};
      localUserInfo.userId = localUserInfo.userId || res.data.userId;
      localUserInfo.isLoggedIn = true;
      localUserInfo.loginTime = localUserInfo.loginTime || new Date().getTime();

      // 保存到本地存储
      wx.setStorageSync(USER_INFO_KEY, localUserInfo);

      return res.data;
    }
    return res;
  });
}

module.exports = {
  USER_INFO_KEY,
  DEFAULT_AVATAR_URL,
  LEVEL_TITLES,
  getUserInfo,
  getUserId,
  refreshUserInfo,
  getRemainingAnswers,
  updateAvatar,
  updateNickname,
  getDetectiveId,
  login,
  logout,
  checkLoginStatus,
  showLevelUpNotification,
  getCompleteUserInfo,
  setUserInfo
};
