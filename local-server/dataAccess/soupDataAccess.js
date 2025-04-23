/**
 * 海龟汤数据访问层
 * 负责海龟汤数据的存储和检索
 */
const fs = require('fs-extra');
const path = require('path');
const { createSoupObject, SOUP_TAGS } = require('../models/soupModel');

// 数据文件路径
const SOUPS_FILE = path.join(__dirname, '../data/soups.json');

/**
 * 初始化数据文件
 * @returns {Promise<void>}
 */
async function initSoupsFile() {
  try {
    // 确保文件存在
    await fs.ensureFile(SOUPS_FILE);

    // 读取文件内容
    let data;
    try {
      data = await fs.readJson(SOUPS_FILE);
      // 如果数据已存在且有效，直接返回
      if (data && Array.isArray(data) && data.length > 0) {
        return;
      }
    } catch (e) {
      // 文件存在但不是有效的JSON或为空
      console.log('初始化海龟汤数据文件...');
    }

    // 初始化样本数据
    const now = new Date().toISOString();
    const initialData = [
      createSoupObject({
        soupId: 'local_001',
        title: '《本地测试海龟汤1》',
        contentLines: ['这是一个', '本地测试海龟汤', '用于开发环境测试'],
        truth: '这是一个测试用的汤底',
        soupType: 0, // 预制汤
        tag: SOUP_TAGS.ABSURD, // 荒诞
        publishTime: now,
        publishIp: '127.0.0.1',
        updateTime: now,
        updateIp: '127.0.0.1'
      }),
      createSoupObject({
        soupId: 'local_002',
        title: '《本地测试海龟汤2》',
        contentLines: ['又一个', '本地测试海龟汤', '开发环境专用'],
        truth: '这是另一个测试用的汤底',
        soupType: 1, // DIY汤
        tag: SOUP_TAGS.FUNNY, // 搞笑
        viewCount: 5,
        likeCount: 2,
        publishTime: now,
        publishIp: '127.0.0.1',
        updateTime: now,
        updateIp: '127.0.0.1'
      })
    ];

    // 写入初始数据，使用格式化选项
    await fs.writeJson(SOUPS_FILE, initialData, { spaces: 2 });
    console.log('海龟汤数据文件初始化完成');
  } catch (err) {
    console.error('初始化海龟汤数据文件失败:', err);
  }
}

/**
 * 获取所有海龟汤
 * @returns {Promise<Array>} 海龟汤数组
 */
async function getAllSoups() {
  try {
    await initSoupsFile();
    return await fs.readJson(SOUPS_FILE) || [];
  } catch (err) {
    console.error('获取所有海龟汤失败:', err);
    return [];
  }
}

/**
 * 根据ID获取海龟汤
 * @param {string} soupId 海龟汤ID
 * @returns {Promise<Object|null>} 海龟汤对象或null
 */
async function getSoupById(soupId) {
  try {
    const soups = await getAllSoups();
    return soups.find(soup => soup.soupId === soupId) || null;
  } catch (err) {
    console.error('根据ID获取海龟汤失败:', err);
    return null;
  }
}

/**
 * 根据ID数组获取多个海龟汤
 * @param {string[]} soupIds 海龟汤ID数组
 * @returns {Promise<Array>} 海龟汤数组
 */
async function getSoupsByIds(soupIds) {
  try {
    const soups = await getAllSoups();
    return soups.filter(soup => soupIds.includes(soup.soupId));
  } catch (err) {
    console.error('根据ID数组获取海龟汤失败:', err);
    return [];
  }
}

/**
 * 根据类型获取海龟汤
 * @param {number} soupType 海龟汤类型
 * @returns {Promise<Array>} 海龟汤数组
 */
async function getSoupsByType(soupType) {
  try {
    const soups = await getAllSoups();
    return soups.filter(soup => soup.soupType === soupType);
  } catch (err) {
    console.error('根据类型获取海龟汤失败:', err);
    return [];
  }
}

/**
 * 根据标签获取海龟汤
 * @param {string} tag 海龟汤标签
 * @returns {Promise<Array>} 海龟汤数组
 */
async function getSoupsByTag(tag) {
  try {
    const soups = await getAllSoups();
    return soups.filter(soup => soup.tag === tag);
  } catch (err) {
    console.error('根据标签获取海龟汤失败:', err);
    return [];
  }
}

/**
 * 创建新海龟汤
 * @param {Object} soupData 海龟汤数据
 * @returns {Promise<Object|null>} 创建的海龟汤数据
 */
async function createSoup(soupData) {
  try {
    await initSoupsFile();
    const soups = await getAllSoups();

    const newSoup = createSoupObject(soupData);

    soups.push(newSoup);
    await fs.writeJson(SOUPS_FILE, soups, { spaces: 2 });
    return newSoup;
  } catch (err) {
    console.error('创建海龟汤失败:', err);
    return null;
  }
}

/**
 * 更新海龟汤
 * @param {string} soupId 海龟汤ID
 * @param {Object} soupData 更新的数据
 * @returns {Promise<Object|null>} 更新后的海龟汤数据
 */
async function updateSoup(soupId, soupData) {
  try {
    const soups = await getAllSoups();
    const index = soups.findIndex(s => s.soupId === soupId);

    if (index === -1) {
      throw new Error('海龟汤不存在');
    }

    const updatedSoup = {
      ...soups[index],
      ...soupData,
      updateTime: soupData.updateTime || new Date().toISOString()
    };

    soups[index] = updatedSoup;
    await fs.writeJson(SOUPS_FILE, soups, { spaces: 2 });
    return updatedSoup;
  } catch (err) {
    console.error('更新海龟汤失败:', err);
    return null;
  }
}

/**
 * 删除海龟汤
 * @param {string} soupId 海龟汤ID
 * @returns {Promise<Object>} 删除结果
 */
async function deleteSoup(soupId) {
  try {
    const soups = await getAllSoups();
    const index = soups.findIndex(s => s.soupId === soupId);

    if (index === -1) {
      throw new Error('海龟汤不存在');
    }

    const deletedSoup = soups[index];
    soups.splice(index, 1);
    await fs.writeJson(SOUPS_FILE, soups, { spaces: 2 });

    return {
      success: true,
      deletedSoup
    };
  } catch (err) {
    console.error('删除海龟汤失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 批量删除海龟汤
 * @param {string[]} soupIds 海龟汤ID数组
 * @returns {Promise<Object>} 删除结果
 */
async function deleteSoups(soupIds) {
  try {
    const soups = await getAllSoups();
    const initialCount = soups.length;

    // 过滤掉要删除的海龟汤
    const remainingSoups = soups.filter(soup => !soupIds.includes(soup.soupId));
    const deletedCount = initialCount - remainingSoups.length;

    if (deletedCount === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: '没有找到要删除的海龟汤'
      };
    }

    await fs.writeJson(SOUPS_FILE, remainingSoups, { spaces: 2 });

    return {
      success: true,
      deletedCount
    };
  } catch (err) {
    console.error('批量删除海龟汤失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 初始化模块
 */
async function init() {
  await initSoupsFile();
  console.log('海龟汤数据访问层初始化完成');
}

module.exports = {
  init,
  getAllSoups,
  getSoupById,
  getSoupsByIds,
  getSoupsByType,
  getSoupsByTag,
  createSoup,
  updateSoup,
  deleteSoup,
  deleteSoups
};
