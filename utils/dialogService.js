/**
 * 对话服务类
 * 处理用户与系统对话的通信、存储与加载
 */
const { request } = require('./api');

// 获取基础 URL
const getBaseUrl = () => {
    const app = getApp();
    return app.globalData.config.ysUrl;
};

class DialogService {
    constructor() {
        // 存储当前对话状态
        this._dialogState = {
            messageDirty: false,
            currentSoupId: '',
            currentDialogId: '',
            isProcessing: false
        };
    }

    /**
     * 设置当前汤面ID
     * @param {string} soupId 汤面ID
     */
    setCurrentSoupId(soupId) {
        // 确保 soupId 不为 null 或 undefined
        soupId = soupId || '';
        this._dialogState.currentSoupId = soupId;
    }

    /**
     * 获取当前汤面ID
     * @returns {string} 当前汤面ID
     */
    getCurrentSoupId() {
        return this._dialogState.currentSoupId;
    }

    /**
     * 设置当前对话ID
     * @param {string} dialogId 对话ID
     */
    setCurrentDialogId(dialogId) {
        if (!dialogId) return;
        this._dialogState.currentDialogId = dialogId;
    }

    /**
     * 获取当前对话ID
     * @returns {string} 当前对话ID
     */
    getCurrentDialogId() {
        return this._dialogState.currentDialogId;
    }

    /**
     * 设置处理状态
     * @param {boolean} isProcessing 是否正在处理请求
     */
    setProcessing(isProcessing) {
        this._dialogState.isProcessing = !!isProcessing;
    }

    /**
     * 获取处理状态
     * @returns {boolean} 是否正在处理请求
     */
    isProcessing() {
        return this._dialogState.isProcessing;
    }

    /**
     * 获取初始化系统消息
     * @returns {Array} 系统消息数组
     */
    getInitialSystemMessages() {
        return [
            {
                role: 'system',
                content: '欢迎来到一勺推理社。'
            },
            {
                role: 'system',
                content: '你需要通过提问来猜测谜底，'
            },
            {
                role: 'system',
                content: '我只会回答"是"、"否"或"不确定"。'
            },
            {
                role: 'system',
                content: '长按对话区域显示汤面。'
            }
        ];
    }

    /**
     * 合并初始系统消息与历史消息
     * @param {Array} messages 历史消息数组
     * @returns {Array} 合并后的消息数组
     */
    combineWithInitialMessages(messages) {
        const initialMessages = this.getInitialSystemMessages();
        const historyMessages = messages || [];

        // 过滤掉历史消息中的系统消息，避免重复
        const filteredMessages = historyMessages.filter(msg => msg.role !== 'system');

        // 合并初始系统消息和过滤后的历史消息
        return [...initialMessages, ...filteredMessages];
    }

    /**
     * 设置对话内容已更改标志
     * @param {boolean} isDirty 是否已更改
     */
    setMessageDirty(isDirty) {
        this._dialogState.messageDirty = !!isDirty;
    }

    /**
     * 获取对话内容是否已更改
     * @returns {boolean} 是否已更改
     */
    isMessageDirty() {
        return this._dialogState.messageDirty;
    }

    /**
     * 重置对话状态
     */
    resetDialogState() {
        this._dialogState = {
            messageDirty: false,
            currentSoupId: '',
            currentDialogId: '',
            isProcessing: false
        };
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
        if (this.isProcessing()) {
            throw new Error('正在处理请求，请稍后再试');
        }

        this.setProcessing(true);

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
            const response = await request({
                url: url,
                method: 'POST',
                data: {
                    userId: params.userId,
                    message: params.message,
                    messageId: messageId,
                    timestamp: Date.now()
                }
            });

            // 如果后端返回了对话ID，保存它
            if (response.data && response.data.dialogId) {
                this.setCurrentDialogId(response.data.dialogId);
            }

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
                role: 'agent',
                content: replyContent,
                timestamp: Date.now()
            };
        } catch (error) {
            throw error;
        } finally {
            this.setProcessing(false);
        }
    }

    /**
     * 从服务器获取对话记录
     * @param {string} dialogId 对话ID
     * @returns {Promise<Array>} 消息数组Promise
     */
    async fetchMessages(dialogId) {
        if (!dialogId) {
            throw new Error('获取对话记录失败: 缺少对话ID');
        }

        try {
            const url = `${getBaseUrl()}dialog/${dialogId}`;

            const response = await request({
                url: url,
                method: 'GET'
            });

            // 检查响应格式
            if (!response || typeof response !== 'object') {
                return [];
            }

            // 处理响应数据结构
            let messages = [];
            if (response.success && response.data) {
                // 保存对话ID
                if (response.data.dialogId) {
                    this.setCurrentDialogId(response.data.dialogId);
                }

                // 保存汤面ID
                if (response.data.soupId) {
                    this.setCurrentSoupId(response.data.soupId);
                }

                messages = response.data.messages || [];
            }

            return messages;
        } catch (error) {
            // 如果服务器请求失败，返回空数组
            return [];
        }
    }

    /**
     * 加载对话记录（只从服务器获取）
     * @param {string} dialogId 对话ID
     * @returns {Promise<Array>} 消息数组Promise，包含系统初始消息
     */
    async getDialogMessages(dialogId) {
        if (!dialogId) {
            throw new Error('获取对话记录失败: 缺少对话ID');
        }

        try {
            // 从服务器获取对话记录
            const serverMessages = await this.fetchMessages(dialogId);

            // 合并系统初始消息并返回
            return this.combineWithInitialMessages(serverMessages);
        } catch (error) {
            // 出错时返回只包含系统初始消息的数组
            return this.getInitialSystemMessages();
        }
    }

    /**
     * 创建新对话
     * @param {string} userId 用户ID
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object>} 创建的对话数据
     */
    async createDialog(userId, soupId) {
        if (!userId) {
            throw new Error('创建对话失败: 缺少用户ID');
        }

        if (!soupId) {
            throw new Error('创建对话失败: 缺少汤面ID');
        }

        try {
            // 构建请求URL
            const url = `${getBaseUrl()}dialog/create`;

            const response = await request({
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

            // 保存对话ID和汤面ID
            if (response.data && response.data.dialogId) {
                this.setCurrentDialogId(response.data.dialogId);
                this.setCurrentSoupId(soupId);
                return response.data;
            } else {
                throw new Error('创建对话失败: 服务器未返回对话ID');
            }
        } catch (error) {
            throw error;
        }
    }

    /**
     * 获取用户特定汤面的对话数据
     * @param {string} userId 用户ID
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object>} 对话数据
     */
    async getUserDialog(userId, soupId) {
        if (!userId) {
            throw new Error('获取对话失败: 缺少用户ID');
        }

        if (!soupId) {
            throw new Error('获取对话失败: 缺少汤面ID');
        }

        try {
            // 构建请求URL
            const url = `${getBaseUrl()}dialog/user/${userId}/soup/${soupId}`;

            const response = await request({
                url: url,
                method: 'GET'
            });

            if (!response.success) {
                throw new Error(response.error || '获取对话失败');
            }

            // 保存对话ID和汤面ID
            if (response.data) {
                if (response.data.dialogId) {
                    this.setCurrentDialogId(response.data.dialogId);
                }

                this.setCurrentSoupId(soupId);
                return response.data;
            } else {
                return {
                    dialogId: '',
                    soupId: soupId,
                    userId: userId,
                    messages: [],
                    total: 0
                };
            }
        } catch (error) {
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

            const response = await request({
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
