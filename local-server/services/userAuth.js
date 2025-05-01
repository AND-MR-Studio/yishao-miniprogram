/**
 * 用户认证服务
 * 处理用户认证、登录和token相关的功能
 *
 * @module userAuth
 * @author Yiavin
 * @version 1.0.0
 */

const userDataAccess = require('../dataAccess/userDataAccess');
const { logger, sendResponse, generateSecureToken } = require('./userHelpers');

/**
 * 验证用户身份的中间件
 *
 * @async
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件函数
 */
async function authMiddleware(req, res, next) {
  try {
    // 从请求头或查询参数中获取token
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;

    if (!token) {
      logger('warn', 'auth', '未授权访问: 缺少token');
      return sendResponse(res, false, '未授权，请先登录', 401);
    }

    // 通过token获取用户数据
    const userData = await userDataAccess.getUserByToken(token);

    if (!userData) {
      logger('warn', 'auth', '未授权访问: 无效token', { token: '***' });
      return sendResponse(res, false, '无效的凭证', 401);
    }

    // 检查token是否过期
    if (!userData.tokenExpireTime || Date.now() > userData.tokenExpireTime) {
      logger('warn', 'auth', '未授权访问: token已过期', { userId: userData.userId });
      return sendResponse(res, false, '登录已过期，请重新登录', 401);
    }

    // 将用户信息附加到请求对象
    req.openid = userData.openid;
    req.userData = userData;
    logger('debug', 'auth', '用户身份验证成功', { userId: userData.userId });
    next();
  } catch (error) {
    logger('error', 'auth', '身份验证失败', {
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    return sendResponse(res, false, '身份验证失败', 500);
  }
}

/**
 * 用户数据处理工具函数
 */
const userUtils = {
  /**
   * 初始化新用户数据
   *
   * @param {Object} userData - 用户数据对象
   * @param {string} openid - 用户openid
   * @param {Object} CONFIG - 配置对象
   * @returns {Object} - 初始化后的用户数据
   */
  initializeNewUser(userData, openid, CONFIG) {
    // 设置基本信息
    userData.createTime = new Date().toISOString();
    userData.openid = openid;

    // 设置等级和经验值
    userData.level = 1;
    userData.experience = 0;
    userData.maxExperience = 1000;

    // 设置积分和回答次数
    userData.points = 0;
    userData.remainingAnswers = CONFIG.defaults.initialAnswers;

    // 设置默认头像
    userData.avatarUrl = userData.avatarUrl || CONFIG.defaults.avatarUrl;

    // 初始化统计数据
    userData.signInCount = 0;
    userData.totalAnswered = 0;
    userData.totalCorrect = 0;
    userData.totalViewed = 0;
    userData.todayViewed = 0;
    userData.solvedCount = 0;
    userData.unsolvedCount = 0;
    userData.creationCount = 0;
    userData.favoriteCount = 0;

    // 初始化数组数据
    userData.answeredSoups = [];
    userData.viewedSoups = [];
    userData.createSoups = [];
    userData.favoriteSoups = [];
    userData.solvedSoups = [];

    return userData;
  },

  /**
   * 确保用户有侦探ID和昵称
   *
   * @async
   * @param {Object} userData - 用户数据对象
   * @param {Object} userModel - 用户模型对象
   * @returns {Promise<Object>} - 更新后的用户数据
   */
  async ensureUserIdentity(userData, userModel) {
    // 确保有侦探ID
    if (!userData.detectiveId) {
      const allUsers = await userDataAccess.getAllUsers();
      const userCount = Object.keys(allUsers || {}).length;
      userData.detectiveId = userModel.generateDetectiveId(userCount);
      logger('info', 'user', `为用户生成侦探ID: ${userData.detectiveId}`);
    }

    // 确保有昵称
    if (!userData.nickName) {
      userData.nickName = userModel.getFullnickName(userData.detectiveId);
      logger('info', 'user', `为用户生成默认昵称: ${userData.nickName}`);
    }

    return userData;
  },

  /**
   * 生成并设置用户token
   *
   * @param {Object} userData - 用户数据对象
   * @param {Object} CONFIG - 配置对象
   * @returns {Object} - 更新后的用户数据
   */
  setUserToken(userData, CONFIG) {
    const token = generateSecureToken();
    userData.token = token;
    userData.tokenExpireTime = Date.now() + (CONFIG.wechat.tokenExpireDays * 24 * 60 * 60 * 1000);
    userData.lastLoginTime = new Date().toISOString();

    logger('debug', 'auth', '生成新的用户token', { userId: userData.userId });
    return userData;
  }
};

/**
 * 根据userId查找用户
 *
 * @async
 * @param {string} userId - 用户ID
 * @returns {Promise<Object|null>} - 包含用户数据和openid的对象，或null
 */
async function findUserByUserId(userId) {
  try {
    logger('debug', 'user', `根据userId查找用户: ${userId}`);
    const usersObj = await userDataAccess.getAllUsers();

    for (const [openid, data] of Object.entries(usersObj)) {
      if (data.userId === userId) {
        logger('debug', 'user', `找到用户: ${userId}`);
        return { openid, userData: data };
      }
    }

    logger('warn', 'user', `未找到用户: ${userId}`);
    return null;
  } catch (error) {
    logger('error', 'user', `查找用户失败: ${userId}`, {
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * 安全更新用户数据
 *
 * @async
 * @param {string} openid - 用户openid
 * @param {Object} userData - 用户数据
 * @param {Object} updates - 要更新的字段
 * @param {Array<string>} [allowedFields] - 允许更新的字段列表
 * @returns {Promise<Object>} - 更新后的用户数据
 */
async function updateUserData(openid, userData, updates, allowedFields) {
  try {
    logger('debug', 'user', '更新用户数据', {
      userId: userData.userId,
      fields: Object.keys(updates)
    });

    // 如果提供了允许字段列表，则只更新这些字段
    if (Array.isArray(allowedFields)) {
      allowedFields.forEach(key => {
        if (updates[key] !== undefined) {
          userData[key] = updates[key];
          logger('debug', 'user', `更新字段: ${key}`, { value: updates[key] });
        }
      });
    } else {
      // 否则更新所有提供的字段
      Object.entries(updates).forEach(([key, value]) => {
        userData[key] = value;
        logger('debug', 'user', `更新字段: ${key}`, { value });
      });
    }

    // 保存用户数据
    await userDataAccess.saveUserData(openid, userData);
    logger('info', 'user', '用户数据更新成功', { userId: userData.userId });

    return userData;
  } catch (error) {
    logger('error', 'user', '更新用户数据失败', {
      userId: userData.userId,
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    throw error;
  }
}

module.exports = {
  // 中间件
  authMiddleware,

  // 用户工具函数
  userUtils,

  // 用户查找和更新
  findUserByUserId,
  updateUserData
};
