/**
 * 对话服务类
 * 处理用户与系统对话的通信、存储与加载
 */
const { request } = require('./api');
const login = require('./login');

class DialogService {
    constructor() {
        // 存储当前对话状态
        this._dialogState = {
            messageDirty: false,
            currentSoupId: '',
            currentDialogId: ''
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
     * 获取初始化系统消息
     * @returns {Array} 系统消息数组
     */
    getInitialSystemMessages() {
        return [
            {
                type: 'system',
                content: '欢迎来到一勺海龟汤。'
            },
            {
                type: 'system',
                content: '你需要通过提问来猜测谜底，'
            },
            {
                type: 'system',
                content: '我只会回答"是"、"否"或"不确定"。'
            },
            {
                type: 'system',
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
        const filteredMessages = historyMessages.filter(msg => msg.type !== 'system');

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
            currentDialogId: ''
        };
    }

    /**
     * 获取存储的对话记录键
     * @param {string} soupId 汤面ID
     * @returns {string} 存储键
     */
    getDialogStorageKey(soupId) {
        if (!soupId) return null;
        return `dialog_messages_${soupId}`;
    }

    /**
     * 保存对话记录
     * @param {string} soupId 汤面ID
     * @param {Array} messages 对话消息数组
     * @returns {boolean} 保存是否成功
     */
    saveDialogMessages(soupId, messages) {
        if (!soupId || !messages || !messages.length) {
            console.error('DialogService: 保存对话记录失败: 无效的参数');
            return false;
        }

        // 过滤掉所有system类型的消息
        const filteredMessages = messages.filter(msg => msg.type !== 'system');

        // 如果过滤后没有消息，不保存
        if (filteredMessages.length === 0) {
            return true; // 仅有系统消息情况下，视为成功
        }

        const storageKey = this.getDialogStorageKey(soupId);

        try {
            // 存储过滤后的消息
            wx.setStorageSync(storageKey, filteredMessages);

            // 更新脏数据标记
            this.setMessageDirty(false);
            return true;
        } catch (error) {
            console.error(`DialogService: 保存对话记录失败:`, error);
            return false;
        }
    }

    /**
     * 加载对话记录
     * @param {Object} options 配置选项
     * @param {string} options.soupId 汤面ID
     * @param {Function} options.success 成功回调函数，参数为加载的消息数组
     * @param {Function} options.fail 失败回调函数，参数为错误信息
     * @param {Function} options.complete 完成回调函数
     */
    loadDialogMessages(options = {}) {
        let { soupId, success, fail, complete } = options;

        if (!soupId) {
            const error = 'DialogService: 加载对话记录失败: 缺少汤面ID';
            console.error(error);
            if (typeof fail === 'function') {
                fail(error);
            }
            if (typeof complete === 'function') {
                complete();
            }
            return;
        }

        const storageKey = this.getDialogStorageKey(soupId);

        try {
            // 尝试加载消息
            let messages = wx.getStorageSync(storageKey) || [];

            if (typeof success === 'function') {
                success(messages);
            }
        } catch (error) {
            console.error(`DialogService: 加载对话记录失败:`, error);
            if (typeof fail === 'function') {
                fail(error);
            }
        }

        if (typeof complete === 'function') {
            complete();
        }
    }

    /**
     * 删除对话记录
     * @param {string} soupId 汤面ID
     * @returns {boolean} 删除是否成功
     */
    deleteDialogMessages(soupId) {
        if (!soupId) return false;

        const storageKey = this.getDialogStorageKey(soupId);
        try {
            wx.removeStorageSync(storageKey);
            return true;
        } catch (error) {
            console.error(`DialogService: 删除对话记录失败:`, error);
            return false;
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
            type: 'user',
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
     * @param {string} params.soupId 汤面ID
     * @param {string} params.dialogId 对话ID（可选）
     * @returns {Promise<Object>} 回复消息的Promise
     */
    async sendMessage(params) {
        // 获取用户信息
        const userInfo = login.getUserInfo();
        const userId = userInfo?.userId || userInfo?.openId || '';

        // 获取汤面ID
        const soupId = params.soupId || this.getCurrentSoupId() || '';
        if (!soupId) {
            throw new Error('发送消息失败: 缺少汤面ID');
        }

        // 获取对话ID
        const dialogId = params.dialogId || this.getCurrentDialogId();

        try {
            // 发送请求到后端
            const response = await request({
                url: '/api/dialog/send',
                method: 'POST',
                data: {
                    userId: userId,
                    soupId: soupId,
                    dialogId: dialogId,
                    message: params.message,
                    timestamp: Date.now()
                }
            });

            // 如果后端返回了对话ID，保存它
            if (response.dialogId) {
                this.setCurrentDialogId(response.dialogId);
            }

            // 返回回复消息
            return {
                id: `msg_${Date.now()}`,
                type: 'normal',
                content: response.reply || response.content,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('发送消息到服务器失败:', error);
            // 如果服务器请求失败，返回默认回复
            return {
                id: `msg_${Date.now()}`,
                type: 'normal',
                content: 'test_reply',
                timestamp: Date.now()
            };
        }
    }

    /**
     * 异步加载对话消息
     * @param {string} soupId 汤面ID
     * @returns {Promise<Array>} 消息数组Promise
     */
    loadDialogMessagesAsync(soupId) {
        return new Promise((resolve, reject) => {
            this.loadDialogMessages({
                soupId: soupId,
                success: (messages) => resolve(messages || []),
                fail: (error) => reject(error)
            });
        });
    }

    /**
     * 从服务器获取对话记录
     * @param {string} soupId 汤面ID
     * @returns {Promise<Array>} 消息数组Promise
     */
    async fetchDialogMessagesFromServer(soupId) {
        if (!soupId) {
            throw new Error('获取对话记录失败: 缺少汤面ID');
        }

        try {
            console.log('从服务器获取对话记录:', soupId);
            const response = await request({
                url: `/api/dialog/${soupId}`,
                method: 'GET'
            });

            // 检查响应格式
            const data = response.data || {};
            const messages = data.messages || [];

            console.log(`从服务器获取到 ${messages.length} 条对话记录`);
            return messages;
        } catch (error) {
            console.error('从服务器获取对话记录失败:', error);
            // 如果服务器请求失败，返回空数组
            return [];
        }
    }

    /**
     * 加载对话记录（只从服务器获取）
     * @param {string} soupId 汤面ID
     * @returns {Promise<Array>} 消息数组Promise，包含系统初始消息
     */
    async getDialogMessages(soupId) {
        if (!soupId) {
            throw new Error('获取对话记录失败: 缺少汤面ID');
        }

        try {
            // 从服务器获取对话记录
            const serverMessages = await this.fetchDialogMessagesFromServer(soupId);

            // 合并系统初始消息并返回
            return this.combineWithInitialMessages(serverMessages);
        } catch (error) {
            console.error('获取对话记录失败:', error);
            // 出错时返回只包含系统初始消息的数组
            return this.getInitialSystemMessages();
        }
    }
}

// 导出单例实例
const dialogService = new DialogService();
module.exports = dialogService;
