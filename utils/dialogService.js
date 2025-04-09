/**
 * 对话服务类
 * 处理对话数据的本地存储与加载
 */
const soupService = require('./soupService');

class DialogService {
    constructor() {
        // 存储当前对话状态
        this._dialogState = {
            messageDirty: false
        };
        
        // 预设的回复选项
        this._defaultReplies = [
            '是', 
            '否', 
            '不确定'
        ];
    }

    /**
     * 生成一个简单的回复
     * @returns {Object} 回复消息对象
     */
    generateReply() {
        // 随机选择一个预设回复
        const randomIndex = Math.floor(Math.random() * this._defaultReplies.length);
        const replyContent = this._defaultReplies[randomIndex];
        
        return {
            type: 'normal',
            content: replyContent
        };
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
            messageDirty: false
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
}

// 导出单例实例
const dialogService = new DialogService();
module.exports = dialogService;
