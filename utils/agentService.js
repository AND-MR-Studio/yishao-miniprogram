/**
 * Agent服务类
 * 处理与Agent API的通信
 *
 * 无状态设计：所有方法都接受必要的参数，不在服务中存储状态
 */
const { agentRequest } = require('./request');
const { agent_chat_url } = require('./api');

// 用于防止并发请求的简单锁
let _isProcessingRequest = false;

class AgentService {

    /**
     * 发送消息到Agent API并获取回复
     * @param {Object} params 请求参数
     * @param {Array} params.messages 消息历史数组，每个消息包含role和content
     * @param {Object} params.soup 汤面数据对象，包含contentLines和truth
     * @param {string} params.userId 用户ID
     * @param {string} params.dialogId 对话ID
     * @returns {Promise<Object>} 回复消息的Promise
     */
    async sendAgent(params) {
        // 防止重复请求
        if (_isProcessingRequest) {
            throw new Error('正在处理请求，请稍后再试');
        }

        _isProcessingRequest = true;

        try {
            // 必要参数检查
            if (!params.messages || !Array.isArray(params.messages)) {
                throw new Error('发送消息失败: 缺少消息历史');
            }

            if (!params.userId) {
                throw new Error('发送消息失败: 缺少用户ID');
            }

            if (!params.dialogId) {
                throw new Error('发送消息失败: 缺少对话ID');
            }

            if (!params.soup) {
                throw new Error('发送消息失败: 缺少汤面数据');
            }

            // 使用传入的汤面数据
            const soupData = params.soup;

            // 构建请求数据
            const requestData = {
                messages: params.messages,
                placeholders: {
                    puzzle_surface: Array.isArray(soupData.contentLines)
                        ? soupData.contentLines.join('\n')
                        : soupData.contentLines,
                    puzzle_truth: soupData.truth
                }
            };

            // 发送请求到Agent API
            const response = await agentRequest({
                url: agent_chat_url,
                method: 'POST',
                data: requestData
            });

            // 处理响应数据
            let replyContent = '';
            let replyId = `msg_${Date.now()}`;

            if (Array.isArray(response) ) {
              replyContent = response[0].content || '';
            }

            // 返回回复消息
            return {
                id: replyId,
                role: 'assistant',
                content: replyContent,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('发送Agent消息失败:', error);
            throw error;
        } finally {
            _isProcessingRequest = false;
        }
    }
}

// 导出单例实例
const agentService = new AgentService();
module.exports = agentService;