/**
 * 用户服务层
 * 负责用户相关的业务逻辑
 */

const { v4: uuidv4 } = require('uuid');
const userDataAccess = require('../dataAccess/userDataAccess');
const userModel = require('../models/userModel');

// 微信小程序配置
const WECHAT_CONFIG = {
  appId: 'wxda7c1552de0ae78f', // 替换为你的小程序 AppID
  appSecret: 'd6727b9bd3775bfb20a8c61076478d98' // 替换为你的小程序 AppSecret
};

/**
 * 模拟微信登录接口获取 openid
 * @param {string} code - 微信登录code
 * @returns {string} - openid
 */
async function getWechatOpenId(code) {
  try {
    // 在本地服务中，我们模拟返回一个固定的openid
    console.log('模拟微信登录，code:', code);
    return `openid_${code.substring(0, 8)}`;
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
 * 初始化用户服务路由
 * @param {Object} app - Express应用实例
 */
function initUserRoutes(app) {
  // 1. 用户登录/注册
  app.post('/api/user/login', async (req, res) => {
    try {
      const { code, userInfo } = req.body;

      if (!code) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      // 调用微信接口获取openid
      const openid = await getWechatOpenId(code);

      // 获取或创建用户数据
      let userData = await userDataAccess.getUserData(openid);

      // 更新用户信息
      if (userInfo) {
        userData.avatarUrl = userInfo.avatarUrl || userData.avatarUrl;
        userData.nickName = userInfo.nickName || userData.nickName;
      }

      // 如果是新用户，初始化数据
      if (!userData.createTime) {
        userData.createTime = new Date().toISOString();
        userData.openid = openid;
        
        // 生成随机侦探ID
        if (!userData.nickName) {
          userData.nickName = userModel.generateDetectiveId();
        }
        
        // 初始化等级和经验值
        userData.level = 1;
        userData.experience = 0;
        userData.maxExperience = 1000;
        userData.points = 0;
        userData.remainingAnswers = userModel.MAX_DAILY_ANSWERS;
      }
      
      // 重置每日回答次数
      userData = resetDailyAnswers(userData);

      // 保存用户数据
      await userDataAccess.saveUserData(openid, userData);
      
      // 获取等级信息
      const levelInfo = userModel.getLevelInfo(userData.experience);

      // 返回用户信息
      return sendResponse(res, true, {
        openid,
        userInfo: {
          avatarUrl: userData.avatarUrl,
          nickName: userData.nickName
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

  // 2. 更新用户信息
  app.post('/api/user/update', async (req, res) => {
    try {
      const { openid, avatarUrl, nickName } = req.body;

      if (!openid) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const userData = await userDataAccess.getUserData(openid);

      if (avatarUrl) userData.avatarUrl = avatarUrl;
      if (nickName) userData.nickName = nickName;

      await userDataAccess.saveUserData(openid, userData);

      return sendResponse(res, true, {
        userInfo: {
          avatarUrl: userData.avatarUrl,
          nickName: userData.nickName
        }
      });
    } catch (err) {
      return sendResponse(res, false, '更新用户信息失败', 500);
    }
  });

  // 3. 获取用户信息
  app.get('/api/user/info', async (req, res) => {
    try {
      const { openid } = req.query;

      if (!openid) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      let userData = await userDataAccess.getUserData(openid);
      
      // 重置每日回答次数
      userData = resetDailyAnswers(userData);
      await userDataAccess.saveUserData(openid, userData);
      
      // 获取等级信息
      const levelInfo = userModel.getLevelInfo(userData.experience);

      return sendResponse(res, true, {
        userInfo: {
          avatarUrl: userData.avatarUrl,
          nickName: userData.nickName
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

  // 4. 获取用户汤面记录
  app.get('/api/user/soups', async (req, res) => {
    try {
      const { openid } = req.query;

      if (!openid) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const userData = await userDataAccess.getUserData(openid);

      return sendResponse(res, true, {
        answeredSoups: userData.answeredSoups,
        viewedSoups: userData.viewedSoups
      });
    } catch (err) {
      return sendResponse(res, false, '获取用户汤面记录失败', 500);
    }
  });

  // 5. 更新用户汤面记录
  app.post('/api/user/soups/update', async (req, res) => {
    try {
      const { openid, soupId, type, data } = req.body;

      if (!openid || !soupId || !type) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const userData = await userDataAccess.getUserData(openid);

      if (type === 'answer') {
        // 更新回答记录
        const answerRecord = {
          soupId,
          answer: data.answer,
          isCorrect: data.isCorrect,
          answerTime: new Date().toISOString(),
          deviceInfo: data.deviceInfo
        };

        userData.answeredSoups.push(answerRecord);
        userData.totalAnswered++;
        if (data.isCorrect) userData.totalCorrect++;
      } else if (type === 'view') {
        // 更新查看记录
        const existingView = userData.viewedSoups.find(v => v.soupId === soupId);

        if (!existingView) {
          userData.viewedSoups.push({
            soupId,
            firstViewTime: new Date().toISOString(),
            lastViewTime: new Date().toISOString(),
            viewCount: 1,
            deviceInfo: data.deviceInfo,
            viewDuration: data.viewDuration
          });
          userData.totalViewed++;
          userData.todayViewed++;
        } else {
          existingView.lastViewTime = new Date().toISOString();
          existingView.viewCount++;
          existingView.viewDuration = (existingView.viewDuration || 0) + (data.viewDuration || 0);
        }
      }

      await userDataAccess.saveUserData(openid, userData);

      return sendResponse(res, true, { message: '更新成功' });
    } catch (err) {
      return sendResponse(res, false, '更新用户汤面记录失败', 500);
    }
  });

  // 6. 获取所有用户列表
  app.get('/api/user/list', async (_, res) => {
    try {
      const data = await userDataAccess.getAllUsers();
      const users = Object.values(data).map(user => ({
        openid: user.openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        createTime: user.createTime,
        updateTime: user.updateTime,
        totalAnswered: user.totalAnswered,
        totalCorrect: user.totalCorrect,
        totalViewed: user.totalViewed,
        todayViewed: user.todayViewed,
        level: user.level,
        experience: user.experience,
        points: user.points,
        signInCount: user.signInCount
      }));

      return sendResponse(res, true, users);
    } catch (err) {
      return sendResponse(res, false, '获取用户列表失败', 500);
    }
  });

  // 7. 用户签到
  app.post('/api/user/signin', async (req, res) => {
    try {
      const { openid } = req.body;

      if (!openid) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const result = await handleSignIn(openid);
      
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
      const { openid } = req.body;

      if (!openid) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const success = await userDataAccess.deleteUserData(openid);

      if (!success) {
        return sendResponse(res, false, '用户不存在', 404);
      }

      return sendResponse(res, true, { message: '删除成功' });
    } catch (err) {
      return sendResponse(res, false, '删除用户失败', 500);
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
