/**
 * 对话数据访问层
 * 负责对话数据的存储和检索
 */
const fs = require('fs-extra');
const path = require('path');
const { createDialogObject } = require('../models/dialogModel');

// 数据文件路径
const DIALOGS_FILE = path.join(__dirname, '../data/dialogs.json');

/**
 * 初始化数据文件
 * @returns {Promise<void>}
 */
async function initDialogsFile() {
  try {
    // 确保文件存在
    await fs.ensureFile(DIALOGS_FILE);

    // 读取文件内容
    let data;
    try {
      data = await fs.readJson(DIALOGS_FILE);
      // 如果数据已存在且有效，直接返回
      if (data && typeof data === 'object') {
        return;
      }
    } catch (e) {
      // 文件存在但不是有效的JSON或为空
      console.log('初始化对话数据文件...');
    }

    // 初始化为空对象
    await fs.writeJson(DIALOGS_FILE, {}, { spaces: 2 });
    console.log('对话数据文件初始化完成');
  } catch (err) {
    console.error('初始化对话数据文件失败:', err);
  }
}

/**
 * 获取所有对话数据
 * @returns {Promise<Object>} 所有对话数据
 */
async function getAllDialogs() {
  try {
    await initDialogsFile();
    return await fs.readJson(DIALOGS_FILE) || {};
  } catch (err) {
    console.error('获取所有对话数据失败:', err);
    return {};
  }
}

/**
 * 根据对话ID获取对话数据
 * @param {string} dialogId 对话ID
 * @returns {Promise<Object|null>} 对话数据或null
 */
async function getDialogById(dialogId) {
  try {
    if (!dialogId) {
      return null;
    }

    const dialogs = await getAllDialogs();

    // 遍历所有对话，查找匹配的dialogId
    for (const key in dialogs) {
      if (dialogs[key].dialogId === dialogId) {
        return dialogs[key];
      }
    }

    return null;
  } catch (err) {
    console.error('根据对话ID获取对话数据失败:', err);
    return null;
  }
}

/**
 * 根据汤面ID获取对话数据
 * @param {string} soupId 汤面ID
 * @returns {Promise<Array>} 对话数据数组
 */
async function getDialogsBySoupId(soupId) {
  try {
    if (!soupId) {
      return [];
    }

    const dialogs = await getAllDialogs();
    const result = [];

    // 遍历所有对话，查找匹配的soupId
    for (const key in dialogs) {
      if (dialogs[key].soupId === soupId) {
        result.push(dialogs[key]);
      }
    }

    return result;
  } catch (err) {
    console.error('根据汤面ID获取对话数据失败:', err);
    return [];
  }
}

/**
 * 根据用户ID和汤面ID获取对话数据
 * @param {string} userId 用户ID
 * @param {string} soupId 汤面ID
 * @returns {Promise<Object|null>} 对话数据或null
 */
async function getDialogByUserIdAndSoupId(userId, soupId) {
  try {
    if (!userId || !soupId) {
      return null;
    }

    const dialogs = await getAllDialogs();

    // 遍历所有对话，查找匹配的userId和soupId
    for (const key in dialogs) {
      const dialog = dialogs[key];
      if (dialog.userId === userId && dialog.soupId === soupId) {
        return dialog;
      }
    }

    return null;
  } catch (err) {
    console.error('根据用户ID和汤面ID获取对话数据失败:', err);
    return null;
  }
}

/**
 * 获取用户的所有对话
 * @param {string} userId 用户ID
 * @returns {Promise<Array>} 用户的所有对话
 */
async function getDialogsByUserId(userId) {
  try {
    if (!userId) {
      return [];
    }

    const dialogs = await getAllDialogs();
    const result = [];

    // 遍历所有对话，查找匹配的userId
    for (const key in dialogs) {
      if (dialogs[key].userId === userId) {
        result.push(dialogs[key]);
      }
    }

    return result;
  } catch (err) {
    console.error('获取用户对话数据失败:', err);
    return [];
  }
}

/**
 * 保存对话数据
 * @param {Object} dialogData 对话数据
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveDialog(dialogData) {
  try {
    if (!dialogData) {
      console.error('保存对话数据失败: 对话数据为空');
      return false;
    }

    await initDialogsFile();
    const allDialogs = await getAllDialogs();

    // 确保dialogData是有效的对话对象
    const formattedDialog = createDialogObject(dialogData);
    formattedDialog.lastUpdated = Date.now();

    // 确保有dialogId
    if (!formattedDialog.dialogId) {
      formattedDialog.dialogId = `dialog_${Date.now()}`;
    }

    // 使用dialogId作为存储键
    const dialogId = formattedDialog.dialogId;
    allDialogs[dialogId] = formattedDialog;

    await fs.writeJson(DIALOGS_FILE, allDialogs, { spaces: 2 });
    return true;
  } catch (err) {
    console.error('保存对话数据失败:', err);
    return false;
  }
}

/**
 * 删除对话数据
 * @param {string} dialogId 对话ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteDialog(dialogId) {
  try {
    if (!dialogId) {
      return false;
    }

    await initDialogsFile();
    const allDialogs = await getAllDialogs();

    // 查找对话
    let found = false;
    for (const key in allDialogs) {
      if (allDialogs[key].dialogId === dialogId) {
        // 删除对话
        delete allDialogs[key];
        found = true;
        break;
      }
    }

    if (!found) {
      return false;
    }

    // 保存更新后的对话数据
    await fs.writeJson(DIALOGS_FILE, allDialogs, { spaces: 2 });
    return true;
  } catch (err) {
    console.error('删除对话数据失败:', err);
    return false;
  }
}

/**
 * 初始化模块
 */
async function init() {
  await initDialogsFile();
  console.log('对话数据访问层初始化完成');
}

module.exports = {
  init,
  getAllDialogs,
  getDialogById,
  getDialogsBySoupId,
  getDialogByUserIdAndSoupId,
  getDialogsByUserId,
  saveDialog,
  deleteDialog
};
