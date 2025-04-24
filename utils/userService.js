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
  // 假设从本地存储或者调用API获取剩余次数
  return wx.getStorageSync('remainingAnswers') || 0;
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

  // 上传到服务器
  const config = {
    url: api.user_update_url,
    method: 'POST',
    data: {
      openid: userInfo.openId,
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

  // 上传到服务器
  const config = {
    url: api.user_update_url,
    method: 'POST',
    data: {
      openid: userInfo.openId,
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

/**
 * 登录
 * @param {Function} callback - 登录成功回调
 * @returns {Promise} - 登录结果
 */
function login(callback) {
  return new Promise((resolve, reject) => {
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
            // 构建用户信息
            const userInfo = {
              avatarUrl: res.data.userInfo?.avatarUrl || DEFAULT_AVATAR_URL,
              nickName: res.data.userInfo?.nickName || '',
              openId: res.data.openid,
              loginTime: new Date().getTime()
            };

            // 保存到本地存储
            wx.setStorageSync(USER_INFO_KEY, userInfo);
            wx.setStorageSync('loginTimestamp', new Date().getTime());

            // 如果有回调函数，执行回调
            if (typeof callback === 'function') {
              callback(userInfo);
            }

            resolve(userInfo);
          } else {
            wx.showToast({
              title: '登录失败，请重试',
              icon: 'none'
            });
            reject('登录失败');
          }
        }).catch(err => {
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
          reject(err);
        });
      },
      fail: (err) => {
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
 * 退出登录
 * @returns {Object} - 退出结果
 */
function logout() {
  // 清除本地存储
  wx.removeStorageSync(USER_INFO_KEY);
  wx.removeStorageSync('loginTimestamp');

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
  const userInfo = getUserInfo();
  if (!userInfo) {
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

  // 上传到服务器
  const config = {
    url: api.user_update_url,
    method: 'POST',
    data: {
      openid: userInfo.openId,
      nickName: userInfo.nickName
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
