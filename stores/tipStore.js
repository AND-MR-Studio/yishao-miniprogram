/**
 * tipStore.js
 * 提示信息状态管理
 * 使用MobX管理提示信息的状态，替代eventUtils事件机制
 */
const { makeAutoObservable } = require('mobx-miniprogram');

// 创建提示信息Store
class TipStore {
  // ===== 可观察状态 =====
  // 提示可见性
  visible = false;

  // 提示内容
  title = '汤来了！我是陪你熬夜猜谜的小勺🌙';
  content = [
    '只答是、否、不确定，别想套我话哦～',
    '长按汤面就浮出来咯！'
  ];

  // 默认提示内容 - 用于重置
  defaultTitle = '汤来了！我是陪你熬夜猜谜的小勺🌙';
  defaultContent = [
    '只答是、否、不确定，别想套我话哦～',
    '长按汤面就浮出来咯！'
  ];

  // 用户消息计数
  messageCount = 0;

  // 是否正在切换内容
  isSwitchingContent = false;

  // 是否显示闲置提示
  showingIdleTip = false;

  // 自动隐藏计时器ID
  _autoHideTimer = null;

  // 闲置计时器ID
  _idleTimer = null;

  constructor() {
    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记为非观察属性
      _autoHideTimer: false,
      _idleTimer: false,
    });
  }

  // ===== Action方法 =====
  /**
   * 显示提示
   * @param {string} title 提示标题
   * @param {string[]} content 提示内容数组
   * @param {number} autoHideDelay 自动隐藏延迟时间（毫秒），0表示不自动隐藏
   * @param {boolean} syncWithChatStore 是否同步状态到chatStore
   */
  showTip(title, content, autoHideDelay = 0, syncWithChatStore = false) {
    // 清除可能存在的自动隐藏计时器
    this.clearAutoHideTimer();

    // 更新提示内容
    if (title) {
      this.title = title;
    }

    if (content && Array.isArray(content)) {
      this.content = content;
    }

    // 显示提示
    this.visible = true;

    // 同步状态到chatStore
    if (syncWithChatStore && require) {
      try {
        const { chatStore } = require('./chatStore');
        if (chatStore && typeof chatStore.setTipVisible === 'function') {
          chatStore.setTipVisible(true);
        }
      } catch (error) {
        console.error('同步状态到chatStore失败:', error);
      }
    }

    // 如果设置了自动隐藏延迟，启动自动隐藏计时器
    if (autoHideDelay > 0) {
      this._autoHideTimer = setTimeout(() => {
        this.hideTip(syncWithChatStore);
      }, autoHideDelay);
    }
  }

  /**
   * 隐藏提示
   * @param {boolean} syncWithChatStore 是否同步状态到chatStore
   */
  hideTip(syncWithChatStore = false) {
    // 清除自动隐藏计时器
    this.clearAutoHideTimer();

    // 隐藏提示
    this.visible = false;

    // 同步状态到chatStore
    if (syncWithChatStore && require) {
      try {
        const { chatStore } = require('./chatStore');
        if (chatStore && typeof chatStore.setTipVisible === 'function') {
          chatStore.setTipVisible(false);
        }
      } catch (error) {
        console.error('同步状态到chatStore失败:', error);
      }
    }

    // 重置提示内容为默认值
    this.resetTipContent();
  }

  /**
   * 重置提示内容为默认值
   */
  resetTipContent() {
    this.title = this.defaultTitle;
    this.content = this.defaultContent;
  }

  /**
   * 设置默认提示内容
   * @param {string} title 默认提示标题
   * @param {string[]} content 默认提示内容数组
   */
  setDefaultTip(title, content) {
    if (title) {
      this.defaultTitle = title;
    }

    if (content && Array.isArray(content)) {
      this.defaultContent = content;
    }

    // 如果当前没有显示自定义提示，也更新当前提示内容
    if (!this.visible) {
      this.resetTipContent();
    }
  }

  /**
   * 清除自动隐藏计时器
   */
  clearAutoHideTimer() {
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = null;
    }
  }

  /**
   * 跟踪用户消息
   * 增加消息计数，并在达到特定条件时显示特殊提示
   * @param {Object} message 用户消息对象
   */
  trackUserMessage(message) {
    // 重置闲置计时器
    this.resetIdleTimer();

    // 增加消息计数
    this.messageCount++;

    // 如果连续发送了5条消息，显示特殊提示
    if (this.messageCount === 5) {
      this.showSpecialTip();
    }
  }

  /**
   * 显示特殊提示（连续发送5条消息后）
   */
  showSpecialTip() {
    // 如果正在切换内容，不执行
    if (this.isSwitchingContent) return;

    // 标记正在切换内容
    this.isSwitchingContent = true;

    // 显示特殊提示，并同步到chatStore
    this.showTip('小提示', ['你再多问问，', '说不定我也会给你点提示~嘿嘿'], 3000, true);

    // 动画完成后重置状态
    setTimeout(() => {
      this.isSwitchingContent = false;
    }, 1000);
  }

  /**
   * 启动闲置计时器
   */
  startIdleTimer() {
    this.clearIdleTimer();
    this._idleTimer = setTimeout(() => {
      // 10秒无操作后显示闲置提示
      this.showIdleTip();
    }, 10000); // 10秒
  }

  /**
   * 重置闲置计时器
   */
  resetIdleTimer() {
    // 如果正在显示闲置提示，恢复默认提示
    if (this.showingIdleTip) {
      this.resetTipContent();
    }

    // 重置计时器
    this.clearIdleTimer();
    this.startIdleTimer();
  }

  /**
   * 清除闲置计时器
   */
  clearIdleTimer() {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }

  /**
   * 显示闲置提示
   */
  showIdleTip() {
    // 如果正在切换内容，不执行
    if (this.isSwitchingContent) return;

    // 标记正在显示闲置提示
    this.showingIdleTip = true;

    // 显示闲置提示，并同步到chatStore
    this.showTip('小提示', ['侦探大人，还在烧脑吗~','cpu别烧坏咯。'], 0, true);
  }

  /**
   * 显示祝贺提示（猜对汤底）
   */
  showCongratulationTip() {
    // 如果正在切换内容，不执行
    if (this.isSwitchingContent) return;

    // 构建祝贺消息
    const congratsMessage = [
      '恭喜你！喝到了汤底！',
      `只推理了${this.messageCount}次就猜对啦，佩服佩服~`
    ];

    // 显示祝贺提示，并同步到chatStore
    this.showTip('🎉 推理成功！', congratsMessage, 0, true);
  }
}

// 创建单例实例
const tipStore = new TipStore();

module.exports = {
  tipStore
};
