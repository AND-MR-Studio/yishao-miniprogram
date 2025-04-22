const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 微信小程序配置
const WECHAT_CONFIG = {
  appId: 'wxda7c1552de0ae78f', // 替换为你的小程序 AppID
  appSecret: 'd6727b9bd3775bfb20a8c61076478d98' // 替换为你的小程序 AppSecret
};

// 数据文件路径
const USERS_FILE = path.join(__dirname, 'users.json');

// 确保数据文件存在
const initUserFile = async () => {
  try {
    await fs.ensureFile(USERS_FILE);
    const exists = await fs.pathExists(USERS_FILE);
    if (exists) {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      if (!data) {
        await fs.writeJson(USERS_FILE, {});
      }
    }
  } catch (err) {
    console.error('初始化用户数据文件失败:', err);
  }
};

// 读取用户数据
const getUserData = async (userId) => {
  try {
    await initUserFile();
    const data = await fs.readJson(USERS_FILE);
    return data[userId] || {
      userId,
      avatarUrl: '',
      nickName: '',
      openid: '',
      answeredSoups: [],
      viewedSoups: [],
      totalAnswered: 0,
      totalCorrect: 0,
      totalViewed: 0,
      todayViewed: 0,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };
  } catch (err) {
    console.error('读取用户数据失败:', err);
    return null;
  }
};

// 保存用户数据
const saveUserData = async (userId, userData) => {
  try {
    const allUsers = await fs.readJson(USERS_FILE);
    allUsers[userId] = {
      ...userData,
      updateTime: new Date().toISOString()
    };
    await fs.writeJson(USERS_FILE, allUsers);
    return true;
  } catch (err) {
    console.error('保存用户数据失败:', err);
    return false;
  }
};

// 通用响应处理函数
function sendResponse(res, success, data, statusCode = 200) {
  return res.status(statusCode).json({
    success,
    data: success ? data : undefined,
    error: !success ? data : undefined
  });
}

// 模拟微信登录接口获取 openid
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

// 初始化用户服务路由
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
      const userData = await getUserData(openid);

      // 更新用户信息
      if (userInfo) {
        userData.avatarUrl = userInfo.avatarUrl || userData.avatarUrl;
        userData.nickName = userInfo.nickName || userData.nickName;
      }

      // 如果是新用户，初始化数据
      if (!userData.createTime) {
        userData.createTime = new Date().toISOString();
        userData.openid = openid;
      }

      // 保存用户数据
      await saveUserData(openid, userData);

      // 返回用户信息
      return sendResponse(res, true, {
        openid,
        userInfo: {
          avatarUrl: userData.avatarUrl,
          nickName: userData.nickName
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

      const userData = await getUserData(openid);

      if (avatarUrl) userData.avatarUrl = avatarUrl;
      if (nickName) userData.nickName = nickName;

      await saveUserData(openid, userData);

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

      const userData = await getUserData(openid);

      return sendResponse(res, true, {
        userInfo: {
          avatarUrl: userData.avatarUrl,
          nickName: userData.nickName
        },
        stats: {
          totalAnswered: userData.totalAnswered,
          totalCorrect: userData.totalCorrect,
          totalViewed: userData.totalViewed,
          todayViewed: userData.todayViewed
        }
      });
    } catch (err) {
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

      const userData = await getUserData(openid);

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

      const userData = await getUserData(openid);

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

      await saveUserData(openid, userData);

      return sendResponse(res, true, { message: '更新成功' });
    } catch (err) {
      return sendResponse(res, false, '更新用户汤面记录失败', 500);
    }
  });

  // 6. 获取所有用户列表
  app.get('/api/user/list', async (_, res) => {
    try {
      const data = await fs.readJson(USERS_FILE);
      const users = Object.values(data).map(user => ({
        openid: user.openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        createTime: user.createTime,
        updateTime: user.updateTime,
        totalAnswered: user.totalAnswered,
        totalCorrect: user.totalCorrect,
        totalViewed: user.totalViewed,
        todayViewed: user.todayViewed
      }));

      return sendResponse(res, true, users);
    } catch (err) {
      return sendResponse(res, false, '获取用户列表失败', 500);
    }
  });

  // 7. 删除用户
  app.post('/api/user/delete', async (req, res) => {
    try {
      const { openid } = req.body;

      if (!openid) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const data = await fs.readJson(USERS_FILE);

      if (!data[openid]) {
        return sendResponse(res, false, '用户不存在', 404);
      }

      delete data[openid];
      await fs.writeJson(USERS_FILE, data);

      return sendResponse(res, true, { message: '删除成功' });
    } catch (err) {
      return sendResponse(res, false, '删除用户失败', 500);
    }
  });
}

// 初始化模块
async function init() {
  await initUserFile();
  console.log('用户服务初始化完成');
}

module.exports = {
  init,
  initUserRoutes
};
