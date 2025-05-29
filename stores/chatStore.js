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
    return this.chatState !== CHAT_STATE.LOADING;
  }

  // 获取最新消息（统一的消息获取逻辑）
  get latestMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  // ===== Action方法 =====
  // 统一的加载状态管理
  setLoadingState() {
    this.chatState = CHAT_STATE.LOADING;
  }

  // 恢复到喝汤状态
  restoreChatState() {
    this.chatState = CHAT_STATE.DRINKING;
  }

  // 设置偷看状态
  setPeekingStatus(isPeeking) {
    this.isPeeking = isPeeking;
  }

  // 设置输入框的值
  setInputValue(value) {
    this.inputValue = value;
  }

  // 切换到汤底状态
  showTruth() {
    const oldState = this.chatState;
    this.chatState = CHAT_STATE.TRUTH;

    // 通知tipStore页面状态已变化
    if (this.rootStore && this.rootStore.tipStore) {
      this.rootStore.tipStore.handlePageStateChange(CHAT_STATE.TRUTH, oldState);
    }
  }



  // 获取聊天数据 - 异步流程
  *getChatData(userId, soupId) {
    if (!userId || !soupId) {
      console.error('无法获取聊天数据: 缺少用户ID或汤面ID');
      return false;
    }

    try {
      this.setLoadingState();

      // 调用dialogService的getChatData方法
      const chatData = yield dialogService.getChatData(userId, soupId);

      if (!chatData || !chatData.dialogId) {
        throw new Error('无法获取聊天数据');
      }

      // 设置dialogId
      this.dialogId = chatData.dialogId;

      // 自动获取历史消息
      yield this.fetchMessages();

      return true;
    } catch (error) {
      console.error('获取聊天数据失败:', error);
      return false;
    } finally {
      this.restoreChatState();
    }
  }

  // 获取对话消息 - 异步流程
  *fetchMessages() {
    try {
      // 如果当前不是加载状态，则设置加载状态
      if (this.chatState !== CHAT_STATE.LOADING) {
        this.setLoadingState();
      }

      // 获取对话消息
      const result = yield dialogService.getDialogMessages(this.dialogId);

      if (!result || !result.messages) {
        return false;
      }

      // 更新消息列表
      this.messages = result.messages;

      // 检查最新消息是否包含进入真相的标记
      if ('TRUTH') {
        this.chatState = CHAT_STATE.TRUTH;

      }

      return true;
    } catch (error) {
      console.error('获取消息失败:', error);
      return false;
    } 
    
  }



  // 发送消息 - 统一的异步流程
  *sendMessage(content) {
  }
}

// 导出类和常量
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
  ChatStoreClass: ChatStore,
  CHAT_STATE
};
