const fs = require('fs').promises;
const path = require('path');

// 对话数据存储文件路径
const DIALOGS_FILE = path.join(__dirname, 'dialogs.json');

// 初始化对话数据
let dialogsData = {};

// 加载对话数据
async function loadDialogsData() {
    try {
        const data = await fs.readFile(DIALOGS_FILE, 'utf8');
        dialogsData = JSON.parse(data);
        console.log('对话数据加载成功');
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 文件不存在，创建空数据
            dialogsData = {};
            await saveDialogsData();
            console.log('对话数据文件不存在，已创建新文件');
        } else {
            console.error('加载对话数据失败:', error);
        }
    }
}

// 保存对话数据
async function saveDialogsData() {
    try {
        await fs.writeFile(DIALOGS_FILE, JSON.stringify(dialogsData, null, 2));
        return true;
    } catch (error) {
        console.error('保存对话数据失败:', error);
        return false;
    }
}

// 通用响应处理函数
function sendResponse(res, success, data, statusCode = 200) {
    return res.status(statusCode).json({
        success,
        data: success ? data : undefined,
        error: !success ? data : undefined
    });
}

// 初始化路由
function initDialogRoutes(app) {
    // 1. 发送消息
    app.post('/api/dialog/send', async (req, res) => {
        try {
            const { soupId, message, messageId, timestamp } = req.body;

            if (!soupId || !message) {
                return sendResponse(res, false, '缺少必要参数', 400);
            }

            // 确保该汤面的对话存在
            if (!dialogsData[soupId]) {
                dialogsData[soupId] = {
                    messages: [],
                    lastUpdated: Date.now()
                };
            }

            // 使用传入的消息 ID 或生成新的
            const messageGroupId = messageId || `msg_${Date.now()}`;

            // 创建用户消息
            const newMessage = {
                id: messageGroupId,
                role: 'user',
                content: message,
                timestamp: timestamp || Date.now()
            };

            // 添加用户消息
            dialogsData[soupId].messages.push(newMessage);

            // 创建代理回复消息
            const replyMessage = {
                id: messageGroupId,
                role: 'agent',
                content: 'test_reply', // 固定回复文本
                timestamp: Date.now() + 1
            };

            // 添加回复消息
            dialogsData[soupId].messages.push(replyMessage);
            dialogsData[soupId].lastUpdated = Date.now();

            // 保存对话数据
            await saveDialogsData();

            // 返回回复消息
            return sendResponse(res, true, {
                reply: replyMessage.content,
                message: replyMessage
            });
        } catch (error) {
            console.error('发送消息失败:', error);
            return sendResponse(res, false, '服务器内部错误', 500);
        }
    });

    // 2. 保存对话记录
    app.post('/api/dialog/save', async (req, res) => {
        try {
            const { soupId, messages } = req.body;

            if (!soupId || !messages || !Array.isArray(messages)) {
                return sendResponse(res, false, '缺少必要参数', 400);
            }

            // 更新对话数据
            dialogsData[soupId] = {
                messages: messages,
                lastUpdated: Date.now()
            };

            // 保存对话数据
            await saveDialogsData();

            return sendResponse(res, true, { message: '保存成功' });
        } catch (error) {
            console.error('保存对话记录失败:', error);
            return sendResponse(res, false, '服务器内部错误', 500);
        }
    });

    // 3. 获取所有对话记录
    app.get('/api/dialog/list', async (_, res) => {
        try {
            // 收集所有对话记录
            const allDialogs = {};

            // 遍历所有汤面ID
            for (const soupId in dialogsData) {
                if (dialogsData[soupId].messages && dialogsData[soupId].messages.length > 0) {
                    allDialogs[soupId] = {
                        messages: dialogsData[soupId].messages,
                        total: dialogsData[soupId].messages.length,
                        lastUpdated: dialogsData[soupId].lastUpdated || Date.now()
                    };
                }
            }

            return sendResponse(res, true, {
                dialogs: allDialogs,
                total: Object.keys(allDialogs).length
            });
        } catch (error) {
            console.error('获取所有对话记录失败:', error);
            return sendResponse(res, false, '服务器内部错误', 500);
        }
    });

    // 4. 获取特定汤面的对话记录
    app.get('/api/dialog/detail/:soupId', async (req, res) => {
        try {
            const { soupId } = req.params;

            if (!soupId) {
                return sendResponse(res, false, '缺少必要参数', 400);
            }

            // 获取指定汤面的对话记录
            const dialogData = dialogsData[soupId] || {
                messages: [],
                lastUpdated: Date.now()
            };

            return sendResponse(res, true, {
                messages: dialogData.messages,
                total: dialogData.messages.length,
                lastUpdated: dialogData.lastUpdated
            });
        } catch (error) {
            console.error('获取对话记录失败:', error);
            return sendResponse(res, false, '服务器内部错误', 500);
        }
    });

    // 5. 删除对话记录
    app.delete('/api/dialog/delete/:soupId', async (req, res) => {
        try {
            const { soupId } = req.params;

            if (!soupId) {
                return sendResponse(res, false, '缺少必要参数', 400);
            }

            // 删除指定汤面的对话记录
            if (dialogsData[soupId]) {
                delete dialogsData[soupId];
                await saveDialogsData();
            }

            return sendResponse(res, true, { message: '删除成功' });
        } catch (error) {
            console.error('删除对话记录失败:', error);
            return sendResponse(res, false, '服务器内部错误', 500);
        }
    });
}

// 初始化模块
async function init() {
    await loadDialogsData();
    console.log('对话服务初始化完成');
}

module.exports = {
    init,
    initDialogRoutes
};
