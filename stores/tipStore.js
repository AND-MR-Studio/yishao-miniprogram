/**
 * tipStore.js
 * 提示信息状态管理（简化版本）
 *
 * 重构说明：
 * 1. 简化业务逻辑，专注于UI状态管理
 * 2. 通过chatStore获取消息状态，不单独计算
 * 3. 使用MobX的响应式特性自动更新UI
 */
const { makeAutoObservable } = require('mobx-miniprogram');

/**
 * 提示框配置
 */
const tipConfig = {
  // 默认提示内容
  defaultTip: {
    title: '汤来了！我是陪你熬夜猜谜的小勺🌙',
    content: [
      '只答是、否、不确定，别想套我话哦～',
      '长按汤面就浮出来咯！'
    ]
  },

  // 特殊提示内容
  specialTip: {
    title: '小提示',
    content: ['你再多问问，', '说不定我也会给你点提示~嘿嘿']
  },

  // 闲置提示内容
  idleTip: {
    title: '小提示',
    content: ['侦探大人，还在烧脑吗~', 'cpu别烧坏咯。']
  },
  // 祝贺提示内容
  congratulationTip: {
    title: '🎉 推理成功！',
    content: [
      '恭喜你！喝到了汤底！',
      '佩服佩服~'
    ]
  },

  // 时间配置（毫秒）
  timing: {
    idleTimeout: 10000, // 10秒无操作后显示闲置提示
    specialTipTriggerCount: 5 // 发送5条消息后触发特殊提示
  }
};

// 提示状态枚举
const TIP_STATE = {
  HIDDEN: 'HIDDEN',           // 隐藏状态
  DEFAULT: 'DEFAULT',         // 默认提示
  SPECIAL: 'SPECIAL',         // 特殊提示（连续发送消息后）
  IDLE: 'IDLE',               // 闲置提示
  CONGRATULATION: 'CONGRATS'  // 祝贺提示（猜对汤底）
};

// 创建提示信息Store类
class TipStore {  // ===== 可观察状态 =====
  isIdleState = false;        // 是否处于闲置状态

  // 引用rootStore
  rootStore = null;

  constructor(rootStore) {
    // 保存rootStore引用
    this.rootStore = rootStore;
    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      rootStore: false,
    });
  }
  // ===== 计算属性 =====
  // 获取用户ID - 通过rootStore统一访问
  get userId() {
    return this.rootStore?.userStore?.userId || '';
  }

  // 获取chatStore引用
  get chatStore() {
    return this.rootStore?.chatStore;
  }

  // 从chatStore获取用户消息数量
  get userMessageCount() {
    return this.chatStore?.userMessages?.length || 0;
  }
  // 从chatStore获取游戏状态
  get isChatCompleted() {
    return this.chatStore?.chatState === 'truth';
  }
  // 计算当前应该显示的状态
  get tipState() {
    // 如果在偷看状态，返回隐藏状态
    if (this.chatStore?.isPeeking) {
      return TIP_STATE.HIDDEN;
    }

    // 推理完成时显示祝贺
    if (this.isChatCompleted) {
      return TIP_STATE.CONGRATULATION;
    }

    // 如果处于闲置状态，显示闲置提示
    if (this.isIdleState) {
      return TIP_STATE.IDLE;
    }

    // 发送消息数量达到阈值时显示特殊提示
    if (this.userMessageCount >= tipConfig.timing.specialTipTriggerCount) {
      return TIP_STATE.SPECIAL;
    }

    // 默认状态
    return TIP_STATE.DEFAULT;
  }
  // 当前提示标题
  get title() {
    const state = this.tipState;

    switch (state) {
      case TIP_STATE.CONGRATULATION:
        return tipConfig.congratulationTip.title;
      case TIP_STATE.SPECIAL:
        return tipConfig.specialTip.title;
      case TIP_STATE.IDLE:
        return tipConfig.idleTip.title;
      case TIP_STATE.DEFAULT:
      default:
        return tipConfig.defaultTip.title;
    }
  }

  // 当前提示内容
  get content() {
    const state = this.tipState;

    switch (state) {
      case TIP_STATE.CONGRATULATION:
        return tipConfig.congratulationTip.content;
      case TIP_STATE.SPECIAL:
        return tipConfig.specialTip.content;
      case TIP_STATE.IDLE:
        return tipConfig.idleTip.content;
      case TIP_STATE.DEFAULT:
      default:
        return tipConfig.defaultTip.content;
    }
  }  // 提示可见性
  get visible() {
    return this.tipState !== TIP_STATE.HIDDEN;
  }
  // ===== 动作方法 =====

  // 设置闲置状态
  setIdleState(isIdle) {
    this.isIdleState = !!isIdle;
  }

  // 重置用户活动（清除闲置状态）
  resetUserActivity() {
    this.isIdleState = false;
  }
}

// 导出类、枚举和配置
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
  TipStoreClass: TipStore,
  TIP_STATE,
  tipConfig
};
