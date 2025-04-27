/**
 * 用户服务层 - 优化版
 * 负责用户相关的业务逻辑
 *
 * 主要功能：
 * - 用户登录/注册
 * - 用户信息管理
 * - 用户头像上传
 * - 用户签到
 * - 用户等级和经验值管理
 */

const { v4: uuidv4 } = require('uuid');
const userDataAccess = require('../dataAccess/userDataAccess');
const userModel = require('../models/userModel');
const axios = require('axios');
const crypto = require('crypto');


// 微信小程序配置
const WECHAT_CONFIG = {
  appId: 'wxda7c1552de0ae78f', // 替换为你的小程序 AppID
  appSecret: '04af460e4af27413466065ef37802101' // 替换为你的小程序 AppSecret
};

/**
 * 调用微信登录接口获取 openid 和 session_key
 * @param {string} code - 微信登录code
 * @returns {Promise<Object>} - 包含openid和session_key的对象
 */
async function getWechatOpenId(code) {
  try {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_CONFIG.appId}&secret=${WECHAT_CONFIG.appSecret}&js_code=${code}&grant_type=authorization_code`;

    const response = await axios.get(url);

    if (response.data.errcode) {
      console.error(`微信登录失败: ${response.data.errmsg} (错误码: ${response.data.errcode})`);
      throw new Error(`微信登录失败: ${response.data.errmsg}`);
    }

    return {
      openid: response.data.openid,
      session_key: response.data.session_key
    };
  } catch (error) {
    console.error('获取openid失败:', error.message);
    throw error;
  }
}

/**
 * 增加经验值
 * @param {Object} userData - 用户数据
 * @param {number} amount - 增加的经验值
 * @returns {Object} - 更新后的等级信息
 */
function addExperience(userData, amount) {
  if (!userData) return null;

  let { level, experience, maxExperience } = userData;
  experience = (experience || 0) + amount;
  let levelUp = false;

  // 如果经验值超过最大值，升级
  if (experience >= maxExperience) {
    const overflow = experience - maxExperience;
    level = level + 1;
    maxExperience = maxExperience + 200; // 每升一级增加200经验上限
    experience = overflow;
    levelUp = true;
  }

  // 更新用户数据
  userData.level = level;
  userData.experience = experience;
  userData.maxExperience = maxExperience;

  // 获取等级标题
  const levelInfo = userModel.getLevelInfo(experience);
  userData.levelTitle = levelInfo.levelTitle;

  return {
    userData,
    levelUp,
    level,
    levelTitle: levelInfo.levelTitle,
    experience,
    maxExperience
  };
}

/**
 * 重置每日回答次数
 * @param {Object} userData - 用户数据
 * @returns {Object} - 更新后的用户数据
 */
function resetDailyAnswers(userData) {
  if (!userData) return userData;

  const today = new Date().toISOString().split('T')[0];
  const lastReset = userData.lastAnswerReset || '2000-01-01';

  if (today !== lastReset) {
    userData.remainingAnswers = userModel.MAX_DAILY_ANSWERS;
    userData.lastAnswerReset = today;
  }

  return userData;
}

/**
 * 处理用户签到
 * @param {string} userId - 用户ID
 * @param {boolean} isDailyFirstLogin - 是否是每日首次登录
 * @returns {Promise<Object>} - 签到结果
 */
async function handleSignIn(userId, isDailyFirstLogin = false) {
  const userData = await userDataAccess.getUserData(userId);
  if (!userData) return { success: false, message: '用户不存在' };

  const today = new Date().toISOString().split('T')[0];

  // 检查是否已经签到（如果不是每日首次登录）
  if (!isDailyFirstLogin && userData.lastSignInDate === today) {
    return { success: false, message: '今日已签到' };
  }

  // 更新签到信息
  userData.lastSignInDate = today;
  userData.signInCount = (userData.signInCount || 0) + 1;
  userData.points = (userData.points || 0) + userModel.DAILY_SIGN_IN_POINTS;

  // 增加回答次数（如果不是每日首次登录，因为首次登录已经增加了）
  if (!isDailyFirstLogin) {
    userData.remainingAnswers = (userData.remainingAnswers || 0) + 10;
  }

  // 增加经验值（如果不是每日首次登录，因为首次登录已经增加了）
  let expResult;
  if (!isDailyFirstLogin) {
    expResult = addExperience(userData, userModel.DAILY_SIGN_IN_EXPERIENCE);
  } else {
    // 如果是每日首次登录，只获取当前等级信息，不再增加经验值
    expResult = {
      levelUp: false,
      level: userData.level,
      levelTitle: userModel.getLevelInfo(userData.experience).levelTitle,
      experience: userData.experience,
      maxExperience: userData.maxExperience
    };
  }

  // 保存用户数据
  await userDataAccess.saveUserData(userId, userData);

  return {
    success: true,
    message: '签到成功',
    points: userData.points,
    signInCount: userData.signInCount,
    remainingAnswers: userData.remainingAnswers,
    levelUp: expResult.levelUp,
    level: expResult.level,
    levelTitle: expResult.levelTitle,
    experience: expResult.experience,
    maxExperience: expResult.maxExperience
  };
}

/**
 * 通用响应处理函数
 * @param {Object} res - Express响应对象
 * @param {boolean} success - 是否成功
 * @param {*} data - 响应数据
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} - Express响应
 */
function sendResponse(res, success, data, statusCode = 200) {
  return res.status(statusCode).json({
    success,
    data: success ? data : undefined,
    error: !success ? data : undefined
  });
}

/**
 * 生成安全的随机 token
 * @returns {string} - 随机 token
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 验证用户身份的中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件函数
 */
async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;

    if (!token) {
      return sendResponse(res, false, '未授权，请先登录', 401);
    }

    const userData = await userDataAccess.getUserByToken(token);

    if (!userData) {
      return sendResponse(res, false, '无效的凭证', 401);
    }

    if (!userData.tokenExpireTime || Date.now() > userData.tokenExpireTime) {
      return sendResponse(res, false, '登录已过期，请重新登录', 401);
    }

    // 将用户信息附加到请求对象
    req.openid = userData.openid;
    req.userData = userData;
    next();
  } catch (error) {
    console.error('身份验证失败:', error.message);
    return sendResponse(res, false, '身份验证失败', 500);
  }
}





/**
 * 初始化用户服务路由
 * @param {Object} app - Express应用实例
 */
function initUserRoutes(app) {
  // 1. 用户登录/注册
  app.post('/yishao-api/user/login', async (req, res) => {
    try {
      const { code, userInfo } = req.body;

      if (!code) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      // 调用微信接口获取openid
      const wxLoginResult = await getWechatOpenId(code);
      const openid = wxLoginResult.openid;

      // 获取或创建用户数据
      let userData = await userDataAccess.getUserData(openid);

      // 更新用户信息
      if (userInfo) {
        userData.nickName = userInfo.nickName || userData.nickName;
        // 不再从前端更新头像URL，而是从资源服务获取
      }

      // 设置新用户的初始数据
      if (!userData.createTime) {
        userData.createTime = new Date().toISOString();
        userData.level = 1;
        userData.experience = 0;
        userData.maxExperience = 1000;
        userData.points = 0;
        userData.remainingAnswers = userModel.MAX_DAILY_ANSWERS;
        // 设置默认头像
        userData.avatarUrl = userData.avatarUrl || '/static/images/default-avatar.jpg';
      }

      // 确保存储openid
      userData.openid = openid;

      // 确保有侦探ID
      if (!userData.detectiveId) {
        const allUsers = await userDataAccess.getAllUsers();
        const userCount = Object.keys(allUsers).length;
        userData.detectiveId = userModel.generateDetectiveId(userCount);
      }

      // 确保有昵称
      if (!userData.nickName) {
        userData.nickName = userModel.getFullnickName(userData.detectiveId);
      }

      // 生成或更新 token
      const token = generateSecureToken();
      userData.token = token;
      userData.tokenExpireTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天过期
      userData.lastLoginTime = new Date().toISOString();

      // 重置每日回答次数
      userData = resetDailyAnswers(userData);

      // 检查是否是每日首次登录
      let isDailyFirstLogin = false;
      const today = new Date().toISOString().split('T')[0];
      const lastLoginDate = userData.lastLoginDate || '2000-01-01';

      // 如果上次登录日期不是今天，则是每日首次登录
      if (lastLoginDate !== today) {
        isDailyFirstLogin = true;

        // 自动增加回答次数
        userData.remainingAnswers = (userData.remainingAnswers || 0) + 10;

        // 增加经验值
        const expResult = addExperience(userData, userModel.DAILY_SIGN_IN_EXPERIENCE);

        // 更新最后登录日期
        userData.lastLoginDate = today;

        // 如果是每日首次登录，显示提示
        console.log(`用户 ${userData.nickName} (${userData.userId}) 每日首次登录，回答次数+10`);
      }

      // 保存用户数据
      await userDataAccess.saveUserData(openid, userData);

      // 获取等级信息
      const levelInfo = userModel.getLevelInfo(userData.experience);

      // 尝试从资源服务获取用户头像
      let avatarUrl = userData.avatarUrl || '/static/images/default-avatar.jpg';

      try {
        // 调用资源服务获取用户头像
        const axios = require('axios');
        const userId = userData.userId;

        if (userId) {
          const avatarResponse = await axios.get(`http://localhost:8080/yishao-api/asset/avatar/${userId}`);

          if (avatarResponse.data && avatarResponse.data.success && avatarResponse.data.data && avatarResponse.data.data.url) {
            // 使用资源服务返回的头像URL
            avatarUrl = avatarResponse.data.data.url;

            // 如果用户数据中的头像URL与资源服务不同，更新用户数据
            if (userData.avatarUrl !== avatarUrl) {
              userData.avatarUrl = avatarUrl;
              await userDataAccess.saveUserData(openid, userData);
            }
          }
        }
      } catch (avatarError) {
        console.error('获取用户头像失败:', avatarError.message);
        // 使用用户数据中的头像URL或默认头像
      }

      // 返回用户信息和token
      return sendResponse(res, true, {
        token: userData.token,
        userId: userData.userId,
        isDailyFirstLogin: isDailyFirstLogin, // 添加每日首次登录标志
        userInfo: {
          avatarUrl: avatarUrl,
          nickName: userData.nickName,
          detectiveId: userData.detectiveId || ''
        },
        level: {
          level: userData.level,
          levelTitle: levelInfo.levelTitle,
          experience: userData.experience,
          maxExperience: userData.maxExperience
        },
        answers: {
          remainingAnswers: userData.remainingAnswers,
          maxDailyAnswers: userModel.MAX_DAILY_ANSWERS
        },
        points: {
          total: userData.points,
          signInCount: userData.signInCount || 0,
          lastSignInDate: userData.lastSignInDate
        }
      });
    } catch (err) {
      console.error('登录失败:', err.message);
      return sendResponse(res, false, '登录失败', 500);
    }
  });

  // 2. 更新用户信息 (需要身份验证)
  app.post('/yishao-api/user/update', authMiddleware, async (req, res) => {
    try {
      const openid = req.openid;
      const userData = req.userData;
      const updateData = req.body;

      // 特殊处理昵称字段
      if ('nickName' in updateData) {
        if (!updateData.nickName || updateData.nickName.trim() === '') {
          // 如果昵称为空，使用默认的"一勺侦探#xxxxx"格式
          if (!userData.detectiveId) {
            // 如果没有detectiveId，生成一个新的
            const users = await userDataAccess.getAllUsers();
            const userCount = Object.keys(users || {}).length;
            userData.detectiveId = userModel.generateDetectiveId(userCount);
          }
          userData.nickName = userModel.getFullnickName(userData.detectiveId);
        } else {
          // 用户提供了自定义昵称
          userData.nickName = updateData.nickName;
        }
      }

      // 保存用户数据
      await userDataAccess.saveUserData(openid, userData);

      // 尝试从资源服务获取用户头像
      let avatarUrl = userData.avatarUrl || '/static/images/default-avatar.jpg';

      try {
        // 调用资源服务获取用户头像
        const axios = require('axios');
        const userId = userData.userId;

        if (userId) {
          const avatarResponse = await axios.get(`http://localhost:8080/yishao-api/asset/avatar/${userId}`);

          if (avatarResponse.data && avatarResponse.data.success && avatarResponse.data.data && avatarResponse.data.data.url) {
            // 使用资源服务返回的头像URL
            avatarUrl = avatarResponse.data.data.url;
          }
        }
      } catch (avatarError) {
        console.error('获取用户头像失败:', avatarError.message);
        // 使用用户数据中的头像URL或默认头像
      }

      return sendResponse(res, true, {
        userInfo: {
          avatarUrl: avatarUrl,
          nickName: userData.nickName
        }
      });
    } catch (err) {
      console.error('更新用户信息失败:', err.message);
      return sendResponse(res, false, '更新用户信息失败', 500);
    }
  });

  // 3. 管理员更新用户信息
  app.post('/yishao-api/user/admin-update', async (req, res) => {
    try {
      const updateData = req.body;

      if (!updateData.userId) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      // 根据userId查找对应的openid
      const usersObj = await userDataAccess.getAllUsers();
      let targetOpenid = null;
      let userData = null;

      for (const [openid, data] of Object.entries(usersObj)) {
        if (data.userId === updateData.userId) {
          targetOpenid = openid;
          userData = data;
          break;
        }
      }

      if (!targetOpenid || !userData) {
        return sendResponse(res, false, '用户不存在', 404);
      }

      // 更新用户数据中的字段
      const allowedFields = [
        'nickName', 'level', 'experience',
        'maxExperience', 'points', 'signInCount', 'remainingAnswers'
      ];

      allowedFields.forEach(key => {
        if (updateData[key] !== undefined) {
          userData[key] = updateData[key];
        }
      });

      await userDataAccess.saveUserData(targetOpenid, userData);

      // 尝试从资源服务获取用户头像
      let avatarUrl = userData.avatarUrl || '/static/images/default-avatar.jpg';

      try {
        // 调用资源服务获取用户头像
        const axios = require('axios');
        const userId = userData.userId;

        if (userId) {
          const avatarResponse = await axios.get(`http://localhost:8080/yishao-api/asset/avatar/${userId}`);

          if (avatarResponse.data && avatarResponse.data.success && avatarResponse.data.data && avatarResponse.data.data.url) {
            // 使用资源服务返回的头像URL
            avatarUrl = avatarResponse.data.data.url;
          }
        }
      } catch (avatarError) {
        console.error('获取用户头像失败:', avatarError.message);
        // 使用用户数据中的头像URL或默认头像
      }

      return sendResponse(res, true, {
        message: '更新成功',
        userData: {
          userId: userData.userId,
          nickName: userData.nickName,
          avatarUrl: avatarUrl,
          level: userData.level,
          experience: userData.experience,
          maxExperience: userData.maxExperience,
          points: userData.points,
          signInCount: userData.signInCount,
          remainingAnswers: userData.remainingAnswers
        }
      });
    } catch (err) {
      console.error('管理员更新用户信息失败:', err.message);
      return sendResponse(res, false, '更新用户信息失败', 500);
    }
  });

  // 4. 获取用户信息 (需要身份验证)
  app.get('/yishao-api/user/info', authMiddleware, async (req, res) => {
    try {
      const openid = req.openid;
      let userData = req.userData;

      // 重置每日回答次数
      userData = resetDailyAnswers(userData);
      await userDataAccess.saveUserData(openid, userData);

      // 获取等级信息
      const levelInfo = userModel.getLevelInfo(userData.experience);

      // 尝试从资源服务获取用户头像
      let avatarUrl = userData.avatarUrl || '/static/images/default-avatar.jpg';

      try {
        // 调用资源服务获取用户头像
        const axios = require('axios');
        const userId = userData.userId;

        if (userId) {
          const avatarResponse = await axios.get(`http://localhost:8080/yishao-api/asset/avatar/${userId}`);

          if (avatarResponse.data && avatarResponse.data.success && avatarResponse.data.data && avatarResponse.data.data.url) {
            // 使用资源服务返回的头像URL
            avatarUrl = avatarResponse.data.data.url;

            // 如果用户数据中的头像URL与资源服务不同，更新用户数据
            if (userData.avatarUrl !== avatarUrl) {
              userData.avatarUrl = avatarUrl;
              await userDataAccess.saveUserData(openid, userData);
            }
          }
        }
      } catch (avatarError) {
        console.error('获取用户头像失败:', avatarError.message);
        // 使用用户数据中的头像URL或默认头像
      }

      // 返回用户信息
      return sendResponse(res, true, {
        userId: userData.userId,
        userInfo: {
          avatarUrl: avatarUrl,
          nickName: userData.nickName,
          detectiveId: userData.detectiveId || ''
        },
        stats: {
          totalAnswered: userData.totalAnswered,
          totalCorrect: userData.totalCorrect,
          totalViewed: userData.totalViewed,
          todayViewed: userData.todayViewed,
          unsolvedCount: userData.unsolvedCount || 0,
          solvedCount: userData.solvedCount || 0,
          creationCount: userData.creationCount || 0,
          favoriteCount: userData.favoriteCount || 0
        },
        level: {
          level: userData.level || 1,
          levelTitle: levelInfo.levelTitle,
          experience: userData.experience || 0,
          maxExperience: userData.maxExperience || 1000
        },
        answers: {
          remainingAnswers: userData.remainingAnswers || 0,
          maxDailyAnswers: userModel.MAX_DAILY_ANSWERS
        },
        points: {
          total: userData.points || 0,
          signInCount: userData.signInCount || 0,
          lastSignInDate: userData.lastSignInDate
        }
      });
    } catch (err) {
      console.error('获取用户信息失败:', err.message);
      return sendResponse(res, false, '获取用户信息失败', 500);
    }
  });

  // 5. 用户签到 (需要身份验证)
  app.post('/yishao-api/user/signin', authMiddleware, async (req, res) => {
    try {
      const openid = req.openid;
      // 获取是否是每日首次登录的标志
      const isDailyFirstLogin = req.body.dailyFirstLogin === true;

      const result = await handleSignIn(openid, isDailyFirstLogin);

      if (!result.success) {
        return sendResponse(res, false, result.message, 400);
      }

      return sendResponse(res, true, result);
    } catch (err) {
      console.error('用户签到失败:', err.message);
      return sendResponse(res, false, '用户签到失败', 500);
    }
  });

  // 6. 删除用户
  app.post('/yishao-api/user/delete', async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      // 根据userId查找对应的openid
      const usersObj = await userDataAccess.getAllUsers();
      let targetOpenid = null;

      for (const [openid, userData] of Object.entries(usersObj)) {
        if (userData.userId && userData.userId === userId) {
          targetOpenid = openid;
          break;
        }
      }

      if (!targetOpenid) {
        return sendResponse(res, false, '用户不存在', 404);
      }

      // 删除用户数据
      const success = await userDataAccess.deleteUserData(targetOpenid);

      if (!success) {
        return sendResponse(res, false, '删除失败', 404);
      }

      return sendResponse(res, true, { message: '删除成功' });
    } catch (err) {
      console.error('删除用户失败:', err.message);
      return sendResponse(res, false, '删除用户失败', 500);
    }
  });

  // 7. 获取所有用户列表
  app.get('/yishao-api/user/list', async (req, res) => {
    try {
      const usersObj = await userDataAccess.getAllUsers();

      // 将对象转换为数组，并移除敏感信息
      const usersList = Object.entries(usersObj).map(([openid, userData]) => {
        const userId = userData.userId || '未设置ID';

        return {
          userId,
          ...userData,
          // 不返回敏感信息
          openid: undefined,
          token: undefined,
          tokenExpireTime: undefined
        };
      });

      return sendResponse(res, true, usersList);
    } catch (err) {
      console.error('获取用户列表失败:', err.message);
      return sendResponse(res, false, '获取用户列表失败', 500);
    }
  });


}

/**
 * 初始化模块
 */
async function init() {
  try {
    await userDataAccess.init();
    console.log('用户服务初始化完成');
  } catch (error) {
    console.error('用户服务初始化失败:', error.message);
    throw error;
  }
}

module.exports = {
  init,
  initUserRoutes,
  addExperience,
  resetDailyAnswers,
  handleSignIn,
  authMiddleware
};
