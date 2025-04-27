// utils/userService.js
const api = require('./api');

// 定义常量
const TOKEN_KEY = 'token'; // 使用token作为唯一的本地存储键
// 本地默认头像URL，仅作为前端兜底显示
const DEFAULT_AVATAR_URL = '/static/images/default-avatar.jpg';

/**
 * 获取用户头像
 * 从资源服务获取用户头像
 * @param {string} userId - 用户ID
 * @returns {Promise<string>} - 返回Promise，包含头像URL
 */
async function getUserAvatar(userId) {
  if (!userId) return Promise.resolve(DEFAULT_AVATAR_URL);

  try {
    // 调用资源服务获取用户头像
    const config = {
      url: api.asset_avatar_url + userId,
      method: 'GET'
    };

    // 使用开放请求方法，不需要身份验证
    const res = await api.assetRequestOpen(config);

    if (res.success && res.data && res.data.url) {
      return res.data.url;
    } else {
      return DEFAULT_AVATAR_URL;
    }
  } catch (error) {
    console.error('获取用户头像失败:', error);
    return DEFAULT_AVATAR_URL;
  }
}

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
 * @returns {Promise<Object>} 用户信息
 */
function refreshUserInfo() {
  return getUserInfo();
}

/**
 * 获取用户ID
 * @returns {Promise<string>} 用户ID
 */
async function getUserId() {
  try {
    // 检查token是否存在
    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return '';
    }

    // 从服务器获取用户信息，然后返回用户ID
    try {
      const userInfo = await getUserInfo();
      return userInfo?.userId || '';
    } catch {
      return '';
    }
  } catch (error) {
    return '';
  }
}

/**
 * 获取剩余回答次数
 * @returns {Promise<number>} 剩余回答次数
 */
async function getRemainingAnswers() {
  try {
    // 检查登录状态
    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return 0;
    }

    // 从后端获取最新用户信息
    const userInfo = await getUserInfo();
    return userInfo.answers?.remainingAnswers || 0;
  } catch {
    return 0;
  }
}

/**
 * 上传用户头像图片
 * 增强版本，解决chooseAvatar:fail another chooseAvatar is in progress错误
 * @param {string} avatarUrl - 头像临时文件路径
 * @returns {Promise} - 上传结果
 */
async function updateAvatar(avatarUrl) {
  if (!avatarUrl) return Promise.reject('头像URL为空');

  // 检查登录状态
  const token = wx.getStorageSync(TOKEN_KEY);
  if (!token) {
    return Promise.reject('用户未登录，请先登录');
  }

  // 显示上传中提示
  wx.showLoading({
    title: '上传头像中...',
    mask: true
  });

  try {
    // 获取用户ID
    const userId = await getUserId();
    if (!userId) {
      wx.hideLoading();
      return Promise.reject('获取用户ID失败');
    }

    // 添加更长的延迟，确保微信内部的chooseAvatar操作完全结束
    // 从300ms增加到800ms，给微信API更多时间完成内部操作
    await new Promise(resolve => setTimeout(resolve, 800));

    // 使用资源服务上传头像
    const result = await api.uploadFile({
      url: api.asset_upload_url,
      filePath: avatarUrl,
      name: 'file',
      formData: {
        type: 'avatar',
        userId: userId,
        timestamp: new Date().getTime()
      }
    });

    wx.hideLoading();

    if (result.success && result.data) {
      // 刷新用户信息，获取最新数据
      await refreshUserInfo();

      // 添加额外延迟，确保所有操作完全结束
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        success: true,
        avatarUrl: result.data.url || '',
        message: '头像上传成功'
      };
    } else {
      return Promise.reject(result.error || '上传头像失败');
    }
  } catch (error) {
    wx.hideLoading();
    console.error('上传头像失败:', error);
    return Promise.reject(error);
  }
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
async function getDetectiveId() {
  try {
    // 检查登录状态
    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return '';
    }

    // 从后端获取最新用户信息
    const userInfo = await getUserInfo();
    return userInfo.userInfo?.detectiveId || '';
  } catch {
    return '';
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
  // 显示升级提示
  wx.showToast({
    title: `恭喜升级为${levelTitle}！`,
    icon: 'success',
    duration: 2000
  });

  // 播放升级成功的振动反馈
  wx.vibrateShort({
    type: 'heavy'
  });

  // 延迟显示模态框，给用户更明显的升级提示
  setTimeout(() => {
    wx.showModal({
      title: '侦探等级提升',
      content: `恭喜您升级为"${levelTitle}"！解锁更多推理能力！`,
      showCancel: false,
      confirmText: '太棒了'
    });
  }, 1000);
}

/**
 * 获取用户信息并格式化为UI显示所需的格式
 * 简洁的实现，只关注必要的功能
 * @param {boolean} showLoading - 是否显示加载提示
 * @returns {Promise<Object>} 格式化后的用户信息
 */
async function getFormattedUserInfo(showLoading = false) {
  try {
    // 检查登录状态
    if (!checkLoginStatus(false)) {
      return null;
    }

    // 显示加载中提示
    if (showLoading) {
      wx.showLoading({
        title: '加载中...',
        mask: false
      });
    }

    // 使用getUserInfo方法获取用户信息
    const userInfo = await getUserInfo();

    if (showLoading) {
      wx.hideLoading();
    }

    if (!userInfo || !userInfo.userInfo) {
      return null;
    }

    // 获取用户ID
    const userId = userInfo.userId || '';

    // 从资源服务获取用户头像
    let avatarUrl = '';
    if (userId) {
      avatarUrl = await getUserAvatar(userId);
    } else {
      avatarUrl = DEFAULT_AVATAR_URL;
    }

    // 格式化用户信息，只提取UI需要的字段
    return {
      nickName: userInfo.userInfo?.nickName || '',
      detectiveId: userInfo.userInfo?.detectiveId || '',
      avatarUrl: avatarUrl, // 使用从资源服务获取的头像
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
    };
  } catch {
    if (showLoading) {
      wx.hideLoading();
    }
    return null;
  }
}

/**
 * 设置用户信息
 * @param {Object} userInfo - 用户信息
 * @returns {Promise} - 设置结果
 */
async function setUserInfo(userInfo) {
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
      nickName: userInfo.nickName || ''
    }
  };

  const res = await api.userRequest(config);

  if (res.success && res.data) {
    // 直接返回后端数据
    return res.data;
  }
  return res;
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
  getFormattedUserInfo,
  setUserInfo,
  getUserAvatar
};
