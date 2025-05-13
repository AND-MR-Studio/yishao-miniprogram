const { makeAutoObservable, flow } = require('mobx-miniprogram');
const dialogService = require('../service/dialogService');

// 聊天状态常量
const CHAT_STATE = {
  DRINKING: 'drinking',  // 喝汤状态(对话)
  TRUTH: 'truth'         // 汤底状态
};

// 创建聊天Store
class ChatStore {
  // ===== 可观察状态 =====
  // 当前聊天状态
  chatState = CHAT_STATE.DRINKING;

  // 核心数据
  soupId = '';      // 当前汤面ID
  dialogId = '';    // 当前对话ID
  userId = '';      // 当前用户ID
  truthSoupId = ''; // 汤底ID

  // UI状态
  isPeeking = false;   // 是否处于偷看模式
  isSending = false;   // 是否正在发送消息
  isReplying = false;  // 是否正在回复
  inputValue = '';     // 输入框的值
  tipVisible = true;   // 提示是否可见

  // 对话数据
  messages = [];       // 对话消息列表

  // 加载状态
  isLoading = false;   // 是否正在加载数据

  constructor() {
    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      createDialog: flow,
      fetchMessages: flow,
      sendMessage: flow
    });
  }

  // ===== 计算属性 =====
  // 判断当前是否为喝汤状态
  get isDrinking() {
    return this.chatState === CHAT_STATE.DRINKING;
  }

  // 判断当前是否为汤底状态
  get isTruth() {
    return this.chatState === CHAT_STATE.TRUTH;
  }

  // 提示模块是否应该可见
  get shouldShowTip() {
    return this.tipVisible && !this.isPeeking;
  }

  // ===== Action方法 =====
  // 更新状态
  updateState(data) {
    // 更新状态
    if (data.chatState !== undefined) {
      this.chatState = data.chatState;
    }

    // 更新数据
    if (data.soupId !== undefined) {
      this.soupId = data.soupId;
    }
    if (data.dialogId !== undefined) {
      this.dialogId = data.dialogId;
    }
    if (data.userId !== undefined) {
      this.userId = data.userId;
    }
    if (data.truthSoupId !== undefined) {
      this.truthSoupId = data.truthSoupId;
    }

    // 更新UI状态
    if (data.isPeeking !== undefined) {
      this.isPeeking = data.isPeeking;
    }
    if (data.isSending !== undefined) {
      this.isSending = data.isSending;
    }
    if (data.isReplying !== undefined) {
      this.isReplying = data.isReplying;
    }
    if (data.inputValue !== undefined) {
      this.inputValue = data.inputValue;
    }
    if (data.tipVisible !== undefined) {
      this.tipVisible = data.tipVisible;
    }

    // 更新对话数据
    if (data.messages !== undefined) {
      this.messages = data.messages;
    }

    // 更新加载状态
    if (data.isLoading !== undefined) {
      this.isLoading = data.isLoading;
    }
  }

  // 设置偷看状态
  setPeekingStatus(isPeeking) {
    this.isPeeking = isPeeking;
  }

  // 设置提示可见性
  setTipVisible(visible) {
    this.tipVisible = visible;
  }

  // 切换到汤底状态
  showTruth(truthSoupId) {
    this.chatState = CHAT_STATE.TRUTH;
    if (truthSoupId) {
      this.truthSoupId = truthSoupId;
    }
  }

  // 创建对话 - 异步流程
  *createDialog() {
    if (!this.userId || !this.soupId) {
      console.error('无法创建对话: 缺少用户ID或汤面ID');
      return false;
    }

    try {
      this.isLoading = true;

      // 先尝试获取用户对话
      let dialogData = yield dialogService.getUserDialog(this.userId, this.soupId);

      // 如果没有对话ID，创建新对话
      if (!dialogData || !dialogData.dialogId) {
        dialogData = yield dialogService.createDialog(this.userId, this.soupId);
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
        this.chatState = CHAT_STATE.TRUTH;
      }

      return true;
    } catch (error) {
      console.error('获取消息失败:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  // 发送消息 - 异步流程
  *sendMessage(content) {
    if (!this.dialogId || !content) {
      return false;
    }

    try {
      this.isSending = true;

      // 发送消息
      const result = yield dialogService.sendMessage(this.dialogId, content);

      if (!result || !result.success) {
        return false;
      }

      // 获取最新消息
      yield this.fetchMessages();

      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      return false;
    } finally {
      this.isSending = false;
    }
  }
}

// 创建单例实例
const chatStore = new ChatStore();

module.exports = {
  chatStore,
  CHAT_STATE
};
