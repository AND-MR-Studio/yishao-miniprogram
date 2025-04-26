/**
 * 对话服务层
 * 负责对话相关的业务逻辑
 */
const dialogDataAccess = require('../dataAccess/dialogDataAccess');
const { createMessageObject, validateMessage, MESSAGE_ROLES } = require('../models/dialogModel');

/**
 * 获取对话数据
 * @param {string} dialogId 对话ID
 * @returns {Promise<Object>} 对话数据
 */
async function getDialog(dialogId) {
  try {
    if (!dialogId) {
      throw new Error('缺少对话ID');
    }

    // 获取对话数据
    const dialogData = await dialogDataAccess.getDialogById(dialogId);

    // 如果对话不存在，返回空对话
    if (!dialogData) {
      return {
        dialogId: `dialog_${Date.now()}`,
        soupId: '',
        userId: '',
        messages: [],
        lastUpdated: Date.now()
      };
    }

    return dialogData;
  } catch (err) {
    console.error('获取对话数据失败:', err);
    return {
      dialogId: `dialog_${Date.now()}`,
      soupId: '',
      userId: '',
      messages: [],
      lastUpdated: Date.now()
    };
  }
}

/**
 * 根据汤面ID获取对话数据
 * @param {string} soupId 汤面ID
 * @returns {Promise<Array>} 对话数据数组
 */
async function getDialogsBySoup(soupId) {
  try {
    if (!soupId) {
      throw new Error('缺少汤面ID');
    }

    // 获取对话数据
    return await dialogDataAccess.getDialogsBySoupId(soupId);
  } catch (err) {
    console.error('获取汤面对话数据失败:', err);
    return [];
  }
}

/**
 * 获取所有对话数据
 * @returns {Promise<Object>} 所有对话数据
 */
async function getAllDialogs() {
  try {
    const dialogsData = await dialogDataAccess.getAllDialogs();

    // 处理返回数据格式
    const formattedDialogs = [];

    for (const key in dialogsData) {
      const dialog = dialogsData[key];
      if (dialog.messages && dialog.messages.length > 0) {
        formattedDialogs.push({
          dialogId: dialog.dialogId,
          soupId: dialog.soupId,
          userId: dialog.userId,
          messages: dialog.messages,
          total: dialog.messages.length,
          lastUpdated: dialog.lastUpdated || Date.now()
        });
      }
    }

    console.log('获取所有对话数据:', formattedDialogs);

    return {
      dialogs: formattedDialogs,
      total: formattedDialogs.length
    };
  } catch (err) {
    console.error('获取所有对话数据失败:', err);
    return {
      dialogs: [],
      total: 0
    };
  }
}

/**
 * 获取用户的所有对话数据
 * @param {string} userId 用户ID
 * @returns {Promise<Object>} 用户的所有对话数据
 */
async function getUserDialogs(userId) {
  try {
    if (!userId) {
      throw new Error('缺少用户ID');
    }

    const userDialogs = await dialogDataAccess.getDialogsByUserId(userId);

    // 处理返回数据格式
    const formattedDialogs = [];

    for (const dialog of userDialogs) {
      if (dialog.messages && dialog.messages.length > 0) {
        formattedDialogs.push({
          dialogId: dialog.dialogId,
          soupId: dialog.soupId,
          userId: dialog.userId,
          messages: dialog.messages,
          total: dialog.messages.length,
          lastUpdated: dialog.lastUpdated || Date.now()
        });
      }
    }

    return {
      dialogs: formattedDialogs,
      total: formattedDialogs.length
    };
  } catch (err) {
    console.error('获取用户对话数据失败:', err);
    return {
      dialogs: [],
      total: 0
    };
  }
}

/**
 * 获取用户特定汤面的对话数据
 * 注意：一个用户的一个soupId只对应一个dialogId，这是业务上的唯一性约束
 * @param {string} userId 用户ID
 * @param {string} soupId 汤面ID
 * @returns {Promise<Object>} 对话数据
 */
async function getUserDialog(userId, soupId) {
  try {
    if (!userId || !soupId) {
      throw new Error('缺少必要参数');
    }

    // 获取对话数据
    const dialogData = await dialogDataAccess.getDialogByUserIdAndSoupId(userId, soupId);

    // 如果对话不存在，返回空对话
    if (!dialogData) {
      return {
        dialogId: '',
        soupId: soupId,
        userId: userId,
        messages: [],
        total: 0,
        lastUpdated: Date.now()
      };
    }

    return {
      dialogId: dialogData.dialogId,
      soupId: dialogData.soupId,
      userId: dialogData.userId,
      messages: dialogData.messages,
      total: dialogData.messages.length,
      lastUpdated: dialogData.lastUpdated
    };
  } catch (err) {
    console.error('获取用户对话数据失败:', err);
    return {
      dialogId: '',
      soupId: soupId,
      userId: userId,
      messages: [],
      total: 0,
      lastUpdated: Date.now()
    };
  }
}

/**
 * 创建新对话
 * 注意：一个用户的一个soupId只对应一个dialogId，如果已存在则返回现有对话
 * @param {string} userId 用户ID
 * @param {string} soupId 汤面ID
 * @returns {Promise<Object>} 创建的对话数据
 */
async function createDialog(userId, soupId) {
  try {
    if (!userId || !soupId) {
      throw new Error('缺少必要参数');
    }

    // 检查是否已存在该用户和汤面的对话
    const existingDialog = await dialogDataAccess.getDialogByUserIdAndSoupId(userId, soupId);

    if (existingDialog) {
      return existingDialog;
    }

    // 创建新对话
    const newDialog = {
      dialogId: `dialog_${Date.now()}`,
      soupId: soupId,
      userId: userId,
      messages: [],
      lastUpdated: Date.now()
    };

    // 保存对话
    const success = await dialogDataAccess.saveDialog(newDialog);

    if (!success) {
      throw new Error('创建对话失败');
    }

    return newDialog;
  } catch (err) {
    console.error('创建对话失败:', err);
    throw err;
  }
}

/**
 * 发送消息
 * @param {string} dialogId 对话ID
 * @param {string} userId 用户ID
 * @param {string} message 消息内容
 * @param {string} [messageId] 消息ID（可选）
 * @param {number} [timestamp] 时间戳（可选）
 * @returns {Promise<Object>} 响应数据
 */
async function sendMessage(dialogId, userId, message, messageId, timestamp) {
  try {
    if (!dialogId || !userId || !message) {
      throw new Error('缺少必要参数');
    }

    // 获取对话数据
    let dialogData = await getDialog(dialogId);

    // 如果对话不存在或不属于该用户，创建新对话
    if (!dialogData.userId || dialogData.userId !== userId) {
      throw new Error('对话不存在或不属于该用户');
    }

    // 使用传入的消息ID或生成新的
    const messageGroupId = messageId || `msg_${Date.now()}_${userId}`;

    // 创建用户消息
    const userMessage = createMessageObject({
      messageId: messageGroupId,
      userId: userId,
      role: MESSAGE_ROLES.USER,
      content: message,
      timestamp: timestamp || Date.now()
    });

    // 验证消息
    const validation = validateMessage(userMessage);
    if (!validation.valid) {
      throw new Error(`消息验证失败: ${validation.errors.join(', ')}`);
    }

    // 添加用户消息
    dialogData.messages.push(userMessage);

    // 创建代理回复消息
    const replyMessage = createMessageObject({
      messageId: messageGroupId,
      userId: 'system',
      role: MESSAGE_ROLES.AGENT,
      content: 'test_reply', // 固定回复文本
      timestamp: Date.now() + 1
    });

    // 添加回复消息
    dialogData.messages.push(replyMessage);
    dialogData.lastUpdated = Date.now();

    // 保存对话数据
    await dialogDataAccess.saveDialog(dialogData);

    // 准备响应数据
    return {
      reply: replyMessage.content,
      message: replyMessage,
      dialogId: dialogData.dialogId
    };
  } catch (err) {
    console.error('发送消息失败:', err);
    throw err;
  }
}

/**
 * 保存对话记录
 * @param {string} dialogId 对话ID
 * @param {string} userId 用户ID
 * @param {Array} messages 消息数组
 * @returns {Promise<Object>} 保存结果
 */
async function saveDialogMessages(dialogId, userId, messages) {
  try {
    if (!dialogId || !userId || !messages || !Array.isArray(messages)) {
      throw new Error('缺少必要参数');
    }

    // 获取现有对话数据
    const existingDialog = await getDialog(dialogId);

    // 如果对话不存在或不属于该用户，返回错误
    if (!existingDialog.userId || existingDialog.userId !== userId) {
      throw new Error('对话不存在或不属于该用户');
    }

    // 更新对话数据
    const dialogData = {
      dialogId: existingDialog.dialogId,
      soupId: existingDialog.soupId,
      userId: userId,
      messages: messages,
      lastUpdated: Date.now()
    };

    // 保存对话数据
    const success = await dialogDataAccess.saveDialog(dialogData);

    if (!success) {
      throw new Error('保存对话记录失败');
    }

    return { message: '保存成功' };
  } catch (err) {
    console.error('保存对话记录失败:', err);
    throw err;
  }
}

/**
 * 删除对话记录
 * @param {string} dialogId 对话ID
 * @returns {Promise<Object>} 删除结果
 */
async function deleteDialog(dialogId) {
  try {
    if (!dialogId) {
      throw new Error('缺少必要参数');
    }

    // 删除对话数据
    const success = await dialogDataAccess.deleteDialog(dialogId);

    if (!success) {
      throw new Error('删除对话记录失败');
    }

    return { message: '删除成功' };
  } catch (err) {
    console.error('删除对话记录失败:', err);
    throw err;
  }
}

/**
 * 通用响应处理函数
 * @param {Object} res Express响应对象
 * @param {boolean} success 是否成功
 * @param {*} data 响应数据
 * @param {number} statusCode HTTP状态码
 * @returns {Object} Express响应对象
 */
function sendResponse(res, success, data, statusCode = 200) {
  return res.status(statusCode).json({
    success,
    data: success ? data : undefined,
    error: !success ? data : undefined
  });
}

/**
 * 初始化对话路由
 * @param {Object} app Express应用实例
 */
function initDialogRoutes(app) {
  // 1. 创建新对话
  app.post('/yishao-api/dialog/create', async (req, res) => {
    try {
      const { userId, soupId } = req.body;

      if (!userId || !soupId) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const dialog = await createDialog(userId, soupId);
      return sendResponse(res, true, dialog);
    } catch (error) {
      console.error('创建对话失败:', error);
      return sendResponse(res, false, '服务器内部错误', 500);
    }
  });

  // 2. 发送消息
  app.post('/yishao-api/dialog/:dialogId/send', async (req, res) => {
    try {
      const { dialogId } = req.params;
      const { userId, message, messageId, timestamp } = req.body;

      if (!dialogId || !userId || !message) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const responseData = await sendMessage(dialogId, userId, message, messageId, timestamp);
      return sendResponse(res, true, responseData);
    } catch (error) {
      console.error('发送消息失败:', error);
      return sendResponse(res, false, error.message || '服务器内部错误', 500);
    }
  });

  // 3. 保存对话记录
  app.post('/yishao-api/dialog/:dialogId/save', async (req, res) => {
    try {
      const { dialogId } = req.params;
      const { userId, messages } = req.body;

      if (!dialogId || !userId || !messages || !Array.isArray(messages)) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const result = await saveDialogMessages(dialogId, userId, messages);
      return sendResponse(res, true, result);
    } catch (error) {
      console.error('保存对话记录失败:', error);
      return sendResponse(res, false, error.message || '服务器内部错误', 500);
    }
  });

  // 4. 获取所有对话记录
  app.get('/yishao-api/dialog/list', async (_, res) => {
    try {
      const result = await getAllDialogs();
      return sendResponse(res, true, result);
    } catch (error) {
      console.error('获取所有对话记录失败:', error);
      return sendResponse(res, false, '服务器内部错误', 500);
    }
  });

  // 5. 获取特定对话记录
  app.get('/yishao-api/dialog/:dialogId', async (req, res) => {
    try {
      const { dialogId } = req.params;

      if (!dialogId) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const dialogData = await getDialog(dialogId);

      if (!dialogData.dialogId) {
        return sendResponse(res, false, '对话不存在', 404);
      }

      return sendResponse(res, true, dialogData);
    } catch (error) {
      console.error('获取对话记录失败:', error);
      return sendResponse(res, false, '服务器内部错误', 500);
    }
  });

  // 6. 获取用户的所有对话记录
  app.get('/yishao-api/dialog/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendResponse(res, false, '缺少用户ID', 400);
      }

      const result = await getUserDialogs(userId);
      return sendResponse(res, true, result);
    } catch (error) {
      console.error('获取用户对话记录失败:', error);
      return sendResponse(res, false, '服务器内部错误', 500);
    }
  });

  // 7. 获取与特定汤面相关的对话
  app.get('/yishao-api/dialog/soup/:soupId', async (req, res) => {
    try {
      const { soupId } = req.params;

      if (!soupId) {
        return sendResponse(res, false, '缺少汤面ID', 400);
      }

      const dialogs = await getDialogsBySoup(soupId);
      return sendResponse(res, true, { dialogs, total: dialogs.length });
    } catch (error) {
      console.error('获取汤面对话记录失败:', error);
      return sendResponse(res, false, '服务器内部错误', 500);
    }
  });

  // 8. 获取用户特定汤面的对话记录
  app.get('/yishao-api/dialog/user/:userId/soup/:soupId', async (req, res) => {
    try {
      const { userId, soupId } = req.params;

      if (!userId || !soupId) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const dialogData = await getUserDialog(userId, soupId);
      return sendResponse(res, true, dialogData);
    } catch (error) {
      console.error('获取用户对话记录失败:', error);
      return sendResponse(res, false, '服务器内部错误', 500);
    }
  });

  // 9. 删除对话记录
  app.delete('/yishao-api/dialog/:dialogId', async (req, res) => {
    try {
      const { dialogId } = req.params;

      if (!dialogId) {
        return sendResponse(res, false, '缺少必要参数', 400);
      }

      const result = await deleteDialog(dialogId);
      return sendResponse(res, true, result);
    } catch (error) {
      console.error('删除对话记录失败:', error);
      return sendResponse(res, false, '服务器内部错误', 500);
    }
  });
}

/**
 * 初始化模块
 */
async function init() {
  await dialogDataAccess.init();
  console.log('对话服务初始化完成');
}

module.exports = {
  init,
  initDialogRoutes,
  getDialog,
  getAllDialogs,
  getDialogsBySoup,
  getUserDialogs,
  getUserDialog,
  createDialog,
  sendMessage,
  saveDialogMessages,
  deleteDialog
};
