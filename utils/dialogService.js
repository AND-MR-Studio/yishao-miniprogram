/**
 * 对话服务类
 * 处理用户与系统对话的通信、存储与加载
 * 同时管理与汤面内容相关的对话功能
 *
 * 无状态设计：所有方法都接受必要的参数，不在服务中存储状态
 */
const { dialogRequest, soupRequest, soup_by_id_url } = require('./api');

// 获取基础 URL
const getBaseUrl = () => {
    const app = getApp();
    return app.globalData.config.ysUrl;
};

// 用于防止并发请求的简单锁
let _isProcessingRequest = false;

class DialogService {
    /**
     * 处理历史消息
     * @param {Array} messages 历史消息数组
     * @returns {Array} 处理后的消息数组
     */
    processMessages(messages) {
        const historyMessages = messages || [];
        return historyMessages;
    }

    /**
     * 获取汤面ID
     * @param {string} soupId 汤面ID
     * @returns {Promise<string>} 汤面ID
     */
    async getSoup(soupId) {
        if (!soupId) {
            console.error('获取汤面ID失败: 缺少汤面ID');
            return null;
        }

        try {
            // 从服务器获取汤面ID
            const response = await soupRequest({
                url: `${soup_by_id_url}${soupId}`,
                method: 'GET'
            });

            // 根据新接口契约，直接返回soupId
            if (response.success && response.data) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('获取汤面ID失败:', error);
            return null;
        }
    }

    /**
     * 处理用户输入的消息
     * @param {string} content 用户输入的内容
     * @returns {Object} 处理结果 {isSpecial: boolean, userMessage: Object, reply: Object|null}
     */
    handleUserInput(content) {
        if (!content || !content.trim()) {
            return {
                isSpecial: false,
                userMessage: null,
                reply: null
            };
        }

        const trimmedContent = content.trim();

        // 创建用户消息对象
        const userMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: trimmedContent,
            timestamp: Date.now()
        };

        // 返回处理结果
        return {
            isSpecial: false,
            userMessage: userMessage,
            reply: null
        };
    }

    /**
     * 发送消息到后端服务器并获取回复
     * @param {Object} params 请求参数
     * @param {string} params.message 用户消息内容
     * @param {string} params.userId 用户ID
     * @param {string} params.dialogId 对话ID
     * @param {string} params.messageId 消息ID（可选）
     * @returns {Promise<Object>} 回复消息的Promise
     */
    async sendMessage(params) {
        // 防止重复请求
        if (_isProcessingRequest) {
            throw new Error('正在处理请求，请稍后再试');
        }

        _isProcessingRequest = true;

        try {
            // 必要参数检查
            if (!params.message) {
                throw new Error('发送消息失败: 缺少消息内容');
            }

            if (!params.userId) {
                throw new Error('发送消息失败: 缺少用户ID');
            }

            if (!params.dialogId) {
                throw new Error('发送消息失败: 缺少对话ID');
            }

            // 获取用户消息ID
            const messageId = params.messageId || `msg_${Date.now()}`;

            // 构建请求URL
            const url = `${getBaseUrl()}dialog/${params.dialogId}/send`;

            // 发送请求到后端
            const response = await dialogRequest({
                url: url,
                method: 'POST',
                data: {
                    userId: params.userId,
                    message: params.message,
                    messageId: messageId,
                    timestamp: Date.now()
                }
            });

            // 处理响应数据
            let replyContent = '';
            let replyId = `msg_${Date.now()}`;

            if (response.success && response.data) {
                // 标准响应格式
                replyContent = response.data.reply || '';

                if (response.data.message) {
                    replyId = response.data.message.messageId || response.data.message.id || replyId;
                    replyContent = response.data.message.content || replyContent;
                }
            }

            // 返回回复消息
            return {
                id: replyId,
                role: 'assistant',
                content: replyContent,
                timestamp: Date.now(),
                dialogId: response.data?.dialogId || params.dialogId // 返回对话ID，便于调用方更新
            };
        } catch (error) {
            throw error;
        } finally {
            _isProcessingRequest = false;
        }
    }

    /**
     * 从服务器获取对话记录
     * @param {string} dialogId 对话ID
     * @returns {Promise<Object>} 包含消息数组和对话信息的对象
     */
    async fetchMessages(dialogId) {
        if (!dialogId) {
            throw new Error('获取对话记录失败: 缺少对话ID');
        }

        try {
            const url = `${getBaseUrl()}dialog/${dialogId}`;

            const response = await dialogRequest({
                url: url,
                method: 'GET'
            });

            // 检查响应格式
            if (!response || typeof response !== 'object') {
                return { messages: [], dialogId, soupId: '' };
            }

            // 处理响应数据结构
            let messages = [];
            let responseDialogId = dialogId;
            let responseSoupId = '';

            if (response.success && response.data) {
                // 获取对话ID
                if (response.data.dialogId) {
                    responseDialogId = response.data.dialogId;
                }

                // 获取汤面ID
                if (response.data.soupId) {
                    responseSoupId = response.data.soupId;
                }

                messages = response.data.messages || [];
            }

            return {
                messages,
                dialogId: responseDialogId,
                soupId: responseSoupId
            };
        } catch (error) {
            // 如果服务器请求失败，返回空数组和原始dialogId
            return { messages: [], dialogId, soupId: '' };
        }
    }

    /**
     * 加载对话记录（只从服务器获取）
     * @param {string} dialogId 对话ID
     * @returns {Promise<Object>} 包含消息数组和对话信息的对象
     */
    async getDialogMessages(dialogId) {
        if (!dialogId) {
            throw new Error('获取对话记录失败: 缺少对话ID');
        }

        try {
            // 从服务器获取对话记录
            const result = await this.fetchMessages(dialogId);

            // 处理消息并返回
            return {
                ...result,
                messages: this.processMessages(result.messages)
            };
        } catch (error) {
            // 出错时返回空数组和原始dialogId
            return { messages: [], dialogId, soupId: '' };
        }
    }



    /**
     * 创建新对话
     * @param {string} userId 用户ID
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object>} 创建的对话数据，包含dialogId和soupData
     */
    async createDialog(userId, soupId) {
        if (!userId) {
            throw new Error('创建对话失败: 缺少用户ID');
        }

        if (!soupId) {
            throw new Error('创建对话失败: 缺少汤面ID');
        }

        try {
            // 先获取汤面数据，确保存在
            const soupData = await this.getSoup(soupId);
            if (!soupData) {
                throw new Error('创建对话失败: 无法获取汤面数据');
            }

            // 构建请求URL
            const url = `${getBaseUrl()}dialog/create`;

            const response = await dialogRequest({
                url: url,
                method: 'POST',
                data: {
                    userId: userId,
                    soupId: soupId
                }
            });

            if (!response.success) {
                throw new Error(response.error || '创建对话失败');
            }

            // 返回包含对话ID和汤面数据的对象
            if (response.data && response.data.dialogId) {
                return {
                    ...response.data,
                    soupData: soupData
                };
            } else {
                throw new Error('创建对话失败: 服务器未返回对话ID');
            }
        } catch (error) {
            console.error('创建对话失败:', error);
            throw error;
        }
    }

    /**
     * 获取用户特定汤面的对话数据
     * @param {string} userId 用户ID
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object>} 对话数据，包含dialogId和soupData
     */
    async getUserDialog(userId, soupId) {
        if (!userId) {
            throw new Error('获取对话失败: 缺少用户ID');
        }

        if (!soupId) {
            throw new Error('获取对话失败: 缺少汤面ID');
        }

        try {
            // 先获取汤面数据，确保存在
            const soupData = await this.getSoup(soupId);
            if (!soupData) {
                throw new Error('获取对话失败: 无法获取汤面数据');
            }

            // 构建请求URL
            const url = `${getBaseUrl()}dialog/user/${userId}/soup/${soupId}`;

            const response = await dialogRequest({
                url: url,
                method: 'GET'
            });

            if (!response.success) {
                throw new Error(response.error || '获取对话失败');
            }

            // 返回包含对话数据和汤面数据的对象
            if (response.data && response.data.dialogId) {
                return {
                    ...response.data,
                    soupData: soupData
                };
            } else {
                // 没有找到对话，返回空对话数据和汤面数据
                return {
                    dialogId: '',
                    soupId: soupId,
                    userId: userId,
                    messages: [],
                    total: 0,
                    soupData: soupData
                };
            }
        } catch (error) {
            console.error('获取用户对话失败:', error);
            throw error;
        }
    }

    /**
     * 保存对话记录
     * @param {string} dialogId 对话ID
     * @param {string} userId 用户ID
     * @param {Array} messages 消息数组
     * @returns {Promise<Object>} 保存结果
     */
    async saveDialogMessages(dialogId, userId, messages) {
        if (!dialogId) {
            throw new Error('保存对话失败: 缺少对话ID');
        }

        if (!userId) {
            throw new Error('保存对话失败: 缺少用户ID');
        }

        if (!messages || !Array.isArray(messages)) {
            throw new Error('保存对话失败: 消息格式不正确');
        }

        try {
            // 构建请求URL
            const url = `${getBaseUrl()}dialog/${dialogId}/save`;

            const response = await dialogRequest({
                url: url,
                method: 'POST',
                data: {
                    userId: userId,
                    messages: messages
                }
            });

            if (!response.success) {
                throw new Error(response.error || '保存对话失败');
            }

            return response.data;
        } catch (error) {
            throw error;
        }
    }
}

// 导出单例实例
const dialogService = new DialogService();
module.exports = dialogService;
