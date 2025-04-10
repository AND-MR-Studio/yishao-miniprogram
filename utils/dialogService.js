/**
 * 对话服务类
 * 处理对话数据的本地存储与加载
 */
const soupService = require('./soupService');

class DialogService {
    constructor() {
        // 存储当前对话状态
        this._dialogState = {
            messageDirty: false,
            userQuestionCount: 0,
            lastInteractionTime: Date.now() // 确保初始化时有有效值
        };
        
        // 预设的回复选项
        this._defaultReplies = [
            '是', 
            '否', 
            '不确定'
        ];
        
        // 仔细思考提示 - 每三次提问显示
        this._thirdQuestionHints = [
            '仔细思考汤面中出现的人物',
            '思考一下事件发生的顺序',
            '尝试从不同角度理解汤面中的场景'
        ];
        
        // 长时间未提问提示
        this._idleHints = [
            '还在思考吗？不妨换个角度提问试试～'
        ];
        
        // 上次显示空闲提示的时间
        this._lastIdleHintTime = 0;
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
     * 更新用户问题计数器并检查是否需要生成提示
     * @param {Array} messages 当前消息列表
     * @returns {Object|null} 提示消息对象，如果不需要提示则返回null
     */
    updateQuestionCountAndCheckHint(messages) {
        // 递增问题计数
        this._dialogState.userQuestionCount += 1;
        // 更新交互时间
        this._dialogState.lastInteractionTime = Date.now();
        
        // 检查是否每三次问题后需要显示提示
        if (this._dialogState.userQuestionCount % 3 === 0) {
            // 随机选择一条提示消息
            const randomIndex = Math.floor(Math.random() * this._thirdQuestionHints.length);
            const hintContent = this._thirdQuestionHints[randomIndex];
            
            // 返回提示消息对象
            return {
                type: 'hint',
                content: hintContent,
                style: 'color: #4CAF50;' // 绿色文本样式
            };
        }
        
        // 不需要提示
        return null;
    }
    
    /**
     * 检查是否长时间未提问并生成提示
     * @param {Array} messages 当前消息列表
     * @param {boolean} forceCheck 是否强制检查
     * @returns {Object|null} 提示消息对象，如果不需要提示则返回null
     */
    checkIdleAndGenerateHint(messages, forceCheck = false) {
        // 获取当前时间
        const now = Date.now();
        const lastInteraction = this._dialogState.lastInteractionTime;
        const idleTime = now - lastInteraction;
        
        // 距离上次显示提示的时间间隔（确保不会过于频繁显示提示）
        const timeSinceLastHint = now - this._lastIdleHintTime;
        
        console.log('检查空闲状态:', {
            idleTime: Math.floor(idleTime / 1000) + '秒',
            timeSinceLastHint: Math.floor(timeSinceLastHint / 1000) + '秒',
            messagesCount: messages.length,
            forceCheck
        });
        
        // 判断条件：
        // 1. 有足够的消息（超过4条初始系统消息）
        // 2. 空闲时间超过45秒
        // 3. 距离上次提示超过2分钟
        // 4. 或者强制检查
        if ((
             messages.length > 4 && 
             idleTime > 45000 && 
             timeSinceLastHint > 120000
           ) || forceCheck) {
            // 更新最后提示时间
            this._lastIdleHintTime = now;
            
            // 随机选择一条提示消息
            const randomIndex = Math.floor(Math.random() * this._idleHints.length);
            const hintContent = this._idleHints[randomIndex];
            
            console.log('显示空闲提示:', hintContent);
            
            // 返回提示消息对象
            return {
                type: 'hint',
                content: hintContent,
                style: 'color: #4CAF50;' // 绿色文本样式
            };
        }
        
        // 不需要提示
        return null;
    }

    /**
     * 强制生成空闲提示（用于测试）
     * @returns {Object} 提示消息对象
     */
    forceIdleHint() {
        // 随机选择一条提示消息
        const randomIndex = Math.floor(Math.random() * this._idleHints.length);
        const hintContent = this._idleHints[randomIndex];
        
        // 记录提示时间
        this._lastIdleHintTime = Date.now();
        
        // 返回提示消息对象
        return {
            type: 'hint',
            content: hintContent,
            style: 'color: #4CAF50;' // 绿色文本样式
        };
    }

    /**
     * 重置问题计数和交互时间
     * @param {number} count 初始计数，默认为0
     */
    resetQuestionCount(count = 0) {
        this._dialogState.userQuestionCount = count;
        this._dialogState.lastInteractionTime = Date.now();
        this._lastIdleHintTime = 0; // 重置上次提示时间
    }
    
    /**
     * 更新最后交互时间
     */
    updateInteractionTime() {
        this._dialogState.lastInteractionTime = Date.now();
    }
    
    /**
     * 获取当前用户问题计数
     * @returns {number} 问题计数
     */
    getUserQuestionCount() {
        return this._dialogState.userQuestionCount;
    }
    
    /**
     * 设置用户问题计数
     * @param {number} count 问题计数
     */
    setUserQuestionCount(count) {
        if (typeof count === 'number' && count >= 0) {
            this._dialogState.userQuestionCount = count;
        }
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
            userQuestionCount: 0,
            lastInteractionTime: Date.now()
        };
        this._lastIdleHintTime = 0; // 重置上次提示时间
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
            
            // 计算用户问题数量并更新计数器
            const userMessageCount = messages.filter(msg => msg.type === 'user').length;
            this.setUserQuestionCount(userMessageCount);
            
            // 重置交互时间和提示时间
            this.updateInteractionTime();
            this._lastIdleHintTime = 0;

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
            // 重置对话状态
            this.resetDialogState();
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
