const { makeAutoObservable, flow } = require('mobx-miniprogram');
const dialogService = require('../service/dialogService');

// 聊天状态常量
const CHAT_STATE = {
  DRINKING: 'drinking',  // 喝汤状态(对话)
  TRUTH: 'truth',        // 汤底状态
  LOADING: 'loading'     // 加载状态（包括发送消息、动画等）
};

// 创建聊天Store类
class ChatStore {
  // ===== 可观察状态 =====
  // 当前聊天状态（包含加载状态）
  chatState = CHAT_STATE.DRINKING;

  // 对话数据
  dialogId = '';     // 当前对话ID
  messages = [];       // 对话消息列表

  // UI状态
  isPeeking = false;   // 查看底部汤面
  inputValue = '';     // 输入框的值


  // 引用rootStore和userStore
  rootStore = null;

  constructor(rootStore) {
    this.rootStore = rootStore;
  makeAutoObservable(this, {
      // 标记异步方法为flow - 更新方法名
      initChatData: flow,
      fetchHistory: flow,
      processConversation: flow, // 原来的 handleUserDialog
      clearChatContext: flow,

      rootStore: false,
    });
  }

  // 获取用户ID的计算属性
  get userId() {
    return this.rootStore?.userStore?.userId || '';
  }
  // 从 rootStore 获取汤面数据的计算属性（统一数据访问）
  get soupData() {
    return this.rootStore?.soupData || null;
  }

  // 获取汤面ID的便捷方法（从rootStore统一接口获取）
  get soupId() {
    return this.rootStore?.soupId || '';
  }
  // ===== 计算属性 =====
  // 判断是否可以发送消息 - 基于业务状态
  get canSendMessage() {
    return this.chatState !== CHAT_STATE.LOADING;
  }
  // 获取最新消息
  get latestMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }
  // 检查是否到达真相状态
  get isTruth() {
    return this.messages.some(msg =>
      msg.role === 'assistant' && msg.content.includes('TRUTH')
    );
  }  // ===== Action方法 =====
  /**
   * 设置输入框的值
   * @param {string} value 输入值
   */
  setInputValue(value) {
    this.inputValue = value || '';
  }

  /**
   * 设置聊天状态
   * @param {string} state 聊天状态
   */
  setChatState(state) {
    if (Object.values(CHAT_STATE).includes(state)) {
      this.chatState = state;
    }
  }

  /**
   * 添加用户消息 - 不需要动画
   * @param {string} content 用户消息内容
   */
  addUserMessage(content) {
    if (!content?.trim()) return false;

    this.messages.push({
      role: 'user',
      content: content.trim()
    });

    return true;
  }

  /**
 * 移除最后一条消息 - 用于错误回滚
 */
  removeLastMessage() {
    if (this.messages.length > 0) {
      this.messages.pop();
    }
  }

  /**
   * 检查是否到达真相状态
   */
  checkTruthState() {
    if (this.isTruth) {
      this.setChatState(CHAT_STATE.TRUTH);
    }
  }

  /**
   * 添加AI助手消息 - 需要触发动画
   * @param {string} content AI回复内容
   */
  addAgentMessage(content) {
    if (!content?.trim()) return false;

    this.messages.push({
      role: 'assistant',
      content: content.trim()
    });

    // AI消息添加后，检查是否需要状态切换
    this.checkTruthState();

    return true;
  }

  /**
   * 通用添加消息方法 - 保留用于兼容性（如果需要）
   * @param {string} role 消息角色
   * @param {string} content 消息内容
   * @deprecated 建议使用 addUserMessage 或 addAgentMessage
   */
  addMessage(role, content) {
    if(!content?.trim() || !role) return false;
    // 兼容其他角色（如partner）
    this.messages.push({
      role: role,
      content: content
    });

    return true;
  }

  /**
   * 处理完整的对话流程
   * @param {string} content 用户输入内容
   * @returns {Object} 处理结果
   */
  *processConversation(content) {
    if (!content?.trim() || !this.dialogId) return { success: false };

    try {
      this.setChatState(CHAT_STATE.LOADING);

      // 1. 添加用户消息（不触发动画）
      if (!this.addUserMessage(content.trim())) {
        this.setChatState(CHAT_STATE.DRINKING);
        return { success: false, error: '用户消息添加失败' };
      }

      // 2. 调用 API 发送消息并获取AI回复
      const result = yield dialogService.ConvertUserInput(
        content.trim(),
        this.userId,
        this.dialogId
      );

      if (!result?.success || !result.data) {
        this.removeLastMessage(); // 回滚用户消息
        this.setChatState(CHAT_STATE.DRINKING);
        return { success: false, error: '获取AI回复失败' };
      }

      // 3. 添加AI回复（会自动触发动画和状态检查）
      if (!this.addAgentMessage(result.data.content)) {
        this.removeLastMessage(); // 回滚用户消息
        this.setChatState(CHAT_STATE.DRINKING);
        return { success: false, error: 'AI消息添加失败' };
      }

      // 4. 清空输入框
      this.setInputValue('');      // 保持 LOADING 状态，让动画自动触发和完成
      return { success: true };

    } catch (error) {
      console.error('对话处理失败:', error);
      this.removeLastMessage();
      this.setChatState(CHAT_STATE.DRINKING);
      return { success: false, error: error.message };
    }
  }
  /**
   * 清理对话上下文
   * 删除当前对话的所有消息记录并刷新聊天数据
   * @returns {Promise<boolean>} 清理结果
   */
  *clearChatContext() {
    if (!this.dialogId || !this.userId) {
      console.warn('无法清理对话：缺少对话ID或用户ID');
      return false;
    }
    
    try {
      this.setChatState(CHAT_STATE.LOADING);
      
      // 调用dialogService清理对话数据
      const success = yield dialogService.clearChatContext(this.dialogId, this.userId);
      
      if (success) {
        // 清理本地消息数组
        this.messages = [];
        
        // 重置状态为正常对话状态
        this.setChatState(CHAT_STATE.DRINKING);
        
        console.log('对话上下文清理成功');
        return true;
      } else {
        this.setChatState(CHAT_STATE.DRINKING);
        return false;
      }
    } catch (error) {
      console.error('清理对话上下文失败:', error);
      this.setChatState(CHAT_STATE.DRINKING);
      return false;
    }
  }
}

// 导出类和常量
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
  ChatStoreClass: ChatStore,
  CHAT_STATE
};
