/**
 * 用户数据访问层
 * 负责用户数据的读写操作
 */

const fs = require('fs-extra');
const path = require('path');
const { createDefaultUser } = require('../models/userModel');

// 数据文件路径
const USERS_FILE = path.join(__dirname, '../data/users.json');

/**
 * 确保数据文件存在
 */
async function initUserFile() {
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
    throw err;
  }
}

/**
 * 读取用户数据
 * @param {string} openid - 用户的openid
 * @returns {Object} - 用户数据
 */
async function getUserData(openid) {
  try {
    await initUserFile();
    const data = await fs.readJson(USERS_FILE);

    // 使用openid作为键获取用户数据
    // 如果用户不存在，创建一个新的用户对象
    // 注意：createDefaultUser不应该使用openid作为userId
    const userData = data[openid];
    if (userData) {
      return userData;
    } else {
      // 创建新用户，确保userId和openid正确设置
      const newUser = createDefaultUser();
      newUser.openid = openid;
      newUser.userId = `wxUser_${openid.substring(0, 8)}`;
      return newUser;
    }
  } catch (err) {
    console.error('读取用户数据失败:', err);
    return null;
  }
}

/**
 * 保存用户数据
 * @param {string} openid - 用户的openid
 * @param {Object} userData - 用户数据
 * @returns {boolean} - 是否保存成功
 */
async function saveUserData(openid, userData) {
  try {
    if (!openid) {
      console.error('保存用户数据失败: openid参数为空');
      return false;
    }

    await initUserFile();
    const allUsers = await fs.readJson(USERS_FILE);

    // 确保userData中包含正确的openid
    userData.openid = openid;

    // 确保userData中有userId
    if (!userData.userId) {
      userData.userId = `wxUser_${openid.substring(0, 8)}`;
    }

    // 更新时间戳
    userData.updateTime = new Date().toISOString();

    // 使用openid作为键保存用户数据
    allUsers[openid] = userData;

    await fs.writeJson(USERS_FILE, allUsers, { spaces: 2 });
    return true;
  } catch (err) {
    console.error('保存用户数据失败:', err);
    return false;
  }
}

/**
 * 获取所有用户数据
 * @returns {Object} - 所有用户数据
 */
async function getAllUsers() {
  try {
    await initUserFile();
    return await fs.readJson(USERS_FILE);
  } catch (err) {
    console.error('获取所有用户数据失败:', err);
    return {};
  }
}

/**
 * 删除用户数据
 * @param {string} openid - 用户的openid
 * @returns {boolean} - 是否删除成功
 */
async function deleteUserData(openid) {
  try {
    if (!openid) {
      return false;
    }

    await initUserFile();
    const allUsers = await fs.readJson(USERS_FILE);

    if (!allUsers[openid]) {
      return false;
    }

    // 删除用户
    delete allUsers[openid];

    // 保存更新后的用户数据
    await fs.writeJson(USERS_FILE, allUsers);
    return true;
  } catch (err) {
    console.error('删除用户数据失败:', err);
    return false;
  }
}

// 初始化
async function init() {
  await initUserFile();
  console.log('用户数据访问层初始化完成');
}

/**
 * 根据 token 获取用户数据
 * @param {string} token - 用户 token
 * @returns {Object|null} - 用户数据或 null
 */
async function getUserByToken(token) {
  const users = await getAllUsers();
  for (const openid in users) {
    if (users[openid].token === token) {
      return users[openid];
    }
  }
  return null; // 没有找到匹配的 token
}

module.exports = {
  init,
  getUserData,
  saveUserData,
  getAllUsers,
  deleteUserData,
  getUserByToken // 导出新方法
};
