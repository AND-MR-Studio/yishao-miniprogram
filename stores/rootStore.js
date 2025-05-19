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

  // 用户登录状态
  isLoggedIn = false;

  // 上次检查的token
  lastCheckedToken = '';

  // ===== 子Store实例 =====
  chatStore = null;
  soupStore = null;
  tipStore = null;

  // ===== 加载状态 =====
  isLoadingUserId = false;
  isMonitoringLoginStatus = false;

  constructor() {
    // 初始化子Store，传入this(rootStore)作为参数
    this.chatStore = new ChatStoreClass(this);
    this.soupStore = new SoupStoreClass(this);
    this.tipStore = new TipStoreClass(this);

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      monitorLoginStatus: flow,

      // syncUserId现在是普通方法，不需要标记为flow
      syncUserId: false,

      // 标记子Store为非观察属性
      chatStore: false,
      soupStore: false,
      tipStore: false,
      lastCheckedToken: false
    });

    // 初始化时同步用户ID
    this.syncUserId();

    // 启动登录状态监听
    this.monitorLoginStatus();
  }

  // 移除setUserId方法，userId只应通过syncUserId方法更新

  /**
   * 同步用户ID
   * 从userService获取最新的userId并更新到store中
   * 同时支持generator函数(MobX flow)和Promise(async/await)
   * @returns {Promise<void>}
   */
  syncUserId() {
    // 如果已经在加载中，直接返回一个resolved的Promise
    if (this.isLoadingUserId) return Promise.resolve();

    // 创建generator函数，供MobX flow使用
    const generator = function* () {
      try {
        this.isLoadingUserId = true;

        // 获取最新的用户ID
        const userId = yield userService.getUserId();

        // 检查登录状态
        const token = wx.getStorageSync(userService.TOKEN_KEY);
        const currentLoginStatus = !!token;

        // 更新登录状态
        if (this.isLoggedIn !== currentLoginStatus) {
          this.isLoggedIn = currentLoginStatus;
        }

        // 如果userId发生变化，更新store中的userId
        if (userId !== this.userId) {
          this.userId = userId || '';

          // 如果soupStore有数据，重新获取汤面数据（包括点赞、收藏状态）
          if (this.soupStore.soupData && this.soupStore.soupData.id) {
            yield this.soupStore.fetchSoup(this.soupStore.soupData.id);
          }
        }
      } catch (error) {
        console.error('同步用户ID失败:', error);
      } finally {
        this.isLoadingUserId = false;
      }
    }.bind(this);

    // 执行generator并返回Promise
    const iterator = generator();

    // 手动执行generator并返回Promise
    return new Promise((resolve) => {
      function step(value) {
        let result;
        try {
          result = iterator.next(value);
        } catch (e) {
          console.error('执行syncUserId失败:', e);
          this.isLoadingUserId = false;
          resolve(); // 即使出错也resolve，避免阻塞调用链
          return;
        }

        if (result.done) {
          resolve();
          return;
        }

        // 处理yield返回的Promise
        Promise.resolve(result.value).then(step, (err) => {
          console.error('syncUserId中的异步操作失败:', err);
          this.isLoadingUserId = false;
          resolve(); // 即使出错也resolve，避免阻塞调用链
        });
      }

      step = step.bind(this);
      step();
    });
  }

  /**
   * 监听用户登录状态变化
   * 定期检查token是否发生变化，如有变化则同步用户ID
   * @returns {Promise<void>}
   */
  *monitorLoginStatus() {
    // 防止重复启动监听
    if (this.isMonitoringLoginStatus) return;

    this.isMonitoringLoginStatus = true;

    try {
      while (true) {
        // 获取当前token
        const currentToken = wx.getStorageSync(userService.TOKEN_KEY) || '';

        // 如果token发生变化，同步用户ID
        if (currentToken !== this.lastCheckedToken) {
          this.lastCheckedToken = currentToken;
          // 由于syncUserId现在返回Promise，我们需要使用yield等待它完成
          yield this.syncUserId();
        }

        // 每2秒检查一次登录状态
        yield new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('监听登录状态失败:', error);
      this.isMonitoringLoginStatus = false;

      // 如果监听失败，延迟后重新启动
      setTimeout(() => {
        this.monitorLoginStatus();
      }, 5000);
    }
  }


}

// 创建单例实例
const rootStore = new RootStore();

module.exports = {
  rootStore
};
