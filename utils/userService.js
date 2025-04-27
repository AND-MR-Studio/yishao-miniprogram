// utils/userService.js
const api = require('./api');

// 定义常量
const TOKEN_KEY = 'token'; // 使用token作为唯一的本地存储键
// 使用api.js中定义的云端默认头像URL
const DEFAULT_AVATAR_URL = api.default_avatar_url;

/**
 * 获取用户信息
 * @param {boolean} forceRefresh - 是否强制从后端刷新
 * @returns {Promise} - 返回Promise，包含用户信息
 */
function getUserInfo(forceRefresh = true) {
  try {
    // 检查登录状态
    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return Promise.reject('未登录');
    }

    // 始终从后端获取最新用户信息
    return new Promise((resolve, reject) => {
      // 调用后端接口获取用户信息
      const config = {
        url: api.user_info_url,
        method: 'GET'
      };

      // 使用userRequest方法，保持一致性
      api.userRequest(config).then(res => {
        if (res.success && res.data) {
          // 返回完整的后端数据，不在本地存储用户信息
          resolve(res.data);
        } else {
          reject('获取用户信息失败');
        }
      }).catch(err => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return Promise.reject(error);
  }
}

/**
 * 刷新用户信息
 * 从后端获取最新的用户信息
 * @returns {Promise<Object>} 用户信息
 */
function refreshUserInfo() {
  // 直接调用getUserInfo方法，避免代码重复
  return getUserInfo();
}

/**
 * 获取用户ID
 * @returns {Promise<string>} 用户ID
 */
function getUserId() {
  try {
    // 检查token是否存在
    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return Promise.resolve('');
    }

    // 从服务器获取用户信息，然后返回用户ID
    return getUserInfo()
      .then(userInfo => userInfo?.userId || '')
      .catch(() => '');
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return Promise.resolve('');
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
    // 添加延迟，避免微信内部的chooseAvatar冲突
    setTimeout(() => {
      // 使用新的头像上传API
      api.uploadFile({
        url: api.user_upload_avatar_url,
        filePath: avatarUrl,
        name: 'avatar',
        formData: {
          // 添加时间戳，确保每次上传的文件名都不同，避免缓存问题
          timestamp: new Date().getTime()
        }
      })
      .then(res => {
        wx.hideLoading();

        if (res.success && res.data) {
          // 更新本地存储的用户信息
          const userInfo = wx.getStorageSync(USER_INFO_KEY) || {};

          // 添加随机参数到URL，避免缓存问题
          let avatarUrl = res.data.avatarUrl;
          if (avatarUrl.indexOf('?') === -1) {
            avatarUrl += '?t=' + new Date().getTime();
          } else {
            avatarUrl += '&t=' + new Date().getTime();
          }

          userInfo.avatarUrl = avatarUrl;
          wx.setStorageSync(USER_INFO_KEY, userInfo);

          resolve({
            ...res.data,
            avatarUrl: avatarUrl
          });
        } else {
          reject(res.error || '上传头像失败');
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('上传头像失败:', err);
        reject(err);
      });
    }, 300); // 添加300ms延迟，避免微信内部的chooseAvatar冲突
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
  // 检查登录状态
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return Promise.resolve('');
  }

  // 从后端获取最新用户信息
  return getUserInfo()
    .then(userInfo => userInfo.userInfo?.detectiveId || '')
    .catch(() => '');
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
        .catch(err => {
          console.error('获取用户信息失败:', err);
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

            // 如果后端返回了首次登录标志并且是首次登录，显示提示
            if (res.data.isDailyFirstLogin) {
              wx.showToast({
                title: '每日首次登录，回答次数+10',
                icon: 'success',
                duration: 2000
              });
            }

            isLoggingIn = false;

            // 记录登录信息，帮助调试
            console.log('登录成功，用户信息:', {
              userId: res.data.userId,
              nickName: res.data.userInfo?.nickName,
              detectiveId: res.data.userInfo?.detectiveId
            });

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
  wx.removeStorageSync('loginTimestamp');
  wx.removeStorageSync(TOKEN_KEY); // 清除token

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
  const token = wx.getStorageSync(TOKEN_KEY);
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
 * @param {string} levelTitle - 新的等级称号，由后端返回
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
    getUserInfo()
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
  const token = wx.getStorageSync(TOKEN_KEY);
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
      // 直接返回后端数据，不在本地存储用户信息
      return res.data;
    }
    return res;
  });
}

module.exports = {
  TOKEN_KEY,
  DEFAULT_AVATAR_URL,
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
