const express = require('express');
const router = express.Router();
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
        console.log('对话数据保存成功');
        return true;
    } catch (error) {
        console.error('保存对话数据失败:', error);
        return false;
    }
}

// 初始化加载数据
loadDialogsData();

// API路由

// 1. 发送消息
router.post('/dialog/send', async (req, res) => {
    try {
        const { userId, soupId, message, timestamp } = req.body;

        if (!soupId || !message) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数'
            });
        }

        // 确保该汤面的对话存在
        if (!dialogsData[soupId]) {
            dialogsData[soupId] = {
                messages: [],
                lastUpdated: Date.now()
            };
        }

        // 创建新消息
        const newMessage = {
            id: `msg_${Date.now()}`,
            userId: userId || 'anonymous',
            type: 'user',
            content: message,
            timestamp: timestamp || Date.now()
        };

        // 添加用户消息
        dialogsData[soupId].messages.push(newMessage);

        // 创建回复消息
        const replyMessage = {
            id: `msg_${Date.now() + 1}`,
            type: 'normal',
            content: 'test_reply', // 固定回复文本
            timestamp: Date.now() + 1
        };

        // 添加回复消息
        dialogsData[soupId].messages.push(replyMessage);

        // 更新最后修改时间
        dialogsData[soupId].lastUpdated = Date.now();

        // 保存数据
        await saveDialogsData();

        // 返回回复消息
        res.json({
            success: true,
            reply: replyMessage.content,
            dialogId: soupId
        });
    } catch (error) {
        console.error('处理消息请求失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});

// 2. 获取对话历史
router.get('/dialog/:soupId', async (req, res) => {
    try {
        const { soupId } = req.params;

        if (!soupId) {
            return res.status(400).json({
                success: false,
                error: '缺少汤面ID'
            });
        }

        // 如果该汤面没有对话记录，返回空数组
        if (!dialogsData[soupId]) {
            return res.json({
                success: true,
                data: {
                    messages: [],
                    total: 0
                }
            });
        }

        // 返回对话记录
        res.json({
            success: true,
            data: {
                messages: dialogsData[soupId].messages,
                total: dialogsData[soupId].messages.length
            }
        });
    } catch (error) {
        console.error('获取对话历史失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});

// 3. 获取所有对话记录
router.get('/dialog', async (req, res) => {
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

        res.json({
            success: true,
            data: {
                dialogs: allDialogs,
                total: Object.keys(allDialogs).length
            }
        });
    } catch (error) {
        console.error('获取所有对话记录失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});

// 4. 清除对话历史
router.delete('/dialog/:soupId', async (req, res) => {
    try {
        const { soupId } = req.params;

        if (!soupId) {
            return res.status(400).json({
                success: false,
                error: '缺少汤面ID'
            });
        }

        // 如果该汤面有对话记录，删除它
        if (dialogsData[soupId]) {
            const deletedCount = dialogsData[soupId].messages.length;
            delete dialogsData[soupId];
            await saveDialogsData();

            return res.json({
                success: true,
                data: {
                    deletedCount
                }
            });
        }

        // 如果没有对话记录，返回删除数量为0
        res.json({
            success: true,
            data: {
                deletedCount: 0
            }
        });
    } catch (error) {
        console.error('清除对话历史失败:', error);
        res.status(500).json({
            success: false,
            error: '服务器内部错误'
        });
    }
});

module.exports = router;
