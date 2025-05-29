/**
 * rootStore.js
 * 根存储器 - 实现MobX的RootStore模式
 * 作为所有Store的容器，管理Store之间的依赖关系
 *
 * 重构说明：
 * 1. 专注于Store实例管理和依赖关系协调
 * 2. 移除具体业务逻辑，让UI组件直接调用对应的具体Store方法
 * 3. 确保数据流向：UI → 具体Store → Service
 */
const { makeAutoObservable } = require('mobx-miniprogram');

// 导入Store类（而非实例）
const { ChatStoreClass } = require('./chatStore');
const { SoupStoreClass } = require('./soupStore');
const { TipStoreClass } = require('./tipStore');
const { UploadStoreClass } = require('./uploadStore');
const { UserStoreClass } = require('./userStore');
const { SettingStoreClass } = require('./settingStore');

/**
 * RootStore类
 * 专注于Store实例管理和依赖关系协调
 */
class RootStore {
  // ===== 子Store实例 =====
  chatStore = null;
  soupStore = null;
  tipStore = null;
  uploadStore = null;
  userStore = null;
  settingStore = null;

  constructor() {
    // 按照依赖关系顺序初始化子Store
    // 1. 首先创建基础Store（无依赖）
    this.userStore = new UserStoreClass(this);
    this.settingStore = new SettingStoreClass();

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
      userStore: false,
      settingStore: false
    });
  }

  // ===== 计算属性 - 提供对子Store的便捷访问 =====

  /**
   * 获取用户ID - 从userStore获取
   */
  get userId() {
    return this.userStore?.userId || '';
  }

  /**
   * 获取登录状态 - 从userStore获取
   */
  get isLoggedIn() {
    return this.userStore?.isLoggedIn || false;
  }

  /**
   * 获取用户信息 - 从userStore获取
   */
  get userInfo() {
    return this.userStore?.userInfo || null;
  }

  /**
   * 获取引导层显示状态 - 从settingStore获取
   */
  get showGuide() {
    return this.settingStore?.showGuide || false;
  }
  /**
   * 获取首次访问状态 - 从settingStore获取
   */
  get isFirstVisit() {
    return this.settingStore?.isFirstVisit || false;
  }

  // ===== 汤面数据统一访问接口 =====
  
  /**
   * 获取当前汤面数据 - 从soupStore获取
   */
  get soupData() {
    return this.soupStore?.soupData || null;
  }

  /**
   * 获取当前汤面ID - 从soupData中提取
   */
  get soupId() {
    return this.soupData?.id || '';
  }

  /**
   * 获取汤面加载状态 - 从soupStore获取
   */
  get soupLoading() {
    return this.soupStore?.soupLoading || false;
  }

  // ===== 聊天数据统一访问接口 =====
  
  /**
   * 获取当前对话ID - 从chatStore获取
   */
  get dialogId() {
    return this.chatStore?.dialogId || '';
  }

  /**
   * 获取聊天状态 - 从chatStore获取
   */
  get chatState() {
    return this.chatStore?.chatState || 'drinking';
  }

  /**
   * 获取消息列表 - 从chatStore获取
   */
  get messages() {
    return this.chatStore?.messages || [];
  }

}

// 创建单例实例
const rootStore = new RootStore();

module.exports = {
  rootStore
};