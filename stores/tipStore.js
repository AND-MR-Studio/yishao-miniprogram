/**
 * tipStore.js
 * 提示信息状态管理
 * 使用MobX管理提示信息的状态，替代eventUtils事件机制
 *
 * 重构说明：
 * 1. 所有业务逻辑集中在Store中管理
 * 2. tip-box组件转变为纯展示组件，只负责渲染和动画
 * 3. 使用枚举管理状态，简化状态分支
 */
const { makeAutoObservable } = require('mobx-miniprogram');

/**
 * 提示框配置
 */
const tipConfig = {
  // 默认提示内容
  defaultTitle: '汤来了！我是陪你熬夜猜谜的小勺🌙',
  defaultContent: [
    '只答是、否、不确定，别想套我话哦～',
    '长按汤面就浮出来咯！'
  ],

  // 特殊提示内容
  specialTip: {
    title: '小提示',
    content: ['你再多问问，', '说不定我也会给你点提示~嘿嘿'],
    autoHideDelay: 3000 // 3秒后自动隐藏
  },

  // 闲置提示内容
  idleTip: {
    title: '小提示',
    content: ['侦探大人，还在烧脑吗~','cpu别烧坏咯。'],
    autoHideDelay: 0 // 不自动隐藏
  },

  // 祝贺提示内容
  congratulationTip: {
    title: '🎉 推理成功！',
    // 内容在运行时动态生成
    autoHideDelay: 0 // 不自动隐藏
  },

  // 时间配置（毫秒）
  timing: {
    idleTimeout: 10000, // 10秒无操作后显示闲置提示
    contentSwitchDelay: 1000, // 内容切换动画时间
    specialTipTriggerCount: 5 // 发送5条消息后触发特殊提示
  }
};

// 提示状态枚举
const TIP_STATE = {
  HIDDEN: 'HIDDEN',           // 隐藏状态
  DEFAULT: 'DEFAULT',         // 默认提示
  SPECIAL: 'SPECIAL',         // 特殊提示（连续发送消息后）
  IDLE: 'IDLE',               // 闲置提示
  CONGRATULATION: 'CONGRATS', // 祝贺提示（猜对汤底）
  TRANSITIONING: 'TRANSIT'    // 过渡状态（内容切换中）
};

// 创建提示信息Store类
class TipStore {
  // ===== 可观察状态 =====
  // 当前提示状态
  state = TIP_STATE.HIDDEN;

  // 提示内容
  title = tipConfig.defaultTitle;
  content = tipConfig.defaultContent;

  // 用户消息计数
  messageCount = 0;

  // 自动隐藏计时器ID
  _autoHideTimer = null;

  // 闲置计时器ID
  _idleTimer = null;

  // 引用rootStore
  rootStore = null;

  constructor(rootStore) {
    // 保存rootStore引用
    this.rootStore = rootStore;

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记为非观察属性
      _autoHideTimer: false,
      _idleTimer: false,
      rootStore: false,
    });
  }

  // 获取用户ID的计算属性
  get userId() {
    return this.rootStore?.userStore?.userId || '';
  }

  // 提示可见性计算属性
  get visible() {
    return this.state !== TIP_STATE.HIDDEN;
  }

  // 是否正在切换内容
  get isSwitchingContent() {
    return this.state === TIP_STATE.TRANSITIONING;
  }

  // 是否显示闲置提示
  get showingIdleTip() {
    return this.state === TIP_STATE.IDLE;
  }

  // ===== Action方法 =====
  /**
   * 显示提示
   * @param {string} title 提示标题
   * @param {string[]} content 提示内容数组
   * @param {number} autoHideDelay 自动隐藏延迟时间（毫秒），0表示不自动隐藏
   * @param {string} newState 新的提示状态，默认为DEFAULT
   */
  showTip(title, content, autoHideDelay = 0, newState = TIP_STATE.DEFAULT) {
    // 清除可能存在的自动隐藏计时器
    this.clearAutoHideTimer();

    // 更新提示内容
    if (title) {
      this.title = title;
    }

    if (content && Array.isArray(content)) {
      this.content = content;
    }

    // 更新状态
    this.state = newState;

    // 如果设置了自动隐藏延迟，启动自动隐藏计时器
    if (autoHideDelay > 0) {
      this._autoHideTimer = setTimeout(() => {
        this.hideTip();
      }, autoHideDelay);
    }
  }

  /**
   * 隐藏提示
   */
  hideTip() {
    // 清除自动隐藏计时器
    this.clearAutoHideTimer();

    // 隐藏提示
    this.state = TIP_STATE.HIDDEN;

    // 重置提示内容为默认值
    this.resetTipContent();
  }

  /**
   * 重置提示内容为默认值
   */
  resetTipContent() {
    this.title = tipConfig.defaultTitle;
    this.content = tipConfig.defaultContent;
  }

  /**
   * 设置默认提示内容
   * @param {string} title 默认提示标题
   * @param {string[]} content 默认提示内容数组
   */
  setDefaultTip(title, content) {
    // 注意：不再修改默认值，因为它们现在来自配置
    // 只更新当前显示的内容（如果处于默认状态）
    if (this.state === TIP_STATE.DEFAULT || this.state === TIP_STATE.HIDDEN) {
      if (title) {
        this.title = title;
      }

      if (content && Array.isArray(content)) {
        this.content = content;
      }
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
   * @param {Object} _ 用户消息对象（当前未使用）
   */
  trackUserMessage(_) {
    // 重置闲置计时器
    this.resetIdleTimer();

    // 增加消息计数
    this.messageCount++;

    // 如果连续发送了指定条数消息，显示特殊提示
    if (this.messageCount === tipConfig.timing.specialTipTriggerCount) {
      this.showSpecialTip();
    }
  }

  /**
   * 显示特殊提示（连续发送消息后）
   */
  showSpecialTip() {
    // 如果正在过渡状态，不执行
    if (this.state === TIP_STATE.TRANSITIONING) return;

    // 标记为过渡状态
    this.state = TIP_STATE.TRANSITIONING;

    // 显示特殊提示
    this.showTip(
      tipConfig.specialTip.title,
      tipConfig.specialTip.content,
      tipConfig.specialTip.autoHideDelay,
      TIP_STATE.SPECIAL
    );

    // 动画完成后重置状态
    setTimeout(() => {
      // 如果当前仍然是特殊提示，保持状态不变
      // 否则可能已经被其他提示覆盖，不需要修改
      if (this.state === TIP_STATE.SPECIAL) {
        this.state = TIP_STATE.DEFAULT;
      }
    }, tipConfig.timing.contentSwitchDelay);
  }

  /**
   * 启动闲置计时器
   */
  startIdleTimer() {
    this.clearIdleTimer();
    this._idleTimer = setTimeout(() => {
      // 指定秒数无操作后显示闲置提示
      this.showIdleTip();
    }, tipConfig.timing.idleTimeout);
  }

  /**
   * 重置闲置计时器
   */
  resetIdleTimer() {
    // 如果正在显示闲置提示，恢复默认提示
    if (this.state === TIP_STATE.IDLE) {
      this.state = TIP_STATE.DEFAULT;
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
    // 如果正在过渡状态，不执行
    if (this.state === TIP_STATE.TRANSITIONING) return;

    // 显示闲置提示
    this.showTip(
      tipConfig.idleTip.title,
      tipConfig.idleTip.content,
      tipConfig.idleTip.autoHideDelay,
      TIP_STATE.IDLE
    );
  }

  /**
   * 显示祝贺提示（猜对汤底）
   */
  showCongratulationTip() {
    // 如果正在过渡状态，不执行
    if (this.state === TIP_STATE.TRANSITIONING) return;

    // 构建祝贺消息
    const congratsMessage = [
      '恭喜你！喝到了汤底！',
      `只推理了${this.messageCount}次就猜对啦，佩服佩服~`
    ];

    // 显示祝贺提示
    this.showTip(
      tipConfig.congratulationTip.title,
      congratsMessage,
      tipConfig.congratulationTip.autoHideDelay,
      TIP_STATE.CONGRATULATION
    );
  }

  /**
   * 处理页面状态变化
   * 当页面状态变为truth时，显示祝贺消息
   * @param {string} newState 新的页面状态
   * @param {string} oldState 旧的页面状态
   */
  handlePageStateChange(newState, oldState) {
    if (newState === 'truth' && oldState !== 'truth') {
      this.showCongratulationTip();
    }
  }
}

// 导出类、枚举和配置
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
  TipStoreClass: TipStore,
  TIP_STATE,
  tipConfig
};
