const { chatAPI } = require('../api');

/**
 * 对话服务类
 * 处理与后端的对话交互，支持消息存储和加载
 */
class DialogService {
    constructor() {
        // 存储当前对话状态
        this._dialogState = {
            soupId: '',
            messageDirty: false
        };
    }

    /**
     * 发送普通对话消息
     * @param {Object} params - 消息参数
     * @returns {Promise} - 返回处理后的响应
     */
    async sendMessage(params) {
        try {
            const response = await chatAPI.sendMessage(params);

            // 转换为项目使用的消息格式 {type: 'normal', content: 'xxx'}
            return {
                type: 'normal',
                content: this._formatResponseContent(response)
            };
        } catch (error) {
            console.error('发送消息失败:', error);
            wx.showToast({
                title: '请求失败',
                icon: 'none'
            });
            throw error;
        }
    }

    /**
     * 格式化响应内容
     * @param {Object} response - API返回的原始响应
     * @returns {String} - 格式化后的响应内容
     * @private
     */
    _formatResponseContent(response) {
        // 根据API实际返回格式，提取文本内容
        if (response && typeof response === 'object') {
            if (response.content) return response.content;
            if (response.message) return response.message;
            if (response.text) return response.text;
            if (response.data && response.data.content) return response.data.content;
        }

        // 如果是字符串，直接返回
        if (typeof response === 'string') return response;

        // 最后尝试将整个响应转为字符串
        try {
            return JSON.stringify(response);
        } catch (e) {
            return '收到回复';
        }
    }

    /**
     * 设置当前对话的soupId
     * @param {string} soupId 汤面ID
     */
    setCurrentSoupId(soupId) {
        this._dialogState.soupId = soupId;
    }

    /**
     * 获取当前对话的soupId
     * @returns {string} 当前汤面ID
     */
    getCurrentSoupId() {
        return this._dialogState.soupId;
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
            soupId: '',
            messageDirty: false
        };
    }

    /**
     * 获取存储的对话记录键
     * @param {string} soupId 汤面ID，如果不提供则使用当前soupId
     * @returns {string} 存储键
     */
    getDialogStorageKey(soupId) {
        const id = soupId || this._dialogState.soupId;
        if (!id) return null;
        return `dialog_messages_${id}`;
    }

    /**
     * 保存对话记录
     * @param {string} soupId 汤面ID，如果不提供则使用当前soupId
     * @param {Array} messages 对话消息数组
     * @returns {boolean} 保存是否成功
     */
    saveDialogMessages(soupId, messages) {
        const id = soupId || this._dialogState.soupId;

        if (!id || !messages || !messages.length) {
            console.error('DialogService: 保存对话记录失败: 无效的参数');
            return false;
        }

        // 过滤掉所有system类型的消息
        const filteredMessages = messages.filter(msg => msg.type !== 'system');

        // 如果过滤后没有消息，不保存
        if (filteredMessages.length === 0) {
            return true; // 仅有系统消息情况下，视为成功
        }

        const storageKey = this.getDialogStorageKey(id);

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
     * @param {string} options.soupId 汤面ID，如果不提供则使用当前soupId
     * @param {Function} options.success 成功回调函数，参数为加载的消息数组
     * @param {Function} options.fail 失败回调函数，参数为错误信息
     * @param {Function} options.complete 完成回调函数
     */
    loadDialogMessages(options = {}) {
        let { soupId, success, fail, complete } = options;

        // 如果没有提供soupId，使用当前状态中的soupId
        soupId = soupId || this._dialogState.soupId;

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
     * @param {string} soupId 汤面ID，如果不提供则使用当前soupId
     * @returns {boolean} 删除是否成功
     */
    deleteDialogMessages(soupId) {
        const id = soupId || this._dialogState.soupId;
        if (!id) return false;

        const storageKey = this.getDialogStorageKey(id);
        try {
            wx.removeStorageSync(storageKey);
            return true;
        } catch (error) {
            console.error(`DialogService: 删除对话记录失败:`, error);
            return false;
        }
    }
}

// 导出单例实例
const dialogService = new DialogService();
module.exports = dialogService;
