// utils/userService.js
const api = require('./api');

// 定义常量
const USER_INFO_KEY = 'userInfo';
const DEFAULT_AVATAR_URL = '/static/images/default-avatar.jpg';
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

        api.request(config).then(res => {
          if (res.success && res.data) {
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
  return new Promise((resolve, reject) => {
    // 检查token是否存在
    const token = wx.getStorageSync('token');
    if (!token) {
      return reject(new Error('未登录，无法刷新用户信息'));
    }

    // 调用后端接口获取用户信息
    const config = {
      url: api.user_info_url,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      }
    };

    // 使用通用 request 方法，避免依赖可能不存在的 userRequest
    api.request(config).then(res => {
      if (res.success && res.data) {
        // 构建包含完整用户信息的对象
        const userInfo = {
          userId: res.data.userId,
          isLoggedIn: true,
          loginTime: new Date().getTime(),
          // 保存昵称和头像
          nickName: res.data.userInfo?.nickName || '',
          avatarUrl: res.data.userInfo?.avatarUrl || DEFAULT_AVATAR_URL,
          detectiveId: res.data.userInfo?.detectiveId || ''
        };

        // 保存到本地存储
        wx.setStorageSync(USER_INFO_KEY, userInfo);

        resolve(userInfo);
      } else {
        reject(new Error('获取用户信息失败'));
      }
    }).catch(err => {
      reject(err);
    });
  });
}

/**
 * 获取用户ID
 * @returns {string} 用户ID
 */
function getUserId() {
  try {
    // 从本地存储获取token
    const token = wx.getStorageSync('token');
    if (!token) {
      return '';
    }

    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync(USER_INFO_KEY);

    // 如果本地存储中有userId，直接返回
    if (userInfo && userInfo.userId) {
      return userInfo.userId;
    }

    // 如果没有userId，尝试刷新用户信息
    // 这里不直接调用refreshUserInfo，因为这会导致异步问题
    // 而是返回空字符串，让调用方决定如何处理
    return '';
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return '';
  }
}

/**
 * 获取剩余回答次数
 */
function getRemainingAnswers() {
  // 从用户信息中获取剩余回答次数
  const userInfo = getUserInfo();
  return userInfo?.remainingAnswers || 0;
}

/**
 * 更新用户头像
 * @param {string} avatarUrl - 头像URL
 * @param {Object} userInfo - 用户信息
 * @returns {Promise} - 更新结果
 */
function updateAvatar(avatarUrl, userInfo) {
  if (!avatarUrl) return Promise.reject('头像URL为空');

  // 更新本地存储
  userInfo = userInfo || getUserInfo() || {};
  userInfo.avatarUrl = avatarUrl;
  wx.setStorageSync(USER_INFO_KEY, userInfo);

  // 上传到服务器，token会通过request.js自动添加到请求头
  const config = {
    url: api.user_update_url,
    method: 'POST',
    data: {
      avatarUrl: avatarUrl
    }
  };

  return api.request(config);
}

/**
 * 更新用户昵称
 * @param {string} nickName - 昵称
 * @param {Object} userInfo - 用户信息
 * @returns {Promise} - 更新结果
 */
function updateNickname(nickName, userInfo) {
  if (!nickName) return Promise.reject('昵称为空');

  // 更新本地存储
  userInfo = userInfo || getUserInfo() || {};
  userInfo.nickName = nickName;
  wx.setStorageSync(USER_INFO_KEY, userInfo);

  // 上传到服务器，token会通过request.js自动添加到请求头
  const config = {
    url: api.user_update_url,
    method: 'POST',
    data: {
      nickName: nickName
    }
  };

  return api.request(config);
}

/**
 * 获取侦探ID
 * 从用户信息中获取侦探ID
 * @returns {string} - 侦探ID
 */
function getDetectiveId() {
  const userInfo = getUserInfo();
  return userInfo?.detectiveId || '';
}

// 登录状态标志
let isLoggingIn = false;

/**
 * 登录
 * @returns {Promise} - 登录结果
 */
function login() {
  // 如果已经在登录中，直接返回一个等待的Promise
  if (isLoggingIn) {
    return new Promise((resolve, reject) => {
      // 每100ms检查一次登录状态
      const checkLoginStatus = () => {
        const token = wx.getStorageSync('token');
        const userInfo = wx.getStorageSync(USER_INFO_KEY);

        if (token && userInfo) {
          // 登录成功，返回用户信息
          resolve(userInfo);
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
      return resolve(userInfo);
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

        api.request(config).then(res => {
          if (res.success && res.data) {
            // 单独保存 token 到本地存储
            if (res.data.token) {
              wx.setStorageSync('token', res.data.token);
            }

            // 保存登录时间戳
            wx.setStorageSync('loginTimestamp', new Date().getTime());

            // 构建包含完整用户信息的对象
            const userInfo = {
              userId: res.data.userId,
              isLoggedIn: true,
              loginTime: new Date().getTime(),
              // 保存昵称和头像
              nickName: res.data.userInfo?.nickName || '',
              avatarUrl: res.data.userInfo?.avatarUrl || DEFAULT_AVATAR_URL,
              detectiveId: res.data.userInfo?.detectiveId || ''
            };

            // 保存用户信息到本地存储
            wx.setStorageSync(USER_INFO_KEY, userInfo);

            isLoggingIn = false;
            resolve(userInfo);
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

  // 清除任何可能的缓存数据
  const app = getApp();
  if (app && app.globalData) {
    if (app.globalData.userInfo) {
      app.globalData.userInfo = null;
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
 * @returns {Promise<Object>} 完整的用户信息
 */
function getCompleteUserInfo() {
  return new Promise((resolve) => {
    // 检查登录状态
    if (!checkLoginStatus(false)) {
      return resolve(null);
    }

    // 显示加载中提示
    wx.showLoading({
      title: '加载中...',
      mask: false
    });

    // 使用api模块中定义的用户信息URL和请求方法
    const config = {
      url: api.user_info_url,
      method: 'GET'
    };

    // 使用userRequest方法发起请求
    api.userRequest(config)
      .then(res => {
        wx.hideLoading();

        if (res.success) {
          // 使用后端返回的最新用户信息
          const userInfo = res.data;

          if (!userInfo || !userInfo.userInfo) {
            console.error('后端返回的用户信息格式不正确:', userInfo);
            resolve(null);
            return;
          }

          // 更新本地存储
          const localUserInfo = getUserInfo();
          if (localUserInfo) {
            localUserInfo.nickName = userInfo.userInfo?.nickName || '';
            localUserInfo.detectiveId = userInfo.userInfo?.detectiveId || '';
            localUserInfo.avatarUrl = userInfo.userInfo?.avatarUrl || '';
            wx.setStorageSync(USER_INFO_KEY, localUserInfo);
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
            remainingAnswers: userInfo.remainingAnswers || 0,
            unsolvedCount: userInfo.stats?.unsolvedCount || 0,
            solvedCount: userInfo.stats?.solvedCount || 0,
            creationCount: userInfo.stats?.creationCount || 0,
            favoriteCount: userInfo.stats?.favoriteCount || 0,
            isLoggedIn: true
          });
        } else {
          console.error('获取用户信息失败:', res.error || '未知错误');
          resolve(null);
        }
      })
      .catch(error => {
        wx.hideLoading();
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

  // 如果昵称为空，生成随机侦探ID
  if (!userInfo.nickName) {
    userInfo.nickName = generateDetectiveId();
  }

  // 保存到本地存储
  wx.setStorageSync(USER_INFO_KEY, userInfo);

  // 检查用户是否已登录（检查token是否存在）
  const token = wx.getStorageSync('token');
  if (!token) {
    return Promise.reject('用户未登录，请先登录');
  }

  // 上传到服务器，token会通过request.js自动添加到请求头
  const config = {
    url: api.user_update_url,
    method: 'POST',
    data: {
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl
    }
  };

  return api.request(config);
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
  generateDetectiveId,
  parseDetectiveId,
  getDetectiveId,
  getFullnickName,
  login,
  logout,
  checkLoginStatus,
  showLevelUpNotification,
  getCompleteUserInfo,
  setUserInfo
};
