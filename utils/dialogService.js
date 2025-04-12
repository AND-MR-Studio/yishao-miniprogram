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
        
        // 特殊关键词处理
        this._specialKeywords = {
            '汤底': this._handleSoupBottomKeyword.bind(this),
            '提示': this._handleHintKeyword.bind(this)
        };
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
        return [...initialMessages, ...(messages || [])];
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

    /**
     * 处理用户输入的消息
     * @param {string} content 用户输入的内容
     * @param {Array} currentMessages 当前消息列表
     * @returns {Object} 处理结果 {isSpecial: boolean, messages: Array, reply: Object|null}
     */
    handleUserInput(content) {
        if (!content || !content.trim()) {
            return {
                isSpecial: false,
                messages: null,
                reply: null
            };
        }
        
        const trimmedContent = content.trim();
        
        // 检查是否为特殊关键词
        if (this._specialKeywords[trimmedContent]) {
            return this._specialKeywords[trimmedContent](trimmedContent);
        }
        
        // 不是特殊关键词，返回普通处理结果
        return {
            isSpecial: false,
            messages: null,
            reply: this.generateReply()
        };
    }
    
    /**
     * 处理"汤底"关键词
     * @param {string} content 用户输入内容
     * @returns {Object} 处理结果
     * @private
     */
    _handleSoupBottomKeyword(content) {
        // 创建用户消息
        const userMessage = {
            type: 'user',
            content: content
        };
        
        // 创建特殊回复
        const systemMessage = {
            type: 'system',
            content: '你喝到了汤底'
        };
        
        return {
            isSpecial: true,
            userMessage: userMessage,
            reply: systemMessage
        };
    }
    
    /**
     * 处理"提示"关键词
     * @param {string} content 用户输入内容
     * @returns {Object} 处理结果
     * @private
     */
    _handleHintKeyword(content) {
        // 创建用户消息
        const userMessage = {
            type: 'user',
            content: content
        };
        
        // 创建提示回复
        const hintMessage = {
            type: 'hint',
            content: '这是一段很长的提示文字，用来测试打字机动画效果。这段文字包含了一些标点符号，比如逗号、句号。还有一些感叹号！问号？以及其他标点符号；冒号：破折号——等等。这些标点符号会有不同的停顿时间，让打字机效果更加自然。'
        };
        
        return {
            isSpecial: true,
            userMessage: userMessage,
            reply: hintMessage
        };
    }
    
    /**
     * 发送消息并获取回复（模拟API请求）
     * @param {Object} params 请求参数
     * @returns {Promise<Object>} 回复消息的Promise
     */
    sendMessage(params) {
        return new Promise((resolve) => {
            const reply = this.generateReply();
            resolve(reply);
        });
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
}

// 导出单例实例
const dialogService = new DialogService();
module.exports = dialogService;
