/**
 * 对话API接口实现
 * 负责封装所有与对话API相关的接口调用
 * 实现接口层设计，与服务层解耦
 */
const {get, post} = require('../utils/request');
const {getFullUrl} = require('../utils/urlUtils');
const ApiResult = require('./entities');
const DIALOG = "dialog";

// 用于防止并发请求的简单锁
let _isProcessingRequest = false;

/**
 * 对话API接口实现类
 * 提供所有对话相关的API调用方法
 */
const dialogApiImpl = {
    /**
     * 发送消息到后端服务器并获取回复
     * @param {Object} params 请求参数
     * @param {string} params.message 用户消息内容
     * @param {string} params.userId 用户ID
     * @param {string} params.dialogId 对话ID
     * @param {string} params.messageId 消息ID（可选）
     * @returns {Promise<ApiResult>} 回复消息的Promise
     */
    sendMessage: async (params) => {
        // 防止重复请求
        if (_isProcessingRequest) {
            throw new Error("正在处理请求，请稍后再试");
        }

        _isProcessingRequest = true;

        try {
            // 必要参数检查
            if (!params.message) {
                throw new Error("[DIALOG] 发送消息失败: 缺少消息内容");
            }

            if (!params.userId) {
                throw new Error("[DIALOG] 发送消息失败: 缺少用户ID");
            }

            if (!params.dialogId) {
                throw new Error("[DIALOG] 发送消息失败: 缺少对话ID");
            }

            // 获取用户消息ID
            const messageId = params.messageId || `msg_${Date.now()}`;

            // 构建请求URL
            const url = getFullUrl(DIALOG, `/${params.dialogId}/send`);

            // 发送请求到后端
            return await post({
                url: url,
                data: {
                    userId: params.userId,
                    message: params.message,
                    messageId: messageId,
                    timestamp: Date.now(),
                },
            });
        } finally {
            _isProcessingRequest = false;
        }
    },

    /**
     * 从服务器获取对话记录
     * @param {string} dialogId 对话ID
     * @returns {Promise<ApiResult>} 包含消息数组和对话信息的对象
     */
    fetchMessages: async (dialogId) => {
        if (!dialogId) {
            throw new Error("获取对话记录失败: 缺少对话ID");
        }

        try {
            const url = getFullUrl(DIALOG, `/${dialogId}`);

            const response = await get({
                url: url
            });

            return response;
        } catch (error) {
            console.error(`[${DIALOG}] 获取对话记录失败:`, error);
            // 如果服务器请求失败，返回空数组和原始dialogId
            return {messages: [], dialogId, soupId: ""};
        }
    },

    /**
     * 获取用户特定汤面的对话数据
     * @param {string} userId 用户ID
     * @param {string} soupId 汤面ID
     * @returns {Promise<ApiResult>} 对话数据，包含dialogId和soupData
     */
    getUserDialog: async (userId, soupId) => {
        if (!userId) {
            throw new Error("获取对话失败: 缺少用户ID");
        }

        if (!soupId) {
            throw new Error("获取对话失败: 缺少汤面ID");
        }

        try {
            const response = await get({
                url: getFullUrl(DIALOG, '/get'),
                data: {
                    userId: userId,
                    soupId: soupId
                }
            });

            return response;
        } catch (error) {
            console.error(`[${DIALOG}] 获取用户对话失败:`, error);
            throw error;
        }
    },

    /**
     * 获取聊天数据 - 统一的聊天数据获取方法
     * @param {string} userId 用户ID
     * @param {string} soupId 汤面ID
     * @returns {Promise<ApiResult>} 聊天数据，包含dialogId
     */
    getChatData: async (userId, soupId) => {
        if (!userId) {
            throw new Error("获取聊天数据失败: 缺少用户ID");
        }

        if (!soupId) {
            throw new Error("获取聊天数据失败: 缺少汤面ID");
        }

        try {
            // 构建请求URL
            const url = getFullUrl(DIALOG, '/chat-data');

            const response = await post({
                url: url,
                data: {
                    userId: userId,
                    soupId: soupId,
                },
            });

            return response;
        } catch (error) {
            console.error(`[${DIALOG}] 获取聊天数据失败:`, error);
            throw error;
        }
    },

    /**
     * 保存对话记录
     * @param {string} dialogId 对话ID
     * @param {string} userId 用户ID
     * @param {Array} messages 消息数组
     * @returns {Promise<ApiResult>} 保存结果
     */
    saveDialogMessages: async (dialogId, userId, messages) => {
        if (!dialogId) {
            throw new Error("保存对话失败: 缺少对话ID");
        }

        if (!userId) {
            throw new Error("保存对话失败: 缺少用户ID");
        }

        if (!messages || !Array.isArray(messages)) {
            throw new Error("保存对话失败: 消息格式不正确");
        }

        try {
            // 构建请求URL
            const url = getFullUrl(DIALOG, `/${dialogId}/save`);

            const response = await post({
                url: url,
                data: {
                    userId: userId,
                    messages: messages,
                },
            });

            return response;
        } catch (error) {
            console.error(`[${DIALOG}] 保存对话记录失败:`, error);
            throw error;
        }
    },

    /**
     * 重置请求锁
     * 用于在特殊情况下手动重置锁状态
     */
    resetRequestLock: () => {
        _isProcessingRequest = false;
    }
};

module.exports = dialogApiImpl;