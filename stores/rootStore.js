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
    this.settingStore = new SettingStoreClass(this);

    // 2. 创建依赖于userStore的Store
    this.soupStore = new SoupStoreClass(this);
    this.chatStore = new ChatStoreClass(this);
    this.tipStore = new TipStoreClass(this);
    this.uploadStore = new UploadStoreClass(this);

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
}

// 创建单例实例
const rootStore = new RootStore();

module.exports = {
  rootStore
};