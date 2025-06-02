/**
 * settingStore.js
 * 设置状态管理 - 管理用户设置、引导层状态等
 * 
 * 职责范围：
 * 1. 引导层状态管理（从rootStore迁移）
 * 2. 用户设置管理（音效、震动等）
 * 3. 设置面板状态管理
 */
const { makeAutoObservable, flow } = require('mobx-miniprogram');

// 默认设置配置
const DEFAULT_SETTINGS = {
  soundOn: true,
  vibrationOn: false
};

/**
 * SettingStore类
 * 管理应用设置和引导状态
 */
class SettingStore {
  // ===== 引导层相关状态 =====
  isFirstVisit = false; // 是否首次访问
  showGuide = false; // 是否显示引导层

  // ===== 用户设置状态 =====
  soundOn = DEFAULT_SETTINGS.soundOn; // 音效开关
  vibrationOn = DEFAULT_SETTINGS.vibrationOn; // 震动开关

  // ===== 设置面板状态 =====
  showSettingPanel = false; // 是否显示设置面板

  // ===== 加载状态 =====
  loading = {
    settings: false, // 设置加载状态
    guide: false // 引导状态加载
  };
  constructor() {
    makeAutoObservable(this, {
      // 标记异步方法为flow
      loadSettings: flow,
      saveSettings: flow,
      clearChatContext: flow,

      // 标记为非观察属性
      // 无需标记，所有属性都是可观察的
    });

    // 初始化设置
    this.initialize();
  }

  // ===== 初始化方法 =====

  /**
   * 初始化设置store
   */
  initialize() {
    // 检查首次访问状态
    this.checkFirstVisit();
    // 加载用户设置
    this.loadSettings();
  }

  // ===== 引导层管理方法 =====

  /**
   * 检查用户是否首次访问
   * 使用wx.getStorageSync检查本地存储中是否有首次访问标记
   */  checkFirstVisit() {
    try {
      // 直接使用存储键名，简化代码
      const hasVisited = wx.getStorageSync('hasVisitedSoupPage');

      // 如果没有访问记录，则设置为首次访问
      if (!hasVisited) {
        this.isFirstVisit = true;
        this.showGuide = true;
        console.log('首次访问，显示引导层');
      } else {
        this.isFirstVisit = false;
        this.showGuide = false;
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
      console.log('显示引导层');    } else {
      // 隐藏引导层并保存访问记录
      try {
        wx.setStorageSync('hasVisitedSoupPage', true);
        console.log('已保存访问记录');
      } catch (error) {
        console.error('保存访问记录失败:', error);
      }

      this.showGuide = false;
      this.isFirstVisit = false;
      console.log('隐藏引导层');
    }
  }

  // ===== 用户设置管理方法 =====

  /**
   * 加载用户设置
   * 从本地存储读取用户设置并更新状态
   */  *loadSettings() {
    try {
      this.setLoading('settings', true);
      
      const settings = wx.getStorageSync('soupSettings') || {};
      
      // 合并默认设置和用户设置
      this.soundOn = settings.soundOn ?? DEFAULT_SETTINGS.soundOn;
      this.vibrationOn = settings.vibrationOn ?? DEFAULT_SETTINGS.vibrationOn;
      
      console.log('用户设置加载成功:', { soundOn: this.soundOn, vibrationOn: this.vibrationOn });
    } catch (error) {
      console.error('加载用户设置失败:', error);
      // 加载失败时使用默认设置
      this.soundOn = DEFAULT_SETTINGS.soundOn;
      this.vibrationOn = DEFAULT_SETTINGS.vibrationOn;
    } finally {
      this.setLoading('settings', false);
    }
  }

  /**
   * 保存用户设置
   * 将当前设置状态保存到本地存储
   */  *saveSettings() {
    try {
      this.setLoading('settings', true);
      
      const settings = {
        soundOn: this.soundOn,
        vibrationOn: this.vibrationOn
      };
      
      wx.setStorageSync('soupSettings', settings);
      console.log('用户设置保存成功:', settings);
    } catch (error) {
      console.error('保存用户设置失败:', error);
    } finally {
      this.setLoading('settings', false);
    }
  }

  /**
   * 切换音效设置
   * @param {boolean} enabled - 是否启用音效
   */
  toggleSound(enabled) {
    this.soundOn = enabled;
    // 自动保存设置
    this.saveSettings();
  }

  /**
   * 切换震动设置
   * @param {boolean} enabled - 是否启用震动
   */
  toggleVibration(enabled) {
    this.vibrationOn = enabled;
    // 自动保存设置
    this.saveSettings();
  }

  // ===== 设置面板管理方法 =====

  /**
   * 切换设置面板显示状态
   * @param {boolean} show - 是否显示设置面板
   */
  toggleSettingPanel(show) {
    this.showSettingPanel = show;
  }

  // ===== 工具方法 =====

  /**
   * 设置加载状态
   * @param {string} type - 加载类型
   * @param {boolean} status - 加载状态
   */
  setLoading(type, status) {
    if (this.loading.hasOwnProperty(type)) {
      this.loading[type] = status;
    }
  }
  /**
   * 重置所有设置为默认值
   */
  resetToDefault() {
    this.soundOn = DEFAULT_SETTINGS.soundOn;
    this.vibrationOn = DEFAULT_SETTINGS.vibrationOn;
    this.saveSettings();
  }

  // ===== 导航功能管理方法 =====

  /**
   * 处理联系我们功能
   * 统一管理联系我们的逻辑
   */
  handleContact() {
    // 可以在这里添加联系方式选择弹窗或直接跳转客服
    console.log('联系我们功能');
    wx.showToast({
      title: '功能开发中...',
      icon: 'none',
      duration: 1500
    });
  }

  /**
   * 处理关于我们功能
   * 统一管理关于页面的跳转逻辑
   */
  handleAbout() {
    wx.navigateTo({
      url: '/pages/about/about',
      fail: (err) => {
        console.error('导航到关于页面失败:', err);
        wx.showToast({
          title: '跳转失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  }

  /**
   * 处理显示引导功能
   * 统一管理引导层的显示逻辑
   */
  handleShowGuide() {
    this.toggleGuide(true);
  }

  // ===== 聊天功能管理方法 =====

  /**
   * 清理对话上下文
   * 从chat页面迁移而来，现在统一在settingStore中管理
   * @param {string} dialogId - 对话ID
   * @param {string} userId - 用户ID
   */
  *clearChatContext(dialogId, userId) {
    try {
      if (!dialogId || !userId) {
        throw new Error('缺少必要参数：dialogId 或 userId');
      }      // 导入dialogService来处理清理逻辑
      const dialogService = require('../service/dialogService');
      
      // 使用dialogService清空对话消息
      yield dialogService.saveDialogMessages(dialogId, userId, []);

      // 导入chatStore来刷新消息
      const { chatStore } = require('./index');
      yield chatStore.getChatData(userId, chatStore.soupId);

      // 显示成功提示
      wx.showToast({
        title: '对话已清理',
        icon: 'success',
        duration: 1500
      });

      console.log('对话上下文清理成功');
      return true;
    } catch (error) {
      console.error('清理上下文失败:', error);
      
      // 显示错误提示
      wx.showToast({
        title: '清理失败，请重试',
        icon: 'none',
        duration: 2000
      });
      
      return false;
    }
  }

  // ===== 计算属性 =====

  /**
   * 获取当前设置对象
   */
  get currentSettings() {
    return {
      soundOn: this.soundOn,
      vibrationOn: this.vibrationOn
    };
  }

  /**
   * 检查是否有任何加载状态
   */
  get isLoading() {
    return Object.values(this.loading).some(status => status);
  }
}

// 导出Store类
module.exports = {
  SettingStoreClass: SettingStore,
  DEFAULT_SETTINGS
};
