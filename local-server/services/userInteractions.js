/**
 * 用户交互服务
 * 处理用户与汤谜题的交互记录
 *
 * @module userInteractions
 * @author Yiavin
 * @version 1.0.0
 */

const userDataAccess = require('../dataAccess/userDataAccess');
const { logger, addExperience } = require('./userHelpers');

/**
 * 处理用户签到并发放奖励
 *
 * @async
 * @param {string} openid - 用户openid
 * @param {Object} CONFIG - 配置对象
 * @returns {Promise<Object>} - 签到结果对象
 */
async function handleSignIn(openid, CONFIG) {
  try {
    logger('info', 'signIn', '处理用户签到', { openid });

    // 获取用户数据
    const userData = await userDataAccess.getUserData(openid);
    if (!userData) {
      logger('warn', 'signIn', '签到失败：用户不存在', { openid });
      return { success: false, message: '用户不存在' };
    }

    const today = new Date().toISOString().split('T')[0];

    // 检查是否已经签到
    if (userData.lastSignInDate === today) {
      logger('info', 'signIn', '用户今日已签到', { userId: userData.userId });
      return { success: false, message: '今日已签到' };
    }

    // 更新签到信息
    userData.lastSignInDate = today;
    userData.signInCount = (userData.signInCount || 0) + 1;

    // 发放签到奖励
    userData.points = (userData.points || 0) + CONFIG.rewards.signIn.points;
    userData.remainingAnswers = (userData.remainingAnswers || 0) + CONFIG.rewards.signIn.answers;

    // 增加经验值
    const expResult = addExperience(userData, CONFIG.rewards.signIn.experience);

    // 保存用户数据
    await userDataAccess.saveUserData(openid, userData);
    logger('info', 'signIn', '用户签到成功', {
      userId: userData.userId,
      signInCount: userData.signInCount,
      points: userData.points,
      remainingAnswers: userData.remainingAnswers
    });

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
  } catch (error) {
    logger('error', 'signIn', '签到处理异常', {
      openid,
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * 更新用户的汤谜题交互记录
 *
 * @async
 * @param {string} openid - 用户openid
 * @param {Object} userData - 用户数据
 * @param {string} soupId - 汤谜题ID
 * @param {string} interactionType - 交互类型: 'viewed'|'answered'|'created'|'favorite'|'solved'
 * @param {Object} [options] - 附加选项
 * @param {Object} CONFIG - 配置对象
 * @returns {Promise<Object>} - 更新结果
 */
async function updateSoupInteraction(openid, userData, soupId, interactionType, options = {}, CONFIG) {
  try {
    logger('debug', 'soup', `更新用户汤谜题交互: ${interactionType}`, {
      userId: userData.userId,
      soupId
    });

    // 根据交互类型确定要更新的数组和计数器
    let arrayName, counterName, additionalUpdates = [];

    switch (interactionType) {
      case 'viewed':
        arrayName = 'viewedSoups';
        counterName = 'totalViewed';

        // 更新今日浏览数
        const today = new Date().toISOString().split('T')[0];
        if (userData.lastViewDate !== today) {
          userData.todayViewed = 1;
          userData.lastViewDate = today;
        } else {
          userData.todayViewed = (userData.todayViewed || 0) + 1;
        }
        additionalUpdates.push('todayViewed', 'lastViewDate');
        break;

      case 'answered':
        arrayName = 'answeredSoups';
        counterName = 'totalAnswered';

        // 更新未解决数量
        userData.unsolvedCount = (userData.unsolvedCount || 0) + 1;
        additionalUpdates.push('unsolvedCount');
        break;

      case 'created':
        arrayName = 'createSoups';
        counterName = 'creationCount';
        break;

      case 'favorite':
        arrayName = 'favoriteSoups';
        counterName = 'favoriteCount';

        // 收藏有特殊处理，可以添加或移除
        if (options.isFavorite === false) {
          // 如果是取消收藏，从数组中移除
          if (Array.isArray(userData[arrayName]) && userData[arrayName].includes(soupId)) {
            userData[arrayName] = userData[arrayName].filter(id => id !== soupId);
            userData[counterName] = Math.max((userData[counterName] || 0) - 1, 0);

            // 保存用户数据
            await userDataAccess.saveUserData(openid, userData);

            return {
              success: true,
              message: '取消收藏成功',
              [arrayName]: userData[arrayName],
              [counterName]: userData[counterName],
              isFavorite: false
            };
          } else {
            // 如果已经不在收藏列表中，直接返回
            return {
              success: true,
              message: '状态未变化',
              [arrayName]: userData[arrayName] || [],
              [counterName]: userData[counterName] || 0,
              isFavorite: false
            };
          }
        }
        break;

      case 'liked':
        arrayName = 'likedSoups';
        counterName = 'likedCount';

        // 点赞有特殊处理，可以添加或移除
        if (options.isLike === false) {
          // 如果是取消点赞，从数组中移除
          if (Array.isArray(userData[arrayName]) && userData[arrayName].includes(soupId)) {
            userData[arrayName] = userData[arrayName].filter(id => id !== soupId);
            userData[counterName] = Math.max((userData[counterName] || 0) - 1, 0);

            // 保存用户数据
            await userDataAccess.saveUserData(openid, userData);

            return {
              success: true,
              message: '取消点赞成功',
              [arrayName]: userData[arrayName],
              [counterName]: userData[counterName],
              isLiked: false
            };
          } else {
            // 如果已经不在点赞列表中，直接返回
            return {
              success: true,
              message: '状态未变化',
              [arrayName]: userData[arrayName] || [],
              [counterName]: userData[counterName] || 0,
              isLiked: false
            };
          }
        }
        break;

      case 'solved':
        arrayName = 'solvedSoups';
        counterName = 'solvedCount';

        // 确保在已回答列表中
        if (!Array.isArray(userData.answeredSoups)) {
          userData.answeredSoups = [];
        }

        if (!userData.answeredSoups.includes(soupId)) {
          userData.answeredSoups.push(soupId);
          userData.totalAnswered = (userData.totalAnswered || 0) + 1;
        }

        // 更新未解决数量 = 总回答数 - 已解决数量
        userData.unsolvedCount = userData.totalAnswered - (userData.solvedCount || 0) - 1; // -1因为当前这个即将解决

        // 更新总正确数
        userData.totalCorrect = (userData.totalCorrect || 0) + 1;

        // 增加经验值
        const expResult = addExperience(userData, CONFIG.rewards.solvePuzzle.experience);

        additionalUpdates.push('answeredSoups', 'totalAnswered', 'unsolvedCount', 'totalCorrect');

        // 如果已经在已解决列表中，直接返回
        if (Array.isArray(userData[arrayName]) && userData[arrayName].includes(soupId)) {
          return {
            success: true,
            message: '该汤已解决，无需更新',
            [arrayName]: userData[arrayName],
            [counterName]: userData[counterName] || 0,
            unsolvedCount: userData.unsolvedCount,
            totalCorrect: userData.totalCorrect,
            levelUp: expResult?.levelUp || false,
            level: expResult?.level || userData.level,
            levelTitle: expResult?.levelTitle || '',
            experience: expResult?.experience || userData.experience,
            maxExperience: expResult?.maxExperience || userData.maxExperience
          };
        }
        break;

      default:
        throw new Error(`未知的交互类型: ${interactionType}`);
    }

    // 确保数组存在
    if (!Array.isArray(userData[arrayName])) {
      userData[arrayName] = [];
    }

    // 如果不是收藏或点赞的取消操作，且ID不在数组中，则添加
    if ((interactionType !== 'favorite' || options.isFavorite !== false) &&
        (interactionType !== 'liked' || options.isLike !== false)) {
      if (!userData[arrayName].includes(soupId)) {
        userData[arrayName].push(soupId);
        userData[counterName] = (userData[counterName] || 0) + 1;

        // 保存用户数据
        await userDataAccess.saveUserData(openid, userData);

        // 构建响应数据
        const response = {
          success: true,
          message: '更新成功',
          [arrayName]: userData[arrayName],
          [counterName]: userData[counterName]
        };

        // 添加额外的响应字段
        additionalUpdates.forEach(field => {
          response[field] = userData[field];
        });

        // 对于收藏操作，添加isFavorite字段
        if (interactionType === 'favorite') {
          response.isFavorite = true;
        }

        // 对于点赞操作，添加isLiked字段
        if (interactionType === 'liked') {
          response.isLiked = true;
        }

        // 对于解决操作，添加等级相关信息
        if (interactionType === 'solved' && expResult) {
          response.levelUp = expResult.levelUp;
          response.level = expResult.level;
          response.levelTitle = expResult.levelTitle;
          response.experience = expResult.experience;
          response.maxExperience = expResult.maxExperience;
        }

        return response;
      } else {
        // 如果已经在列表中，返回状态未变化
        return {
          success: true,
          message: '状态未变化',
          [arrayName]: userData[arrayName],
          [counterName]: userData[counterName]
        };
      }
    }
  } catch (error) {
    logger('error', 'soup', `更新用户汤谜题交互失败: ${interactionType}`, {
      userId: userData.userId,
      soupId,
      error: error.message,
      stack: process.env.DEBUG ? error.stack : undefined
    });
    throw error;
  }
}

module.exports = {
  handleSignIn,
  updateSoupInteraction
};
