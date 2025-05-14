/**
 * rootStore.js
 * 根存储器 - 实现MobX的RootStore模式
 * 作为所有Store的容器，管理全局共享状态和Store之间的依赖关系
 */
const { makeAutoObservable, flow } = require('mobx-miniprogram');
const userService = require('../service/userService');

// 导入Store类（而非实例）
const { ChatStoreClass } = require('./chatStore');
const { SoupStoreClass } = require('./soupStore');
const { TipStoreClass } = require('./tipStore');

/**
 * RootStore类
 * 管理全局共享状态和所有子Store
 */
class RootStore {
  // ===== 全局共享状态 =====
  // 用户ID - 在根级别管理，所有Store共享
  userId = '';

  // ===== 子Store实例 =====
  chatStore = null;
  soupStore = null;
  tipStore = null;

  // ===== 加载状态 =====
  isLoadingUserId = false;

  constructor() {
    // 初始化子Store，传入this(rootStore)作为参数
    this.chatStore = new ChatStoreClass(this);
    this.soupStore = new SoupStoreClass(this);
    this.tipStore = new TipStoreClass(this);

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      syncUserId: flow,

      // 标记子Store为非观察属性
      chatStore: false,
      soupStore: false,
      tipStore: false
    });

    // 初始化时同步用户ID
    this.syncUserId();
  }

  /**
   * 设置用户ID
   * 直接设置userId，用于外部传入userId
   * @param {string} userId 用户ID
   */
  setUserId(userId) {
    if (userId !== this.userId) {
      this.userId = userId || '';
    }
  }

  /**
   * 同步用户ID
   * 从userService获取最新的userId并更新到store中
   * @returns {Promise<void>}
   */
  *syncUserId() {
    if (this.isLoadingUserId) return;

    try {
      this.isLoadingUserId = true;

      // 获取最新的用户ID
      const userId = yield userService.getUserId();

      // 如果userId发生变化，更新store中的userId
      if (userId !== this.userId) {
        this.userId = userId || '';

        // 如果soupStore有数据，重新获取汤面数据（包括点赞、收藏状态）
        if (this.soupStore.soupData && this.soupStore.soupData.id) {
          yield this.soupStore.fetchSoupDataAndStore(this.soupStore.soupData.id);
        }
      }
    } catch (error) {
      console.error('同步用户ID失败:', error);
    } finally {
      this.isLoadingUserId = false;
    }
  }
}

// 创建单例实例
const rootStore = new RootStore();

module.exports = {
  rootStore
};
