/**
 * 用户服务层
 * 负责用户相关的业务逻辑
 */

const { v4: uuidv4 } = require('uuid');
const userDataAccess = require('../dataAccess/userDataAccess');
const userModel = require('../models/userModel');
const axios = require('axios');
const crypto = require('crypto'); // 引入 crypto 模块

// 微信小程序配置
const WECHAT_CONFIG = {
  appId: 'wxda7c1552de0ae78f', // 替换为你的小程序 AppID
  appSecret: '04af460e4af27413466065ef37802101' // 替换为你的小程序 AppSecret
};

/**
 * 模拟微信登录接口获取 openid
 * @param {string} code - 微信登录code
 * @returns {string} - openid
 */
/**
 * 调用微信登录接口获取 openid 和 session_key
 * @param {string} code - 微信登录code
 * @returns {Object} - 包含openid和session_key的对象
 */
async function getWechatOpenId(code) {
  try {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_CONFIG.appId}&secret=${WECHAT_CONFIG.appSecret}&js_code=${code}&grant_type=authorization_code`;

    console.log('请求微信登录接口:', url);
    const response = await axios.get(url);

    if (response.data.errcode) {
      console.error('微信登录失败:', response.data.errmsg, '错误码:', response.data.errcode);
      throw new Error(`微信登录失败: ${response.data.errmsg}`);
    }

    console.log('微信登录成功，获取到openid和session_key');

    // 返回完整的登录信息，包括openid和session_key
    return {
      openid: response.data.openid,
      session_key: response.data.session_key
    };
  } catch (error) {
    console.error('获取openid失败:', error);
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
 * @returns {Object} - 签到结果
 */
async function handleSignIn(userId) {
  const userData = await userDataAccess.getUserData(userId);
  if (!userData) return { success: false, message: '用户不存在' };

  const today = new Date().toISOString().split('T')[0];

  // 检查是否已经签到
  if (userData.lastSignInDate === today) {
    return { success: false, message: '今日已签到' };
  }

  // 更新签到信息
  userData.lastSignInDate = today;
  userData.signInCount = (userData.signInCount || 0) + 1;
  userData.points = (userData.points || 0) + userModel.DAILY_SIGN_IN_POINTS;

  // 增加经验值
  const expResult = addExperience(userData, userModel.DAILY_SIGN_IN_EXPERIENCE);

  // 保存用户数据
  await userDataAccess.saveUserData(userId, userData);

  return {
    success: true,
    message: '签到成功',
    points: userData.points,
    signInCount: userData.signInCount,
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
 * 生成一个简单的随机 token
 * @returns {string} - 随机 token
 */
function generateSimpleToken() {
  return crypto.randomBytes(32).toString('hex'); // 生成一个 64 位的十六进制随机字符串
}

/**
 * 初始化用户服务路由
 * @param {Object} app - Express应用实例
 */
// 添加一个中间件来验证 token
async function simpleAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token; // 从 Header 或 Query 获取 token

  if (!token) {
    return sendResponse(res, false, '未授权，请先登录', 401);
  }

  // 需要修改 userDataAccess 添加 getUserByToken 方法
  const userData = await userDataAccess.getUserByToken(token);

  if (!userData || !userData.tokenExpireTime || Date.now() > userData.tokenExpireTime) {
    // 如果找不到用户或 token 已过期
    return sendResponse(res, false, '登录已过期，请重新登录', 401);
  }

  // 将用户的 openid 附加到请求对象，方便后续处理
  req.openid = userData.openid;
  req.userData = userData; // 也可以直接附加用户数据
  next(); // 验证通过，继续处理请求
}

function initUserRoutes(app) {
  // 1. 用户登录/注册
  app.post('/api/user/login', async (req, res) => {
    try {
      const { code, userInfo } = req.body;

      if (!code) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      // 调用微信接口获取openid和session_key
      const wxLoginResult = await getWechatOpenId(code);
      const openid = wxLoginResult.openid;
      // const session_key = wxLoginResult.session_key; // 暂时不用 session_key

      // 获取或创建用户数据
      let userData = await userDataAccess.getUserData(openid);

      // 更新用户信息
      if (userInfo) {
        userData.avatarUrl = userInfo.avatarUrl || userData.avatarUrl;
        userData.nickName = userInfo.nickName || userData.nickName;
      }

      // 无论是否是新用户，都确保有侦探ID和昵称
      // 设置创建时间（如果是新用户）
      if (!userData.createTime) {
        userData.createTime = new Date().toISOString();
        userData.level = 1;
        userData.experience = 0;
        userData.maxExperience = 1000;
        userData.points = 0;
        userData.remainingAnswers = userModel.MAX_DAILY_ANSWERS;
      }

      // 确保存储openid（但不对外暴露）
      userData.openid = openid;

      // 确保有侦探ID
      if (!userData.detectiveId) {
        // 获取所有用户数据，计算当前用户数量
        const allUsers = await userDataAccess.getAllUsers();
        const userCount = Object.keys(allUsers).length;

        // 生成侦探ID（纯数字部分）
        userData.detectiveId = userModel.generateDetectiveId(userCount);
        console.log(`为用户 ${userData.userId} 生成侦探ID: ${userData.detectiveId}`);
      }

      // 确保有昵称
      if (!userData.nickName) {
        // 使用默认的"一勺侦探#xxxxx"格式
        userData.nickName = userModel.getFullnickName(userData.detectiveId);
        console.log(`为用户 ${userData.userId} 生成默认昵称: ${userData.nickName}`);
      }

      // 生成或更新 token
      const token = generateSimpleToken();
      userData.token = token; // 将 token 存储在用户数据中
      userData.tokenExpireTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 设置 token 过期时间，例如 7 天后
      userData.lastLoginTime = new Date().toISOString();

      // 重置每日回答次数
      userData = resetDailyAnswers(userData);

      // 保存用户数据（包含 token）
      await userDataAccess.saveUserData(openid, userData);

      // 获取等级信息
      const levelInfo = userModel.getLevelInfo(userData.experience);

      // 返回用户信息和 token，不返回 openid
      return sendResponse(res, true, {
        token: userData.token, // 返回 token
        userId: userData.userId, // 返回 userId
        userInfo: {
          avatarUrl: userData.avatarUrl,
          nickName: userData.nickName,
          detectiveId: userData.detectiveId || '' // 返回侦探ID
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
      console.error('登录失败:', err);
      return sendResponse(res, false, '登录失败', 500);
    }
  });

  // 2. 更新用户信息 (使用 token 验证)
  // 应用中间件 simpleAuthMiddleware
  app.post('/api/user/update', simpleAuthMiddleware, async (req, res) => {
    try {
      const openid = req.openid; // 从中间件获取 openid
      const userData = req.userData; // 从中间件获取 userData

      // 获取请求体中的所有字段
      const updateData = req.body;
      console.log('更新用户信息:', updateData);

      // 更新用户数据中的字段
      Object.keys(updateData).forEach(key => {
        // 只更新允许的字段，避免更新敏感字段如 token、openid 等
        if (['avatarUrl'].includes(key) && updateData[key]) {
          userData[key] = updateData[key];
        }
        // 特殊处理昵称字段，允许为空
        if (key === 'nickName') {
          // 如果昵称为空，使用默认的"一勺侦探#xxxxx"格式
          if (!updateData[key] || updateData[key].trim() === '') {
            // 确保用户有detectiveId
            if (!userData.detectiveId) {
              // 如果没有detectiveId，生成一个新的
              // 注意：这里我们不能使用await，因为我们在forEach回调中
              // 所以我们使用同步方式生成一个临时ID
              userData.detectiveId = userModel.generateDetectiveId(0); // 临时使用0
              userData.nickName = userModel.getFullnickName(userData.detectiveId);
              console.log(`更新时为用户 ${userData.userId} 生成临时侦探ID: ${userData.detectiveId} 和昵称: ${userData.nickName}`);

              // 在下一个事件循环中异步更新为正确的ID
              setTimeout(async () => {
                try {
                  const users = await userDataAccess.getAllUsers();
                  const userCount = Object.keys(users || {}).length;
                  const correctId = userModel.generateDetectiveId(userCount);

                  // 获取最新的用户数据
                  const latestUserData = await userDataAccess.getUserData(openid);
                  latestUserData.detectiveId = correctId;
                  latestUserData.nickName = userModel.getFullnickName(correctId);

                  // 保存更新后的用户数据
                  userDataAccess.saveUserData(openid, latestUserData);
                  console.log(`异步更新用户 ${latestUserData.userId} 的侦探ID为: ${correctId}`);
                } catch (err) {
                  console.error('异步更新侦探ID失败:', err);
                }
              }, 0);
            } else {
              // 如果有detectiveId，使用它生成默认昵称
              userData.nickName = userModel.getFullnickName(userData.detectiveId);
              console.log(`更新时为用户 ${userData.userId} 使用现有侦探ID生成昵称: ${userData.nickName}`);
            }
          } else {
            // 用户提供了自定义昵称，直接使用
            userData.nickName = updateData[key];
            console.log(`用户 ${userData.userId} 设置自定义昵称: ${userData.nickName}`);
          }
        }
      });

      await userDataAccess.saveUserData(openid, userData); // 仍然使用 openid 保存

      return sendResponse(res, true, {
        userInfo: {
          avatarUrl: userData.avatarUrl,
          nickName: userData.nickName
        }
      });
    } catch (err) {
      console.error('更新用户信息失败:', err);
      return sendResponse(res, false, '更新用户信息失败', 500);
    }
  });

  // 2.1 管理员更新用户信息
  app.post('/api/user/admin-update', async (req, res) => {
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
      const allowedFields = ['nickName', 'avatarUrl', 'level', 'experience', 'maxExperience', 'points', 'signInCount', 'remainingAnswers'];

      allowedFields.forEach(key => {
        if (updateData[key] !== undefined) {
          userData[key] = updateData[key];
        }
      });

      await userDataAccess.saveUserData(targetOpenid, userData);

      return sendResponse(res, true, {
        message: '更新成功',
        userData: {
          userId: userData.userId,
          nickName: userData.nickName,
          avatarUrl: userData.avatarUrl,
          level: userData.level,
          experience: userData.experience,
          maxExperience: userData.maxExperience,
          points: userData.points,
          signInCount: userData.signInCount,
          remainingAnswers: userData.remainingAnswers
        }
      });
    } catch (err) {
      console.error('管理员更新用户信息失败:', err);
      return sendResponse(res, false, '更新用户信息失败', 500);
    }
  });

  // 3. 获取用户信息 (使用 token 验证)
  // 应用中间件 simpleAuthMiddleware
  app.get('/api/user/info', simpleAuthMiddleware, async (req, res) => {
    try {
      const openid = req.openid; // 从中间件获取 openid
      let userData = req.userData; // 从中间件获取 userData

      // 重置每日回答次数
      userData = resetDailyAnswers(userData);
      await userDataAccess.saveUserData(openid, userData); // 仍然使用 openid 保存

      // 获取等级信息
      const levelInfo = userModel.getLevelInfo(userData.experience);

      // 返回信息（不需要再返回 openid）
      return sendResponse(res, true, {
        userId: userData.userId, // 返回 userId
        userInfo: {
          avatarUrl: userData.avatarUrl,
          nickName: userData.nickName,
          detectiveId: userData.detectiveId || '' // 返回侦探ID
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
      console.error('获取用户信息失败:', err);
      return sendResponse(res, false, '获取用户信息失败', 500);
    }
  });

  // 7. 用户签到 (使用 token 验证)
  // 应用中间件 simpleAuthMiddleware
  app.post('/api/user/signin', simpleAuthMiddleware, async (req, res) => {
    try {
      const openid = req.openid; // 从中间件获取 openid

      const result = await handleSignIn(openid); // handleSignIn 内部仍然使用 openid 操作

      if (!result.success) {
        return sendResponse(res, false, result.message, 400);
      }

      return sendResponse(res, true, result);
    } catch (err) {
      console.error('用户签到失败:', err);
      return sendResponse(res, false, '用户签到失败', 500);
    }
  });

  // 8. 删除用户
  app.post('/api/user/delete', async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      // 根据userId查找对应的openid
      const usersObj = await userDataAccess.getAllUsers();
      let targetOpenid = null;

      for (const [openid, userData] of Object.entries(usersObj)) {
        // 检查用户数据中是否有userId字段，并且与请求中的userId匹配
        if (userData.userId && userData.userId === userId) {
          targetOpenid = openid;
          break;
        }
      }

      if (!targetOpenid) {
        return sendResponse(res, false, '用户不存在', 404);
      }

      // 尝试删除用户数据
      try {
        const success = await userDataAccess.deleteUserData(targetOpenid);

        if (!success) {
          return sendResponse(res, false, '删除失败', 404);
        }
      } catch (deleteErr) {
        return sendResponse(res, false, '删除失败', 500);
      }

      return sendResponse(res, true, { message: '删除成功' });
    } catch (err) {
      console.error('删除用户失败:', err);
      return sendResponse(res, false, '删除用户失败', 500);
    }
  });

  // 9. 获取所有用户列表
  app.get('/api/user/list', async (req, res) => {
    try {
      const usersObj = await userDataAccess.getAllUsers();

      // 将对象转换为数组
      const usersList = Object.entries(usersObj).map(([openid, userData]) => {
        // 使用已有的userId
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
      console.error('获取用户列表失败:', err);
      return sendResponse(res, false, '获取用户列表失败', 500);
    }
  });
}

// 初始化模块
async function init() {
  await userDataAccess.init();
  console.log('用户服务初始化完成');
}

module.exports = {
  init,
  initUserRoutes,
  addExperience,
  resetDailyAnswers,
  handleSignIn
};
