/**
 * 用户服务辅助函数
 * 提供用户服务所需的各种工具函数和辅助方法
 *
 * @module userHelpers
 * @author Yiavin
 * @version 1.0.0
 */

const userModel = require('../models/userModel');
const axios = require('axios');
const crypto = require('crypto');

// 配置常量
const CONFIG = {
  // 微信小程序配置
  wechat: {
    appId: 'wxda7c1552de0ae78f', // 小程序 AppID
    appSecret: '04af460e4af27413466065ef37802101', // 小程序 AppSecret
    tokenExpireDays: 7 // token有效期（天）
  },
  // 资源服务配置
  resourceService: {
    baseUrl: 'http://localhost:8080/yishao-api/asset'
  },
  // 用户奖励配置
  rewards: {
    signIn: {
      points: 50,
      experience: 50,
      answers: 50
    },
    solvePuzzle: {
      experience: 30
    }
  },
  // 默认值配置
  defaults: {
    avatarUrl: '/static/images/default-avatar.jpg',
    initialAnswers: 100
  }
};

/**
 * 统一日志记录函数
 * @param {string} level - 日志级别：'info'|'warn'|'error'|'debug'
 * @param {string} category - 日志类别
 * @param {string} message - 日志消息
 * @param {Object} [data] - 附加数据
 */
function logger(level, category, message, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    category: `userService.${category}`,
    message
  };

  if (data) {
    // 移除敏感信息
    const safeData = { ...data };
    if (safeData.token) safeData.token = '***';
    if (safeData.openid) safeData.openid = '***';
    if (safeData.session_key) safeData.session_key = '***';
    logEntry.data = safeData;
  }

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'info':
      console.log(JSON.stringify(logEntry));
      break;
    case 'debug':
      if (process.env.DEBUG) {
        console.log(JSON.stringify(logEntry));
      }
      break;
  }
}

/**
 * 调用微信登录接口获取 openid 和 session_key
 *
 * @async
 * @param {string} code - 微信登录临时凭证
 * @returns {Promise<Object>} - 包含openid和session_key的对象
 * @throws {Error} 当微信API调用失败时抛出错误
 */
async function getWechatOpenId(code) {
  try {
    logger('info', 'wechat', '开始获取微信OpenID', { code });

    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${CONFIG.wechat.appId}&secret=${CONFIG.wechat.appSecret}&js_code=${code}&grant_type=authorization_code`;
    const response = await axios.get(url);

    if (response.data.errcode) {
      const errorMsg = `微信登录失败: ${response.data.errmsg} (错误码: ${response.data.errcode})`;
      logger('error', 'wechat', errorMsg, { code, errcode: response.data.errcode });
      throw new Error(errorMsg);
    }

    logger('info', 'wechat', '成功获取微信OpenID');
    return {
      openid: response.data.openid,
      session_key: response.data.session_key
    };
  } catch (error) {
    logger('error', 'wechat', '获取openid失败', {
      code,
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * 增加用户经验值并处理等级提升
 *
 * @param {Object} userData - 用户数据对象
 * @param {number} amount - 增加的经验值数量
 * @returns {Object} - 包含更新后等级信息的对象
 */
function addExperience(userData, amount) {
  if (!userData) {
    logger('warn', 'experience', '尝试为空用户数据增加经验值');
    return null;
  }

  logger('debug', 'experience', `为用户增加经验值`, { userId: userData.userId, amount });

  // 提取当前等级信息
  let { level, experience, maxExperience } = userData;
  level = level || 1;
  experience = (experience || 0) + amount;
  maxExperience = maxExperience || 1000;
  let levelUp = false;

  // 处理等级提升逻辑
  if (experience >= maxExperience) {
    const overflow = experience - maxExperience;
    level = level + 1;
    maxExperience = maxExperience + 200; // 每升一级增加200经验上限
    experience = overflow;
    levelUp = true;
    logger('info', 'experience', `用户升级`, {
      userId: userData.userId,
      newLevel: level,
      oldLevel: level-1
    });
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
 * 获取用户头像URL
 *
 * @async
 * @param {Object} userData - 用户数据对象
 * @returns {Promise<string>} - 头像URL
 */
async function getUserAvatarUrl(userData) {
  // 默认使用用户数据中的头像或默认头像
  let avatarUrl = userData.avatarUrl || CONFIG.defaults.avatarUrl;

  try {
    // 只有当用户有userId时才尝试从资源服务获取头像
    if (userData.userId) {
      logger('debug', 'avatar', '从资源服务获取用户头像', { userId: userData.userId });

      const response = await axios.get(`${CONFIG.resourceService.baseUrl}/avatar/${userData.userId}`);

      if (response.data?.success && response.data?.data?.url) {
        avatarUrl = response.data.data.url;
        logger('debug', 'avatar', '成功获取用户头像', { userId: userData.userId });
      }
    }
  } catch (error) {
    logger('warn', 'avatar', '获取用户头像失败', {
      userId: userData.userId,
      error: error.message
    });
    // 出错时使用默认头像，不中断流程
  }

  return avatarUrl;
}

/**
 * 通用响应处理函数
 *
 * @param {Object} res - Express响应对象
 * @param {boolean} success - 是否成功
 * @param {*} data - 响应数据
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} - Express响应
 */
function sendResponse(res, success, data, statusCode = 200) {
  // 记录API响应
  if (!success || statusCode >= 400) {
    logger('warn', 'api', `API响应失败: ${statusCode}`, { error: data });
  } else {
    logger('debug', 'api', `API响应成功: ${statusCode}`);
  }

  return res.status(statusCode).json({
    success,
    success ? data : undefined,
    error: !success ? data : undefined
  });
}

/**
 * 生成安全的随机token
 *
 * @returns {string} - 随机token
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 验证请求参数
 *
 * @param {Object} params - 请求参数对象
 * @param {Array<string>} required - 必需参数列表
 * @returns {Object} - 验证结果 {valid: boolean, message: string}
 */
function validateParams(params, required) {
  for (const param of required) {
    if (params[param] === undefined || params[param] === null || params[param] === '') {
      return {
        valid: false,
        message: `缺少必要参数: ${param}`
      };
    }
  }
  return { valid: true };
}

/**
 * 路由处理器的错误处理包装函数
 *
 * @param {Function} handler - 路由处理函数
 * @returns {Function} - 包装后的处理函数
 */
function asyncHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      logger('error', 'api', `API处理异常: ${req.path}`, {
        error: error.message,
        stack: process.env.DEBUG ? error.stack : undefined,
        method: req.method,
        path: req.path
      });
      return sendResponse(res, false, '服务器内部错误', 500);
    }
  };
}

/**
 * 格式化用户响应数据
 *
 * @param {Object} userData - 用户数据对象
 * @param {string} avatarUrl - 用户头像URL
 * @returns {Object} - 格式化后的用户响应数据
 */
function formatUserResponse(userData, avatarUrl) {
  // 获取等级信息
  const levelInfo = userModel.getLevelInfo(userData.experience || 0);

  return {
    token: userData.token,
    userId: userData.userId,
    userInfo: {
      avatarUrl: avatarUrl,
      nickName: userData.nickName,
      detectiveId: userData.detectiveId || ''
    },
    level: {
      level: userData.level || 1,
      levelTitle: levelInfo.levelTitle,
      experience: userData.experience || 0,
      maxExperience: userData.maxExperience || 1000
    },
    answers: {
      remainingAnswers: userData.remainingAnswers || 0
    },
    points: {
      total: userData.points || 0,
      signInCount: userData.signInCount || 0,
      lastSignInDate: userData.lastSignInDate
    }
  };
}

/**
 * 格式化完整的用户信息响应
 *
 * @param {Object} userData - 用户数据对象
 * @param {string} avatarUrl - 用户头像URL
 * @returns {Object} - 格式化后的完整用户信息
 */
function formatFullUserInfo(userData, avatarUrl) {
  // 获取等级信息
  const levelInfo = userModel.getLevelInfo(userData.experience || 0);

  return {
    userId: userData.userId,
    userInfo: {
      avatarUrl: avatarUrl,
      nickName: userData.nickName,
      detectiveId: userData.detectiveId || ''
    },
    stats: {
      totalAnswered: userData.totalAnswered || 0,
      totalCorrect: userData.totalCorrect || 0,
      totalViewed: userData.totalViewed || 0,
      todayViewed: userData.todayViewed || 0,
      unsolvedCount: userData.unsolvedCount || 0,
      solvedCount: userData.solvedCount || 0,
      creationCount: userData.creationCount || 0,
      favoriteCount: userData.favoriteCount || 0
    },
    soups: {
      answeredSoups: userData.answeredSoups || [],
      viewedSoups: userData.viewedSoups || [],
      createSoups: userData.createSoups || [],
      favoriteSoups: userData.favoriteSoups || [],
      solvedSoups: userData.solvedSoups || []
    },
    level: {
      level: userData.level || 1,
      levelTitle: levelInfo.levelTitle,
      experience: userData.experience || 0,
      maxExperience: userData.maxExperience || 1000
    },
    answers: {
      remainingAnswers: userData.remainingAnswers || 0
    },
    points: {
      total: userData.points || 0,
      signInCount: userData.signInCount || 0,
      lastSignInDate: userData.lastSignInDate
    }
  };
}

module.exports = {
  // 配置
  CONFIG,
  
  // 日志和工具函数
  logger,
  getWechatOpenId,
  addExperience,
  getUserAvatarUrl,
  sendResponse,
  generateSecureToken,
  validateParams,
  asyncHandler,
  
  // 格式化函数
  formatUserResponse,
  formatFullUserInfo
};
