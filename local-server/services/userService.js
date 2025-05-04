/**
 * 用户服务层
 * 负责用户相关的业务逻辑，提供统一的用户管理接口
 *
 * @module userService
 * @author Yavin
 * @version 1.0.0
 *
 * 主要功能：
 * - 用户登录/注册 - 基于微信小程序登录体系
 * - 用户信息管理 - 包括基本信息、统计数据和偏好设置
 * - 用户头像管理 - 与资源服务集成
 * - 用户签到系统 - 每日签到奖励
 * - 用户等级和经验值系统 - 游戏化激励机制
 * - 用户汤谜题交互记录 - 浏览、回答、解决、创建、收藏
 */
const path = require('path');

const userDataAccess = require(path.join(__dirname, '../dataAccess/userDataAccess'));
const userModel = require(path.join(__dirname, '../models/userModel'));

// 导入辅助模块
const helpers = require('./userHelpers');
const auth = require('./userAuth');
const interactions = require('./userInteractions');

// 从辅助模块导入常用函数
const {
  CONFIG,
  logger,
  getWechatOpenId,
  getUserAvatarUrl,
  sendResponse,
  validateParams,
  asyncHandler,
  formatUserResponse,
  formatFullUserInfo
} = helpers;





// 从认证模块导入用户工具函数
const { authMiddleware, userUtils, findUserByUserId, updateUserData } = auth;

// 从交互模块导入用户交互函数
const { handleSignIn: handleUserSignIn, updateSoupInteraction: updateUserSoupInteraction } = interactions;

/**
 * 初始化用户服务路由
 *
 * @param {Object} app - Express应用实例
 */
function initUserRoutes(app) {
  // 1. 用户登录/注册
  app.post('/yishao-api/user/login', async (req, res) => {
    try {
      logger('info', 'login', '用户登录请求');
      const { code, userInfo } = req.body;

      // 验证请求参数
      const validation = validateParams(req.body, ['code']);
      if (!validation.valid) {
        logger('warn', 'login', '登录参数验证失败', { error: validation.message });
        return sendResponse(res, false, validation.message, 400);
      }

      // 调用微信接口获取openid
      const wxLoginResult = await getWechatOpenId(code);
      const openid = wxLoginResult.openid;
      logger('debug', 'login', '获取到用户openid');

      // 获取或创建用户数据
      let userData = await userDataAccess.getUserData(openid) || {};

      // 更新用户信息
      if (userInfo && userInfo.nickName) {
        userData.nickName = userInfo.nickName;
        logger('debug', 'login', '从请求更新用户昵称', { nickName: userInfo.nickName });
      }

      // 设置新用户的初始数据
      if (!userData.createTime) {
        logger('info', 'login', '初始化新用户数据');
        userData = userUtils.initializeNewUser(userData, openid, CONFIG);
      }

      // 确保用户有侦探ID和昵称
      userData = await userUtils.ensureUserIdentity(userData, userModel);

      // 生成或更新token
      userData = userUtils.setUserToken(userData, CONFIG);

      // 保存用户数据
      await userDataAccess.saveUserData(openid, userData);
      logger('info', 'login', '用户数据保存成功', { userId: userData.userId });

      // 获取用户头像
      const avatarUrl = await getUserAvatarUrl(userData);

      // 如果从资源服务获取的头像与用户数据不同，更新用户数据
      if (avatarUrl !== userData.avatarUrl) {
        userData.avatarUrl = avatarUrl;
        await userDataAccess.saveUserData(openid, userData);
        logger('debug', 'login', '更新用户头像URL');
      }

      // 返回用户信息和token
      const responseData = formatUserResponse(userData, avatarUrl);
      logger('info', 'login', '用户登录成功', { userId: userData.userId });
      return sendResponse(res, true, responseData);
    } catch (err) {
      logger('error', 'login', '登录失败', {
        error: err.message,
        stack: process.env.DEBUG ? err.stack : undefined
      });
      return sendResponse(res, false, '登录失败', 500);
    }
  });



  // 2. 更新用户信息 (需要身份验证)
  app.post('/yishao-api/user/update', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'user', '更新用户信息请求', { userId: req.userData.userId });
    const openid = req.openid;
    const userData = req.userData;
    const updateData = req.body;

    // 特殊处理昵称字段
    if ('nickName' in updateData) {
      if (!updateData.nickName || updateData.nickName.trim() === '') {
        // 如果昵称为空，使用默认的"一勺侦探#xxxxx"格式
        userData.nickName = userModel.getFullnickName(userData.detectiveId);
        logger('debug', 'user', '用户昵称为空，使用默认昵称', { nickName: userData.nickName });
      } else {
        // 用户提供了自定义昵称
        userData.nickName = updateData.nickName;
        logger('debug', 'user', '更新用户自定义昵称', { nickName: userData.nickName });
      }
    }

    // 保存用户数据
    await userDataAccess.saveUserData(openid, userData);
    logger('info', 'user', '用户信息更新成功', { userId: userData.userId });

    // 获取用户头像
    const avatarUrl = await getUserAvatarUrl(userData);

    return sendResponse(res, true, {
      userInfo: {
        avatarUrl: avatarUrl,
        nickName: userData.nickName
      }
    });
  }));



  // 3. 管理员更新用户信息
  app.post('/yishao-api/user/admin-update', asyncHandler(async (req, res) => {
    logger('info', 'admin', '管理员更新用户信息请求');
    const updateData = req.body;

    // 验证请求参数
    const validation = validateParams(req.body, ['userId']);
    if (!validation.valid) {
      logger('warn', 'admin', '参数验证失败', { error: validation.message });
      return sendResponse(res, false, validation.message, 400);
    }

    // 根据userId查找用户
    const userResult = await findUserByUserId(updateData.userId);
    if (!userResult) {
      return sendResponse(res, false, '用户不存在', 404);
    }

    const { openid, userData } = userResult;

    // 定义允许管理员更新的字段
    const allowedFields = [
      'nickName', 'level', 'experience',
      'maxExperience', 'points', 'signInCount', 'remainingAnswers'
    ];

    // 更新用户数据
    await updateUserData(openid, userData, updateData, allowedFields);

    // 获取用户头像
    const avatarUrl = await getUserAvatarUrl(userData);

    // 返回更新后的用户数据
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
  }));



  // 4. 获取用户信息 (需要身份验证)
  app.get('/yishao-api/user/info', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'user', '获取用户信息请求', { userId: req.userData.userId });
    const openid = req.openid;
    let userData = req.userData;

    // 获取用户头像
    const avatarUrl = await getUserAvatarUrl(userData);

    // 如果从资源服务获取的头像与用户数据不同，更新用户数据
    if (avatarUrl !== userData.avatarUrl) {
      userData.avatarUrl = avatarUrl;
      await userDataAccess.saveUserData(openid, userData);
      logger('debug', 'user', '更新用户头像URL');
    }

    // 返回用户信息
    const responseData = formatFullUserInfo(userData, avatarUrl);
    logger('debug', 'user', '用户信息获取成功');
    return sendResponse(res, true, responseData);
  }));

  // 5. 用户签到 (需要身份验证)
  app.post('/yishao-api/user/signin', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'signIn', '用户签到请求', { userId: req.userData.userId });
    const openid = req.openid;

    // 处理签到
    const result = await handleUserSignIn(openid, CONFIG);

    if (!result.success) {
      logger('info', 'signIn', '签到失败', {
        userId: req.userData.userId,
        reason: result.message
      });
      return sendResponse(res, false, result.message, 400);
    }

    logger('info', 'signIn', '签到成功', { userId: req.userData.userId });
    return sendResponse(res, true, result);
  }));

  // 6. 删除用户
  app.post('/yishao-api/user/delete', asyncHandler(async (req, res) => {
    logger('info', 'admin', '删除用户请求');
    const { userId } = req.body;

    // 验证请求参数
    const validation = validateParams(req.body, ['userId']);
    if (!validation.valid) {
      logger('warn', 'admin', '参数验证失败', { error: validation.message });
      return sendResponse(res, false, validation.message, 400);
    }

    // 根据userId查找用户
    const userResult = await findUserByUserId(userId);
    if (!userResult) {
      logger('warn', 'admin', '删除失败：用户不存在', { userId });
      return sendResponse(res, false, '用户不存在', 404);
    }

    const { openid } = userResult;

    // 删除用户数据
    const success = await userDataAccess.deleteUserData(openid);

    if (!success) {
      logger('error', 'admin', '删除用户失败', { userId });
      return sendResponse(res, false, '删除失败', 404);
    }

    logger('info', 'admin', '用户删除成功', { userId });
    return sendResponse(res, true, { message: '删除成功' });
  }));

  // 7. 获取所有用户列表
  app.get('/yishao-api/user/list', asyncHandler(async (_, res) => {
    logger('info', 'admin', '获取用户列表请求');

    // 获取所有用户数据
    const usersObj = await userDataAccess.getAllUsers();
    logger('debug', 'admin', `获取到${Object.keys(usersObj).length}个用户`);

    // 将对象转换为数组，并移除敏感信息
    const usersList = Object.entries(usersObj).map(([_, userData]) => {
      // 确保有userId
      const userId = userData.userId || '未设置ID';

      // 创建安全的用户数据对象
      const safeUserData = {
        userId,
        nickName: userData.nickName || '未设置昵称',
        avatarUrl: userData.avatarUrl || CONFIG.defaults.avatarUrl,
        level: userData.level || 1,
        experience: userData.experience || 0,
        maxExperience: userData.maxExperience || 1000,
        points: userData.points || 0,
        signInCount: userData.signInCount || 0,
        remainingAnswers: userData.remainingAnswers || 0,
        createTime: userData.createTime,
        lastLoginTime: userData.lastLoginTime,
        lastSignInDate: userData.lastSignInDate,
        // 统计数据
        totalAnswered: userData.totalAnswered || 0,
        totalCorrect: userData.totalCorrect || 0,
        totalViewed: userData.totalViewed || 0,
        solvedCount: userData.solvedCount || 0,
        unsolvedCount: userData.unsolvedCount || 0,
        creationCount: userData.creationCount || 0,
        favoriteCount: userData.favoriteCount || 0
      };

      return safeUserData;
    });

    logger('info', 'admin', '用户列表获取成功');
    return sendResponse(res, true, usersList);
  }));



  // 8. 更新用户浏览过的汤
  app.post('/yishao-api/user/viewed-soup', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'soup', '更新用户浏览汤记录请求', { userId: req.userData.userId });
    const openid = req.openid;
    const userData = req.userData;

    // 验证请求参数
    const validation = validateParams(req.body, ['soupId']);
    if (!validation.valid) {
      logger('warn', 'soup', '参数验证失败', { error: validation.message });
      return sendResponse(res, false, validation.message, 400);
    }

    const { soupId } = req.body;

    // 更新浏览记录
    const result = await updateUserSoupInteraction(openid, userData, soupId, 'viewed', {}, CONFIG);

    return sendResponse(res, true, result);
  }));

  // 9. 更新用户回答过的汤
  app.post('/yishao-api/user/answered-soup', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'soup', '更新用户回答汤记录请求', { userId: req.userData.userId });
    const openid = req.openid;
    const userData = req.userData;

    // 验证请求参数
    const validation = validateParams(req.body, ['soupId']);
    if (!validation.valid) {
      logger('warn', 'soup', '参数验证失败', { error: validation.message });
      return sendResponse(res, false, validation.message, 400);
    }

    const { soupId } = req.body;

    // 更新回答记录
    const result = await updateUserSoupInteraction(openid, userData, soupId, 'answered', {}, CONFIG);

    return sendResponse(res, true, result);
  }));

  // 10. 更新用户创建的汤
  app.post('/yishao-api/user/created-soup', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'soup', '更新用户创建汤记录请求', { userId: req.userData.userId });
    const openid = req.openid;
    const userData = req.userData;

    // 验证请求参数
    const validation = validateParams(req.body, ['soupId']);
    if (!validation.valid) {
      logger('warn', 'soup', '参数验证失败', { error: validation.message });
      return sendResponse(res, false, validation.message, 400);
    }

    const { soupId } = req.body;

    // 更新创建记录
    const result = await updateUserSoupInteraction(openid, userData, soupId, 'created', {}, CONFIG);

    return sendResponse(res, true, result);
  }));

  // 11. 更新用户收藏的汤
  app.post('/yishao-api/user/favorite-soup', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'soup', '更新用户收藏汤记录请求', { userId: req.userData.userId });
    const openid = req.openid;
    const userData = req.userData;

    // 验证请求参数
    const validation = validateParams(req.body, ['soupId', 'isFavorite']);
    if (!validation.valid) {
      logger('warn', 'soup', '参数验证失败', { error: validation.message });
      return sendResponse(res, false, validation.message, 400);
    }

    const { soupId, isFavorite } = req.body;

    // 更新收藏记录
    const result = await updateUserSoupInteraction(openid, userData, soupId, 'favorite', { isFavorite }, CONFIG);

    return sendResponse(res, true, result);
  }));

  // 12. 更新用户点赞的汤
  app.post('/yishao-api/user/liked-soup', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'soup', '更新用户点赞汤记录请求', { userId: req.userData.userId });
    const openid = req.openid;
    const userData = req.userData;

    // 验证请求参数
    const validation = validateParams(req.body, ['soupId', 'isLike']);
    if (!validation.valid) {
      logger('warn', 'soup', '参数验证失败', { error: validation.message });
      return sendResponse(res, false, validation.message, 400);
    }

    const { soupId, isLike } = req.body;

    // 更新点赞记录
    const result = await updateUserSoupInteraction(openid, userData, soupId, 'liked', { isLike }, CONFIG);

    return sendResponse(res, true, result);
  }));

  // 13. 更新用户已解决的汤
  app.post('/yishao-api/user/solved-soup', authMiddleware, asyncHandler(async (req, res) => {
    logger('info', 'soup', '更新用户已解决汤记录请求', { userId: req.userData.userId });
    const openid = req.openid;
    const userData = req.userData;

    // 验证请求参数
    const validation = validateParams(req.body, ['soupId']);
    if (!validation.valid) {
      logger('warn', 'soup', '参数验证失败', { error: validation.message });
      return sendResponse(res, false, validation.message, 400);
    }

    const { soupId } = req.body;

    // 更新已解决记录
    const result = await updateUserSoupInteraction(openid, userData, soupId, 'solved', {}, CONFIG);

    return sendResponse(res, true, result);
  }));

  // 14. (已删除 - 检查用户是否已解决某个汤)

}

/**
 * 初始化用户服务模块
 *
 * @async
 * @returns {Promise<void>}
 */
async function init() {
  try {
    logger('info', 'init', '正在初始化用户服务...');
    await userDataAccess.init();
    logger('info', 'init', '用户服务初始化完成');
  } catch (error) {
    logger('error', 'init', '用户服务初始化失败', {
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * 用户服务模块导出
 * @module userService
 */
module.exports = {
  // 核心功能
  init,
  initUserRoutes,

  // 中间件
  authMiddleware,

  // 配置
  CONFIG
};
