// utils/userService.js
const api = require('./api');

// 定义常量
const USER_INFO_KEY = 'userInfo';
const DEFAULT_AVATAR_URL = '/static/images/default-avatar.jpg';
const LEVEL_TITLES = ['见习侦探', '初级侦探', '中级侦探', '高级侦探', '特级侦探', '神探'];

/**
 * 获取用户信息
 */
function getUserInfo() {
  try {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync(USER_INFO_KEY);
    return userInfo || null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
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
 * 生成随机侦探ID
 * @returns {string} - 随机侦探ID
 */
function generateDetectiveId() {
  // 生成5位随机数字
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `一勺侦探#${randomNum}`;
}

/**
 * 解析侦探ID
 * 将昵称中的ID部分提取出来
 * @param {string} nickname - 昵称
 * @returns {Object} - 解析结果
 */
function parseDetectiveId(nickname) {
  if (!nickname) return { name: '未登录的侦探', id: '未登录' };

  const parts = nickname.split('#');
  if (parts.length > 1) {
    return {
      name: parts[0],
      id: parts[1]
    };
  }

  return {
    name: nickname,
    id: '未设置'
  };
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
            // 构建用户信息 (不保存 openid)
            const userInfo = {
              avatarUrl: res.data.userInfo?.avatarUrl || DEFAULT_AVATAR_URL,
              nickName: res.data.userInfo?.nickName || '',
              loginTime: new Date().getTime(),
              // 保存等级信息
              level: res.data.level?.level || 1,
              levelTitle: res.data.level?.levelTitle || '见习侦探',
              experience: res.data.level?.experience || 0,
              maxExperience: res.data.level?.maxExperience || 1000,
              // 保存回答次数信息
              remainingAnswers: res.data.answers?.remainingAnswers || 0,
              // 保存积分信息
              points: res.data.points?.total || 0,
              signInCount: res.data.points?.signInCount || 0,
              lastSignInDate: res.data.points?.lastSignInDate || null
            };

            // 单独保存 token 到本地存储
            if (res.data.token) {
              wx.setStorageSync('token', res.data.token);
            }

            // 保存用户信息到本地存储
            wx.setStorageSync(USER_INFO_KEY, userInfo);
            wx.setStorageSync('loginTimestamp', new Date().getTime());

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
 * 获取等级信息
 * @param {number} experience - 经验值
 * @returns {Object} - 等级信息
 */
function getLevelInfo(experience = 350) {
  // 根据经验值计算等级
  let level = 1;
  let maxExperience = 1000;

  // 根据经验值动态计算等级
  if (experience >= 900) {
    level = 6;
    maxExperience = 2000;
  } else if (experience >= 700) {
    level = 5;
    maxExperience = 1000;
  } else if (experience >= 500) {
    level = 4;
    maxExperience = 800;
  } else if (experience >= 300) {
    level = 3;
    maxExperience = 600;
  } else if (experience >= 100) {
    level = 2;
    maxExperience = 400;
  }

  return {
    level,
    levelTitle: LEVEL_TITLES[level - 1],
    experience,
    maxExperience
  };
}

/**
 * 增加经验值
 * @param {number} currentExperience - 当前经验值
 * @param {number} currentLevel - 当前等级
 * @param {number} currentMaxExperience - 当前最大经验值
 * @param {number} amount - 增加的经验值
 * @returns {Object} - 更新后的等级信息
 */
function addExperience(currentExperience, currentLevel, currentMaxExperience, amount) {
  let experience = currentExperience + amount;
  let level = currentLevel;
  let maxExperience = currentMaxExperience;
  let levelUp = false;

  // 如果经验值超过最大值，升级
  if (experience >= maxExperience) {
    const overflow = experience - maxExperience;
    level = level + 1;
    maxExperience = maxExperience + 200; // 每升一级增加200经验上限
    experience = overflow;
    levelUp = true;
  }

  return {
    level,
    levelTitle: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    experience,
    maxExperience,
    levelUp
  };
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
  getRemainingAnswers,
  updateAvatar,
  updateNickname,
  generateDetectiveId,
  parseDetectiveId,
  login,
  logout,
  checkLoginStatus,
  getLevelInfo,
  addExperience,
  setUserInfo
};
