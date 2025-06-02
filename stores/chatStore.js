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
    // 保存rootStore和userStore引用
    this.rootStore = rootStore;

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      getChatData: flow,
      fetchMessages: flow,
      sendMessage: flow,

      // 标记为非观察属性
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
  // 判断是否可以发送消息
  get canSendMessage() {
    return this.chatState !== CHAT_STATE.LOADING && this.inputValue.trim().length > 0;
  }

  // 获取最新消息
  get latestMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  // ===== Action方法 =====
  // 设置聊天状态
  setChatState(state) {
    const oldState = this.chatState;
    this.chatState = state;
    
    // 通知tipStore页面状态变化
    if (this.rootStore?.tipStore && state === CHAT_STATE.TRUTH) {
      this.rootStore.tipStore.handlePageStateChange(CHAT_STATE.TRUTH, oldState);
    }
  }

  // 设置偷看状态
  setPeekingStatus(isPeeking) {
    this.isPeeking = isPeeking;
  }

  // 设置输入框的值
  setInputValue(value) {
    this.inputValue = value;
  }
  // ===== 异步方法 =====
    /**
   * 获取聊天数据 - 纯数据获取
   * 参数验证交由service层统一处理，chatStore专注状态管理
   */
  *getChatData(userId, soupId) {
    try {
      this.setChatState(CHAT_STATE.LOADING);

      const chatData = yield dialogService.getChatData(userId, soupId);
      if (!chatData?.dialogId) {
        throw new Error('获取聊天数据失败');
      }

      this.dialogId = chatData.dialogId;
      yield this.fetchMessages();

      return true;
    } catch (error) {
      console.error('获取聊天数据失败:', error);
      return false;
    } finally {
      this.setChatState(CHAT_STATE.DRINKING);
    }
  }

  /**
   * 获取对话消息 - 纯数据获取
   */
  *fetchMessages() {
    if (!this.dialogId) return false;

    try {
      const result = yield dialogService.getDialogMessages(this.dialogId);
      if (!result?.messages) return false;

      this.messages = result.messages;
      
      // 检查是否需要切换到真相状态
      const hasEndMarker = this.messages.some(msg => 
        msg.type === 'system' && msg.content.includes('TRUTH')
      );
      
      if (hasEndMarker) {
        this.setChatState(CHAT_STATE.TRUTH);
      }

      return true;
    } catch (error) {
      console.error('获取消息失败:', error);
      return false;
    }
  }

  /**
   * 发送消息 - 纯接口调用
   */
  *sendMessage(content) {
    if (!content?.trim() || !this.dialogId) return { success: false };

    try {
      this.setChatState(CHAT_STATE.LOADING);

      // 调用服务层新接口签名
      const reply = yield dialogService.sendMessage({
        userId: this.userId,
        dialogId: this.dialogId,
        message: content.trim(),
      });
      if (!reply || !reply.id) return { success: false };

      // 刷新消息列表
      yield this.fetchMessages();

      // 清空输入框
      this.setInputValue('');

      // 计算回复消息在列表中的索引
      const messageIndex = this.messages.findIndex(msg => msg.id === reply.id);
      return { success: true, messageIndex };
    } catch (error) {
      console.error('发送消息失败:', error);
      return { success: false };
    } finally {
      if (this.chatState === CHAT_STATE.LOADING) {
        this.setChatState(CHAT_STATE.DRINKING);
      }
    }
  }
}

// 导出类和常量
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
  ChatStoreClass: ChatStore,
  CHAT_STATE
};
