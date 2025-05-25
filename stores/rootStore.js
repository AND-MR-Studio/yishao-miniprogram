/**
 * rootStore.js
 * 根存储器 - 实现MobX的RootStore模式
 * 作为所有Store的容器，管理全局共享状态和Store之间的依赖关系
 *
 * 优化说明：
 * 1. userInfo 作为 userStore 的引用，避免重复数据
 * 2. 使用 MobX computed 实现响应式数据流
 * 3. 避免循环调用，明确数据流向：userStore -> rootStore
 */
const { makeAutoObservable, flow } = require('mobx-miniprogram');

// 导入Store类（而非实例）
const { ChatStoreClass } = require('./chatStore');
const { SoupStoreClass } = require('./soupStore');
const { TipStoreClass } = require('./tipStore');
const { UploadStoreClass } = require('./uploadStore');
const { UserStoreClass } = require('./userStore');

/**
 * RootStore类
 * 管理全局共享状态和所有子Store
 */
class RootStore {
  // ===== 全局共享状态 =====
  isFirstVisit = false; // 是否首次访问
  showGuide = false; // 是否显示引导层

  // ===== 子Store实例 =====
  chatStore = null;
  soupStore = null;
  tipStore = null;
  uploadStore = null;
  userStore = null;

  constructor() {
    // 初始化子Store，传入this(rootStore)作为参数
    this.chatStore = new ChatStoreClass(this);
    this.soupStore = new SoupStoreClass(this);
    this.tipStore = new TipStoreClass(this);
    this.uploadStore = new UploadStoreClass(this);
    this.userStore = new UserStoreClass(this);

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      syncUserInfo: flow,

      // 子Store不需要标记为非观察属性
      chatStore: false,
      soupStore: false,
      tipStore: false,
      uploadStore: false,
      userStore: false
    });

    // 调用初始化方法
    this.initialize();
  }

  // 初始化方法
  initialize() {
    // 初始化时同步用户信息
    this.syncUserInfo();

    // 检查用户是否首次访问
    this.checkFirstVisit();
  }

  // ===== 计算属性 - 从userStore获取数据，避免重复存储 =====

  /**
   * 用户信息 - 从userStore获取，作为单一数据源
   */
  get userInfo() {
    return this.userStore?.userInfo || null;
  }

  /**
   * 用户ID - 从userStore计算得出
   */
  get userId() {
    return this.userStore?.userId || '';
  }

  /**
   * 登录状态 - 从userStore计算得出
   */
  get isLoggedIn() {
    return this.userStore?.isLoggedIn || false;
  }

  // 用户与汤面交互的方法 - 重构为直接操作模式

  /**
   * 切换点赞状态
   * 直接发起操作请求，后端统一处理状态更新
   * @param {string} soupId - 汤ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async toggleLikeSoup(soupId) {
    if (!this.userStore) {
      return { success: false, error: 'userStore 未初始化' };
    }

    // 获取当前状态
    const currentStatus = this.userStore.isLikedSoup(soupId);
    // 直接发起操作请求
    return await this.userStore.likeSoup(soupId, !currentStatus);
  }

  /**
   * 切换收藏状态
   * 直接发起操作请求，后端统一处理状态更新
   * @param {string} soupId - 汤ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async toggleFavoriteSoup(soupId) {
    if (!this.userStore) {
      return { success: false, error: 'userStore 未初始化' };
    }

    // 获取当前状态
    const currentStatus = this.userStore.isFavoriteSoup(soupId);
    // 直接发起操作请求
    return await this.userStore.favoriteSoup(soupId, !currentStatus);
  }

  /**
   * 标记汤面为已解决
   * 直接发起操作请求，后端统一处理状态更新
   * @param {string} soupId - 汤ID
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async solveSoup(soupId) {
    if (!this.userStore) {
      return { success: false, error: 'userStore 未初始化' };
    }

    return await this.userStore.solveSoup(soupId);
  }

  // 状态查询方法 - 委托给userStore
  isLikedSoup(soupId) {
    return this.userStore?.isLikedSoup(soupId) || false;
  }

  isFavoriteSoup(soupId) {
    return this.userStore?.isFavoriteSoup(soupId) || false;
  }

  isSolvedSoup(soupId) {
    return this.userStore?.isSolvedSoup(soupId) || false;
  }

  /**
   * 同步用户信息 - 委托给userStore，避免循环调用
   * 这是对外的统一接口，内部委托给userStore处理
   */
  *syncUserInfo() {
    if (!this.userStore) {
      console.warn('userStore 未初始化');
      return { success: false, error: 'userStore 未初始化' };
    }

    try {
      return yield this.userStore.syncUserInfo();
    } catch (error) {
      console.error('rootStore.syncUserInfo 调用失败:', error);
      return { success: false, error: '同步用户信息失败' };
    }
  }

  /**
   * 检查用户是否首次访问
   * 使用wx.getStorageSync检查本地存储中是否有首次访问标记
   */
  checkFirstVisit() {
    try {
      // 从本地存储中获取首次访问标记
      const hasVisited = wx.getStorageSync('hasVisitedSoupPage');

      // 如果没有访问记录，则设置为首次访问
      if (!hasVisited) {
        this.isFirstVisit = true;
        this.showGuide = true;
        console.log('首次访问，显示引导层');
      } else {
        console.log('非首次访问，不显示引导层');
      }
    } catch (error) {
      console.error('检查首次访问状态失败:', error);
      // 出错时默认不显示引导
      this.isFirstVisit = false;
      this.showGuide = false;
    }
  }

  /**
   * 统一的引导层控制方法
   * 合并原有的closeGuide、showGuideManually方法
   * @param {boolean} show - true表示显示引导，false表示隐藏引导
   */
  toggleGuide(show) {
    if (show) {
      // 显示引导层
      this.showGuide = true;
      console.log('显示引导层');
    } else {
      // 隐藏引导层并保存访问记录
      try {
        wx.setStorageSync('hasVisitedSoupPage', true);
        console.log('已保存访问记录');
      } catch (error) {
        console.error('保存访问记录失败:', error);
      }

      this.showGuide = false;
      console.log('隐藏引导层');
    }
  }

}

// 创建单例实例
const rootStore = new RootStore();

module.exports = {
  rootStore
};