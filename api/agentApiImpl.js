/**
 * 代理API接口实现
 * 负责封装所有与代理API相关的接口调用
 * 实现接口层设计，与服务层解耦
 */
const {post} = require('../utils/request');
const {getFullUrl} = require('../utils/urlUtils');
const ApiResult = require('./entities');
const AGENT = "agent";

// 用于防止并发请求的简单锁
let _isProcessingRequest = false;

/**
 * 代理API接口实现类
 * 提供所有代理相关的API调用方法
 */
const agentApiImpl = {
    /**
     * 发送消息到代理服务
     * @param {Object} params - 请求参数
     * @param {Array} params.messages - 消息历史
     * @param {string} params.soupId - 汤面ID
     * @param {string} params.userId - 用户ID
     * @param {string} params.dialogId - 对话ID
     * @returns {Promise<ApiResult>} 代理响应
     */
    sendMessage: async (params) => {
        // 防止重复请求
        if (_isProcessingRequest) {
            throw new Error('正在处理请求，请稍后再试');
        }

        _isProcessingRequest = true;

        try {
            // 必要参数检查
            if (!params.messages || !Array.isArray(params.messages)) {
                throw new Error(`[${AGENT}] 发送消息失败: 缺少消息历史`);
            }

            if (!params.userId) {
                throw new Error(`[${AGENT}] 发送消息失败: 缺少用户ID`);
            }

            if (!params.dialogId) {
                throw new Error(`[${AGENT}] 发送消息失败: 缺少对话ID`);
            }

            if (!params.soupId) {
                throw new Error(`[${AGENT}] 发送消息失败: 缺少汤面ID`);
            }

            // 构建请求数据
            const requestData = {
                messages: params.messages,
                soup: params.soupId,
                userId: params.userId,
                dialogId: params.dialogId,
                saveToCloud: params.saveToCloud !== false // 默认为true
            };

            // 发送请求
            return await post({
                url: getFullUrl(AGENT, '/chat'),
                data: requestData
            });
        } finally {
            // 释放锁
            _isProcessingRequest = false;
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

module.exports = agentApiImpl;