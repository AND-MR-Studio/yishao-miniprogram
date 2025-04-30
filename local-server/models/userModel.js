/**
 * 用户模型定义
 */

// 常量定义
// 使用本地路径，与前端保持一致
const DEFAULT_AVATAR_URL = '/static/images/default-avatar.jpg';
const LEVEL_TITLES = ['见习侦探', '初级侦探', '中级侦探', '高级侦探', '特级侦探', '神探'];
const DAILY_SIGN_IN_POINTS = 10; // 每日签到积分
const DAILY_SIGN_IN_EXPERIENCE = 50; // 每日签到经验值

/**
 * 创建默认用户对象
 * @returns {Object} - 默认用户对象
 */
function createDefaultUser() {
  return {
    // userId和openid将在调用时设置
    userId: '',
    avatarUrl: DEFAULT_AVATAR_URL,
    nickName: '',
    detectiveId: '', // 新增字段：侦探ID，从00000开始递增
    openid: '',
    answeredSoups: [],
    viewedSoups: [],
    createSoups: [], // 用户创建过的谜题soup ID列表
    favoriteSoups: [], // 用户收藏的soup ID列表
    solvedSoups: [], // 用户已解决的soup ID列表
    totalAnswered: 0,
    totalCorrect: 0,
    totalViewed: 0,
    todayViewed: 0,
    // 等级和经验值
    level: 1,
    experience: 0,
    maxExperience: 1000,
    // 回答次数
    remainingAnswers: 100, // 初始回答次数设置为100
    // 积分和签到
    points: 0,
    lastSignInDate: null,
    signInCount: 0,
    // 统计数据
    unsolvedCount: 0,
    solvedCount: 0,
    creationCount: 0,
    favoriteCount: 0,
    // 时间戳
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString()
  };
}

/**
 * 生成侦探ID
 * @param {number} userCount - 当前用户数量，用于生成从00000开始的递增ID
 * @returns {string} - 侦探ID（纯数字部分）
 */
function generateDetectiveId(userCount = 0) {
  // 生成5位数字ID，从00000开始
  return userCount.toString().padStart(5, '0');
}

/**
 * 获取完整的侦探显示名称
 * @param {string} detectiveId - 侦探ID（纯数字部分）
 * @returns {string} - 完整的侦探显示名称
 */
function getFullnickName(detectiveId) {
  return `一勺侦探#${detectiveId}`;
}

/**
 * 获取等级信息
 * @param {number} experience - 经验值
 * @returns {Object} - 等级信息
 */
function getLevelInfo(experience = 0) {
  // 根据经验值计算等级
  let level = 1;
  let maxExperience = 1000;
  let levelTitle = LEVEL_TITLES[0];

  // 根据经验值动态计算等级
  if (experience >= 900) {
    level = 6;
    maxExperience = 2000;
    levelTitle = LEVEL_TITLES[5];
  } else if (experience >= 700) {
    level = 5;
    maxExperience = 1000;
    levelTitle = LEVEL_TITLES[4];
  } else if (experience >= 500) {
    level = 4;
    maxExperience = 800;
    levelTitle = LEVEL_TITLES[3];
  } else if (experience >= 300) {
    level = 3;
    maxExperience = 600;
    levelTitle = LEVEL_TITLES[2];
  } else if (experience >= 100) {
    level = 2;
    maxExperience = 400;
    levelTitle = LEVEL_TITLES[1];
  }

  return {
    level,
    levelTitle,
    experience,
    maxExperience
  };
}

module.exports = {
  // 常量
  DEFAULT_AVATAR_URL,
  LEVEL_TITLES,
  DAILY_SIGN_IN_POINTS,
  DAILY_SIGN_IN_EXPERIENCE,

  // 函数
  createDefaultUser,
  generateDetectiveId,
  getFullnickName,
  getLevelInfo
};
