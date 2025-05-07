const { makeAutoObservable, flow } = require('mobx-miniprogram');
const dialogService = require('../utils/dialogService');
const soupService = require('../utils/soupService');
const userService = require('../utils/userService');

// 页面状态常量
const PAGE_STATE = {
  VIEWING: 'viewing',  // 看汤状态
  DRINKING: 'drinking', // 喝汤状态(对话)
  TRUTH: 'truth'       // 汤底状态
};

// 创建汤面Store
class SoupStore {
  // ===== 可观察状态 =====
  // 当前页面状态
  soupState = PAGE_STATE.VIEWING;

  // 核心数据
  soupId = '';      // 当前汤面ID
  dialogId = '';    // 当前对话ID
  userId = '';      // 当前用户ID

  // UI状态
  isPeeking = false; // 是否处于偷看模式

  // 汤面交互状态
  soupData = null;    // 当前汤面数据
  isLiked = false;    // 是否已点赞
  isFavorite = false; // 是否已收藏
  likeCount = 0;      // 点赞数量
  favoriteCount = 0;  // 收藏数量
  viewCount = 0;      // 阅读数量

  constructor() {
    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      startDrinking: flow,
      fetchNextMessage: flow
    });
  }

  // ===== 计算属性 =====
  // 判断当前是否为查看状态
  get isViewing() {
    return this.soupState === PAGE_STATE.VIEWING;
  }

  // 判断当前是否为喝汤状态
  get isDrinking() {
    return this.soupState === PAGE_STATE.DRINKING;
  }

  // 判断当前是否为汤底状态
  get isTruth() {
    return this.soupState === PAGE_STATE.TRUTH;
  }

  // 提示模块是否应该可见
  // 在喝汤状态下且不处于偷看状态时可见，或者在汤底状态下可见
  get shouldShowTip() {
    // 当dialog可见时（即喝汤状态），tipmodule必定可见（除非偷看）
    return (this.soupState === PAGE_STATE.DRINKING && !this.isPeeking) ||
           (this.soupState === PAGE_STATE.TRUTH);
  }

  // 按钮是否应该可见
  // 只要是viewing状态，按钮就可见
  get shouldShowButtons() {
    return this.soupState === PAGE_STATE.VIEWING;
  }

  // 汤面显示组件是否应该可见
  // 在viewing和drinking状态下可见
  get shouldShowSoupDisplay() {
    return this.soupState === PAGE_STATE.VIEWING || this.soupState === PAGE_STATE.DRINKING;
  }

  // 交互底部栏是否应该可见
  // 只要是viewing状态，交互底部栏就可见
  get shouldShowInteractionFooter() {
    return this.soupState === PAGE_STATE.VIEWING;
  }

  // ===== Action方法 =====

  // 页面初始化 - 设置为查看状态
  initViewing(soupId, userId = '') {
    this.soupId = soupId;
    this.dialogId = '';
    this.userId = userId || '';
    this.soupState = PAGE_STATE.VIEWING;
    this.isPeeking = false;

    console.log('初始化查看状态:', { soupId, userId });
  }

  // 更新状态 - 兼容旧代码
  updateState(data) {
    // 更新状态
    if (data.soupState !== undefined) {
      this.soupState = data.soupState;
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

    // 更新UI状态
    if (data.isPeeking !== undefined) {
      this.isPeeking = data.isPeeking;
    }

  }

  // 开始喝汤 - 异步流程
  *startDrinking() {
    if (!this.userId || !this.soupId) {
      console.error('无法开始喝汤: 缺少用户ID或汤面ID');
      return false;
    }

    try {
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
      this.soupState = PAGE_STATE.DRINKING;

      // 立即拉取第一条消息
      yield this.fetchNextMessage();

      return true;
    } catch (error) {
      console.error('开始喝汤失败:', error);
      return false;
    }
  }

  // 获取对话消息 - 异步流程
  *fetchNextMessage() {
    if (this.soupState !== PAGE_STATE.DRINKING || !this.dialogId) {
      return null;
    }

    try {
      // 获取对话消息
      const result = yield dialogService.getDialogMessages(this.dialogId);

      if (!result || !result.messages || result.messages.length === 0) {
        return null;
      }

      // 检查最新消息是否包含进入真相的标记
      const latestMessage = result.messages[result.messages.length - 1];
      if (latestMessage && latestMessage.content && latestMessage.content.includes('TRUTH')) {
        this.soupState = PAGE_STATE.TRUTH;
      }

      return result;
    } catch (error) {
      console.error('获取消息失败:', error);
      return null;
    }
  }

  // 切换到新的汤面
  changeSoup(newSoupId) {
    if (newSoupId === this.soupId) return;

    // 重新初始化为查看状态，但保留用户ID
    this.initViewing(newSoupId, this.userId);
  }

  // 切换到汤底状态
  showTruth() {
    if (this.soupState === PAGE_STATE.TRUTH) return;

    this.soupState = PAGE_STATE.TRUTH;
  }

  // 设置偷看状态
  setPeekingStatus(isPeeking) {
    this.isPeeking = isPeeking;
  }

  // 更新汤面数据
  updateSoupData(soupData) {
    if (!soupData) return;

    this.soupData = soupData;

    // 更新交互状态
    if (soupData.isLiked !== undefined) this.isLiked = soupData.isLiked;
    if (soupData.isFavorite !== undefined) this.isFavorite = soupData.isFavorite;
    if (soupData.likeCount !== undefined) this.likeCount = soupData.likeCount;
    if (soupData.favoriteCount !== undefined) this.favoriteCount = soupData.favoriteCount;
    if (soupData.viewCount !== undefined) this.viewCount = soupData.viewCount;
  }

  // 更新阅读数
  updateViewCount(viewCount) {
    if (viewCount !== undefined && viewCount >= 0) {
      this.viewCount = viewCount;
    }
  }

  // 更新点赞状态
  updateLikeStatus(isLiked, likeCount) {
    if (isLiked !== undefined) this.isLiked = isLiked;
    if (likeCount !== undefined && likeCount >= 0) this.likeCount = likeCount;
  }

  // 更新收藏状态
  updateFavoriteStatus(isFavorite, favoriteCount) {
    if (isFavorite !== undefined) this.isFavorite = isFavorite;
    if (favoriteCount !== undefined && favoriteCount >= 0) this.favoriteCount = favoriteCount;
  }
}

// 创建单例实例
const store = new SoupStore();

module.exports = {
  store,
  PAGE_STATE
};
