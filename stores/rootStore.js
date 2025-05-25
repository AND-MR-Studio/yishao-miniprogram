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
    // 按照依赖关系顺序初始化子Store
    // 1. 首先创建基础Store（无依赖）
    this.userStore = new UserStoreClass(this);

    // 2. 创建依赖于userStore的Store
    this.soupStore = new SoupStoreClass(this, this.userStore);
    this.chatStore = new ChatStoreClass(this, this.userStore);
    this.tipStore = new TipStoreClass(this);
    this.uploadStore = new UploadStoreClass(this, this.userStore);

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {

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

  // ===== 跨 Store 数据流控制方法 =====

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