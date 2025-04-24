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
 * @param {string} userId - 用户ID
 * @returns {Object} - 用户数据
 */
async function getUserData(userId) {
  try {
    await initUserFile();
    const data = await fs.readJson(USERS_FILE);
    return data[userId] || createDefaultUser(userId);
  } catch (err) {
    console.error('读取用户数据失败:', err);
    return null;
  }
}

/**
 * 保存用户数据
 * @param {string} userId - 用户ID
 * @param {Object} userData - 用户数据
 * @returns {boolean} - 是否保存成功
 */
async function saveUserData(userId, userData) {
  try {
    await initUserFile();
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
 * @param {string} userId - 用户ID
 * @returns {boolean} - 是否删除成功
 */
async function deleteUserData(userId) {
  try {
    await initUserFile();
    const allUsers = await fs.readJson(USERS_FILE);
    if (!allUsers[userId]) {
      return false;
    }
    delete allUsers[userId];
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

module.exports = {
  init,
  getUserData,
  saveUserData,
  getAllUsers,
  deleteUserData
};
