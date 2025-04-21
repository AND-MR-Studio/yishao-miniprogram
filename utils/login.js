// 登录相关工具类
// 定义用户信息存储的KEY常量
const USER_INFO_KEY = 'userInfo';
// 定义登录态存储的KEY常量（实际使用中会由服务端返回）
const SESSION_KEY = 'sessionKey';
// 登录态有效期（毫秒），默认为7天
const SESSION_EXPIRE_TIME = 7 * 24 * 60 * 60 * 1000;
// 默认头像
const DEFAULT_AVATAR_URL = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0';

/**
 * 获取用户信息（从本地存储）
 * @returns {Object|null} 用户信息
 */
function getUserInfo() {
  try {
    // 从本地存储获取用户信息
    return wx.getStorageSync(USER_INFO_KEY);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 检查登录状态是否过期
 * @returns {Promise<boolean>} 是否有效
 */
function checkSession() {
  return new Promise((resolve) => {
    try {
      // 获取登录时间戳
      const loginTimestamp = wx.getStorageSync('loginTimestamp');
      const currentTime = new Date().getTime();

      // 如果没有登录时间戳或者登录已过期
      if (!loginTimestamp || (currentTime - loginTimestamp > SESSION_EXPIRE_TIME)) {
        // 使用微信的checkSession API检查登录态
        wx.checkSession({
          success: () => {
            // 登录态有效，只需更新时间戳
            wx.setStorageSync('loginTimestamp', currentTime);
            resolve(true);
          },
          fail: () => {
            // 登录态已过期，需要重新登录
            resolve(false);
          }
        });
      } else {
        // 登录时间戳有效
        resolve(true);
      }
    } catch (error) {
      console.error('检查登录态出错:', error);
      resolve(false);
    }
  });
}

/**
 * 更新用户信息（头像或昵称）
 * @param {Object} info - 包含avatarUrl或nickName的对象
 * @returns {Promise<Object>} 更新后的用户信息
 */
function updateUserInfo(info) {
  return new Promise((resolve, reject) => {
    try {
      if (!info) {
        reject(new Error('无效的用户信息'));
        return;
      }

      // 获取当前用户信息
      let userInfo = getUserInfo() || {};

      // 更新头像或昵称
      if (info.avatarUrl) {
        userInfo.avatarUrl = info.avatarUrl;
      }

      if (info.nickName) {
        userInfo.nickName = info.nickName;
      }

      // 使用全局应用实例的更新方法
      const app = getApp();
      if (app && app.updateUserInfo) {
        app.updateUserInfo(userInfo);
      } else {
        // 保存到本地存储
        wx.setStorageSync(USER_INFO_KEY, userInfo);
        // 更新登录时间戳
        wx.setStorageSync('loginTimestamp', new Date().getTime());
      }

      resolve(userInfo);
    } catch (error) {
      console.error('更新用户信息失败:', error);
      reject(error);
    }
  });
}

/**
 * 清除登录信息
 */
function clearLoginInfo() {
  try {
    const app = getApp();
    if (app && app.clearLoginInfo) {
      // 使用全局方法清除登录信息
      app.clearLoginInfo();
    } else {
      // 备用方案：直接清除本地存储
      wx.removeStorageSync(USER_INFO_KEY);
      wx.removeStorageSync(SESSION_KEY);
      wx.removeStorageSync('loginTimestamp');
    }
    return true;
  } catch (error) {
    console.error('清除登录信息失败:', error);
    return false;
  }
}

/**
 * 获取微信用户openId（通过后端接口）
 * @returns {Promise<string>} 用户openId
 */
function getOpenId() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('获取到code:', res.code);

          // 发送code到后端换取openId
          wx.request({
            url: getApiBaseUrl() + '/api/user/login',
            method: 'POST',
            data: {
              code: res.code,
              userInfo: getUserInfo() || {}
            },
            success: (res) => {
              if (res.data && res.data.success && res.data.data && res.data.data.openid) {
                console.log('登录成功，获取到openid:', res.data.data.openid);
                resolve(res.data.data.openid);
              } else {
                console.error('登录失败，服务器返回:', res.data);
                reject(new Error('登录失败，无法获取openid'));
              }
            },
            fail: (err) => {
              console.error('请求失败:', err);
              reject(new Error('网络请求失败，请检查网络连接'));
            }
          });
        } else {
          reject(new Error('登录失败，获取code失败'));
        }
      },
      fail: (err) => {
        console.error('wx.login失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 微信登录并获取用户信息（整合登录过程）
 * @param {Object} userInfo - 包含avatarUrl、nickName等信息的对象
 * @returns {Promise<Object>} 完整的用户信息对象
 */
function wechatLogin(userInfo = {}) {
  // 直接调用实际的登录函数
  return simulateLogin(userInfo);
}

/**
 * 更新用户完整资料（同时更新头像和昵称）
 * @param {string} avatarUrl - 用户头像地址
 * @param {string} nickName - 用户昵称
 * @returns {Promise<Object>} 更新后的用户信息
 */
function updateUserProfile(avatarUrl, nickName) {
  return new Promise((resolve, reject) => {
    try {
      // 获取当前用户信息
      let userInfo = getUserInfo() || {};

      // 如果用户信息不存在，创建一个空对象
      if (!userInfo) {
        userInfo = {};
      }

      // 确保至少有一个字段更新
      if (!avatarUrl && !nickName) {
        reject(new Error('未提供任何更新信息'));
        return;
      }

      // 更新头像和昵称
      if (avatarUrl) {
        userInfo.avatarUrl = avatarUrl;
      }

      if (nickName) {
        userInfo.nickName = nickName;
      }

      // 确保有登录时间
      if (!userInfo.loginTime) {
        userInfo.loginTime = new Date().getTime();
      }

      // 如果有openId，则将更新发送到后端
      if (userInfo.openId) {
        wx.request({
          url: getApiBaseUrl() + '/api/user/update',
          method: 'POST',
          data: {
            openid: userInfo.openId,
            avatarUrl: avatarUrl,
            nickName: nickName
          },
          success: (res) => {
            console.log('用户信息更新成功，服务器返回:', res.data);
          },
          fail: (err) => {
            console.error('用户信息更新失败:', err);
          }
        });
      }

      // 使用全局应用实例的更新方法
      const app = getApp();
      if (app && app.updateUserInfo) {
        app.updateUserInfo(userInfo);
      } else {
        // 保存到本地存储
        wx.setStorageSync(USER_INFO_KEY, userInfo);
        // 更新登录时间戳
        wx.setStorageSync('loginTimestamp', new Date().getTime());
      }

      // 更新成功提示
      wx.showToast({
        title: '资料已更新',
        icon: 'success'
      });

      resolve(userInfo);
    } catch (error) {
      console.error('更新用户资料失败:', error);
      reject(error);
    }
  });
}

/**
 * 统一的登录后处理函数
 * @param {Object} userInfo 用户信息对象
 * @param {boolean} showSuccessToast 是否显示登录成功提示
 * @param {boolean} showAvatarHint 是否显示设置头像提示
 * @returns {Promise<Object>} 处理后的用户信息
 */
function handleLoginSuccess(userInfo, showSuccessToast = true, showAvatarHint = true) {
  return new Promise((resolve, reject) => {
    try {
      if (!userInfo) {
        reject(new Error('无效的用户信息'));
        return;
      }

      // 确保有必要的字段
      if (!userInfo.avatarUrl) {
        userInfo.avatarUrl = DEFAULT_AVATAR_URL;
      }

      if (!userInfo.nickName) {
        userInfo.nickName = '微信用户' + Math.floor(Math.random() * 10000);
      }

      if (!userInfo.loginTime) {
        userInfo.loginTime = new Date().getTime();
      }

      if (!userInfo.openId) {
        userInfo.openId = 'openid_' + Math.random().toString(36).substring(2);
      }

      // 使用全局应用实例的更新方法
      const app = getApp();
      if (app && app.updateUserInfo) {
        app.updateUserInfo(userInfo);
      } else {
        // 保存到本地存储
        wx.setStorageSync(USER_INFO_KEY, userInfo);
        wx.setStorageSync('loginTimestamp', new Date().getTime());
      }

      // 登录成功提示
      if (showSuccessToast) {
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500,
          complete: () => {
            // 登录成功后提示用户设置头像
            if (showAvatarHint) {
              setTimeout(() => {
                wx.showToast({
                  title: '点击头像可设置个人头像',
                  icon: 'none',
                  duration: 2000
                });
              }, 1500);
            }
          }
        });
      }

      resolve(userInfo);
    } catch (error) {
      console.error('登录处理失败:', error);
      reject(error);
    }
  });
}

/**
 * 实际微信登录流程
 * @param {Object} userInfoParams 可选的用户信息参数
 * @param {boolean} showSuccessToast 是否显示登录成功提示
 * @param {boolean} showAvatarHint 是否显示设置头像提示
 * @returns {Promise<Object>} 用户信息对象
 */
function simulateLogin(userInfoParams = {}, showSuccessToast = true, showAvatarHint = true) {
  return new Promise((resolve, reject) => {
    // 显示加载提示
    wx.showLoading({
      title: '登录中...',
      mask: true
    });

    // 获取登录凭证
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 获取到code，发送到后端获取openid
          wx.request({
            url: getApiBaseUrl() + '/api/user/login',
            method: 'POST',
            data: {
              code: loginRes.code,
              userInfo: {
                avatarUrl: userInfoParams.avatarUrl || DEFAULT_AVATAR_URL,
                nickName: userInfoParams.nickName || ''
              }
            },
            success: (res) => {
              wx.hideLoading();

              if (res.data && res.data.success && res.data.data) {
                // 构建用户信息
                const userInfo = {
                  avatarUrl: res.data.data.userInfo.avatarUrl || userInfoParams.avatarUrl || DEFAULT_AVATAR_URL,
                  nickName: res.data.data.userInfo.nickName || userInfoParams.nickName || ('微信用户' + Math.floor(Math.random() * 10000)),
                  openId: res.data.data.openid,
                  loginTime: new Date().getTime()
                };

                // 合并传入的其他参数
                Object.keys(userInfoParams).forEach(key => {
                  if (!['avatarUrl', 'nickName'].includes(key)) {
                    userInfo[key] = userInfoParams[key];
                  }
                });

                // 处理登录成功
                handleLoginSuccess(userInfo, showSuccessToast, showAvatarHint)
                  .then(resolve)
                  .catch(reject);
              } else {
                console.error('登录失败，服务器返回:', res.data);
                wx.showToast({
                  title: '登录失败，请重试',
                  icon: 'none'
                });
                reject(new Error('登录失败，服务器返回错误'));
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('请求失败:', err);
              wx.showToast({
                title: '登录失败，请检查网络',
                icon: 'none'
              });
              reject(new Error('网络请求失败'));
            }
          });
        } else {
          wx.hideLoading();
          const error = new Error('登录失败，获取code失败');
          console.error(error);
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
          reject(error);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('微信登录失败:', err);
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

/**
 * 微信一键登录（无需用户输入昵称，同时处理头像获取）
 * @returns {Promise<Object>} 用户信息对象
 */
function oneClickLogin() {
  return simulateLogin();
}

/**
 * 处理头像选择事件
 * @param {Object} e 头像选择事件对象
 * @returns {Promise<Object>} 更新后的用户信息
 */
function handleAvatarChoose(e) {
  return new Promise((resolve, reject) => {
    // 用户取消选择时不做处理，直接返回成功但不进行操作
    if (!e || !e.detail || e.detail.errMsg && e.detail.errMsg.indexOf('fail') > -1) {
      console.log('用户取消选择头像');
      // 返回当前用户信息，不做任何修改
      resolve(getUserInfo() || {});
      return;
    }

    const { avatarUrl } = e.detail;
    if (!avatarUrl) {
      console.log('获取头像失败，未返回有效的头像URL');
      // 返回当前用户信息，不做任何修改
      resolve(getUserInfo() || {});
      return;
    }

    // 获取当前用户信息
    const userInfo = getUserInfo();

    // 如果未登录，则先登录
    if (!userInfo) {
      // 创建带有头像的用户信息
      wechatLogin({ avatarUrl })
        .then(resolve)
        .catch(reject);
    } else {
      // 已登录，更新头像
      // 如果有openId，则将头像更新发送到后端
      if (userInfo.openId) {
        wx.request({
          url: getApiBaseUrl() + '/api/user/update',
          method: 'POST',
          data: {
            openid: userInfo.openId,
            avatarUrl: avatarUrl
          },
          success: (res) => {
            console.log('头像更新成功，服务器返回:', res.data);
          },
          fail: (err) => {
            console.error('头像更新失败:', err);
          }
        });
      }

      // 更新本地存储
      updateUserInfo({ avatarUrl })
        .then(resolve)
        .catch(reject);
    }
  });
}

/**
 * 获取API基础URL，根据环境自动切换
 * @returns {string} API基础URL
 */
function getApiBaseUrl() {
  // 判断当前环境
  const envVersion = __wxConfig.envVersion;

  // 根据环境返回不同的基础URL
  switch (envVersion) {
    case 'develop': // 开发版
      return 'http://localhost:8080';
  }
}

// 导出工具方法
module.exports = {
  getUserInfo,
  checkSession,
  updateUserInfo,
  clearLoginInfo,
  getOpenId,
  wechatLogin,
  updateUserProfile,
  oneClickLogin,
  handleAvatarChoose,
  handleLoginSuccess,
  simulateLogin,
  DEFAULT_AVATAR_URL,
  getApiBaseUrl
};
