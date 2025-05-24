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
const { UploadStoreClass } = require('./uploadStore');
const { UserStoreClass } = require('./userStore'); // 引入 UserStore

/**
 * RootStore类
 * 管理全局共享状态和所有子Store
 */
class RootStore {
  // ===== 全局共享状态 =====
  userInfo = null; // 用户信息
  isFirstVisit = false; // 是否首次访问
  showGuide = false; // 是否显示引导层

  // ===== 子Store实例 =====
  chatStore = null;
  soupStore = null;
  tipStore = null;
  uploadStore = null;
  userStore = null; // 新增 userStore 实例

  constructor() {
    // 初始化子Store，传入this(rootStore)作为参数
    this.chatStore = new ChatStoreClass(this);
    this.soupStore = new SoupStoreClass(this);
    this.tipStore = new TipStoreClass(this);
    this.uploadStore = new UploadStoreClass(this);
    this.userStore = new UserStoreClass(this); // 实例化 UserStore

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 只标记异步方法为flow
      syncUserInfo: flow,

      // 子Store不需要标记为非观察属性（默认不会被观察）
      chatStore: false,
      soupStore: false,
      tipStore: false,
      uploadStore: false,
      userStore: false // userStore 不需要标记为非观察属性
    });

    // 调用初始化方法
    this.initialize();
  }

  // 新增初始化方法
  initialize() {
    // 初始化时同步用户信息
    this.syncUserInfo();

    // 检查用户是否首次访问
    this.checkFirstVisit();
  }

  // 用户ID计算属性
  get userId() {
    return this.userInfo?.id || '';
  }

  // 登录状态计算属性
  get isLoggedIn() {
    return !!this.userId;
  }

  // 设置用户信息
  setUserInfo(info) {
    this.userInfo = info;
  }

  // 用户与汤面交互的方法
  async isLikedSoup(soupId) {
    return await userService.isLikedSoup(soupId);
  }
  
  async isFavoriteSoup(soupId) {
    return await userService.isFavoriteSoup(soupId);
  }
  
  async toggleLikeSoup(soupId) {
    return await userService.toggleLikeSoup(soupId);
  }
  
  async toggleFavoriteSoup(soupId) {
    return await userService.toggleFavoriteSoup(soupId);
  }

  /**
   * 同步用户信息
   * 从userService获取最新的用户信息并更新到store中
   * @returns {Promise<void>}
   */
  *syncUserInfo() {
    try {
      // 获取最新的用户信息
      const userInfo = yield userService.getUserInfo();
      
      // 更新用户信息（如果从服务器获取成功，则覆盖本地的）
      this.userInfo = userInfo;
    } catch (error) {
      console.error('同步用户信息失败:', error);
      // 如果网络请求失败，但本地有数据，则保留本地数据，否则置为null
      if (!this.userInfo) {
        this.userInfo = null;
      }
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
   * 关闭引导层
   * 设置本地存储，标记用户已访问过
   */
  closeGuide() {
    // 设置本地存储，标记用户已访问过
    try {
      wx.setStorageSync('hasVisitedSoupPage', true);
      console.log('已保存访问记录');
    } catch (error) {
      console.error('保存访问记录失败:', error);
    }

    // 隐藏引导层
    this.showGuide = false;
  }

  /**
   * 手动显示引导层
   * 不修改isFirstVisit标志，只显示引导层
   */
  showGuideManually() {
    // 显示引导层
    this.showGuide = true;
    console.log('手动显示引导层');
  }

}

// 创建单例实例
const rootStore = new RootStore();

module.exports = {
  rootStore
};