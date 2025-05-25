const { makeAutoObservable, flow } = require('mobx-miniprogram');
const dialogService = require('../service/dialogService');
const soupService = require('../service/soupService');

// 聊天状态常量
const CHAT_STATE = {
  DRINKING: 'drinking',  // 喝汤状态(对话)
  TRUTH: 'truth'         // 汤底状态
};

// 创建聊天Store类
class ChatStore {
  // ===== 可观察状态 =====
  // 当前聊天状态
  chatState = CHAT_STATE.DRINKING;

  // 核心数据
  soupId = '';       // 当前汤面ID（不再存储完整soupData）
  dialogId = '';     // 当前对话ID
  soupData = null;   // 当前汤面数据（从soupService获取）

  // UI状态
  isPeeking = false;   // 是否处于偷看模式
  isSending = false;   // 是否正在发送消息
  isAnimating = false; // 是否正在执行动画（包含回复动画）
  inputValue = '';     // 输入框的值

  // 对话数据
  messages = [];       // 对话消息列表

  // 加载状态
  isLoading = false;   // 是否正在加载数据

  // 引用rootStore和userStore
  rootStore = null;
  userStore = null;

  constructor(rootStore, userStore) {
    // 保存rootStore和userStore引用
    this.rootStore = rootStore;
    this.userStore = userStore;

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      createDialog: flow,
      fetchMessages: flow,
      sendMessage: flow,
      fetchSoupForChat: flow,

      // 标记为非观察属性
      rootStore: false,
      userStore: false
    });
  }

  // 获取用户ID的计算属性
  get userId() {
    return this.userStore?.userId || '';
  }

  // 不再需要soupData的计算属性，因为我们现在直接在chatStore中存储soupData

  // ===== 计算属性 =====
  // 判断当前是否为喝汤状态
  get isDrinking() {
    return this.chatState === CHAT_STATE.DRINKING;
  }

  // 判断当前是否为汤底状态
  get isTruth() {
    return this.chatState === CHAT_STATE.TRUTH;
  }

  // 判断是否可以发送消息
  get canSendMessage() {
    return !this.isSending && !this.isAnimating;
  }

  // 获取最新消息
  get latestMessage() {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  // 获取最新消息索引
  get latestMessageIndex() {
    return this.messages.length - 1;
  }

  // ===== Action方法 =====
  // 更新基本状态 - 简化版，只保留实际使用的部分
  updateState(data) {
    // 直接更新提供的属性
    Object.keys(data).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = data[key];
      }
    });
  }

  // 设置偷看状态
  setPeekingStatus(isPeeking) {
    this.isPeeking = isPeeking;
  }

  // 设置输入框的值
  setInputValue(value) {
    this.inputValue = value;
  }

  // 设置动画状态
  setAnimatingStatus(isAnimating) {
    this.isAnimating = isAnimating;
  }

  // 设置发送状态
  setSendingStatus(isSending) {
    this.isSending = isSending;
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

  /**
   * 获取汤面数据 - 异步流程
   * 专门为chat页面设计的汤面数据获取方法
   * 使用soupStore的fetchSoup方法获取数据
   * @param {string} soupId 汤面ID
   * @returns {Promise<Object>} 汤面数据
   */
  *fetchSoupForChat(soupId) {
    if (!soupId) {
      console.error("获取汤面数据失败: 缺少汤面ID");
      return null;
    }

    try {
      // 设置加载状态
      this.isLoading = true;

      // 使用soupStore的fetchSoup方法获取汤面数据
      // 设置incrementViews为false，避免重复增加阅读数
      const soupData = yield this.rootStore.soupStore.fetchSoup(soupId, false);

      if (!soupData) {
        console.error("获取汤面数据失败: 服务返回空数据");
        return null;
      }

      // 更新chatStore中的汤面数据
      this.soupData = soupData;
      this.soupId = soupData.id;

      return soupData;
    } catch (error) {
      console.error("获取汤面数据失败:", error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  // 创建对话 - 异步流程
  *createDialog() {
    // 使用当前soupId
    const soupId = this.soupId;

    if (!this.userId || !soupId) {
      console.error('无法创建对话: 缺少用户ID或汤面ID');
      return false;
    }

    try {
      this.isLoading = true;

      // 先尝试获取用户对话
      let dialogData = yield dialogService.getUserDialog(this.userId, soupId);

      // 如果没有对话ID，创建新对话
      if (!dialogData || !dialogData.dialogId) {
        dialogData = yield dialogService.createDialog(this.userId, soupId);
      }

      if (!dialogData || !dialogData.dialogId) {
        throw new Error('无法获取对话ID');
      }

      // 更新状态
      this.dialogId = dialogData.dialogId;

      // 获取对话消息
      yield this.fetchMessages();

      return true;
    } catch (error) {
      console.error('创建对话失败:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  // 获取对话消息 - 异步流程
  *fetchMessages() {
    if (!this.dialogId) {
      return false;
    }

    try {
      this.isLoading = true;

      // 获取对话消息
      const result = yield dialogService.getDialogMessages(this.dialogId);

      if (!result || !result.messages) {
        return false;
      }

      // 更新消息列表
      this.messages = result.messages;

      // 检查最新消息是否包含进入真相的标记
      const latestMessage = this.messages[this.messages.length - 1];
      if (latestMessage && latestMessage.content && latestMessage.content.includes('TRUTH')) {
        const oldState = this.chatState;
        this.chatState = CHAT_STATE.TRUTH;

        // 通知tipStore页面状态已变化
        if (this.rootStore && this.rootStore.tipStore) {
          this.rootStore.tipStore.handlePageStateChange(CHAT_STATE.TRUTH, oldState);
        }
      }

      return true;
    } catch (error) {
      console.error('获取消息失败:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }



  // 发送消息 - 统一的异步流程
  *sendMessage(content) {
    if (!this.dialogId || !content) {
      return false;
    }

    try {
      this.isSending = true;

      // 创建用户消息对象
      const userMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: content,
        timestamp: Date.now()
      };

      // 先将用户消息添加到消息列表
      this.messages = [...this.messages, userMessage];

      // 使用Agent API
      const agentService = require('../service/agentService');

      // 构建历史消息数组
      const historyMessages = this.messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // 调用Agent API
      const response = yield agentService.sendAgent({
        messages: historyMessages,
        soup: this.soupData, // 直接使用chatStore中的soupData
        userId: this.userId,
        dialogId: this.dialogId,
        saveToCloud: true
      });

      // 创建回复消息
      const replyMessage = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        status: 'sent',
        timestamp: response.timestamp
      };

      // 添加回复消息到消息列表
      this.messages = [...this.messages, replyMessage];

      return {
        success: true,
        messageIndex: this.messages.length - 1
      };
    } catch (error) {
      console.error('发送消息失败:', error);
      return { success: false };
    } finally {
      this.isSending = false;
    }
  }
}

// 导出类和常量
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
  ChatStoreClass: ChatStore,
  CHAT_STATE
};
