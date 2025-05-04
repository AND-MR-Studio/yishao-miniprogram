const { observable, action } = require('mobx-miniprogram');

// 页面状态常量
const PAGE_STATE = {
  VIEWING: 'viewing',  // 看汤状态
  DRINKING: 'drinking', // 喝汤状态(对话)
  TRUTH: 'truth'       // 汤底状态
};

// 创建汤面Store
const store = observable({
  // ===== 可观察状态 =====
  // 当前页面状态
  soupState: PAGE_STATE.VIEWING,

  // 核心数据
  soupId: '',      // 当前汤面ID
  dialogId: '',    // 当前对话ID
  userId: '',      // 当前用户ID

  // UI状态
  isPeeking: false, // 是否处于偷看模式

  // ===== 计算属性 =====
  // 判断当前是否为查看状态
  get isViewing() {
    return this.soupState === PAGE_STATE.VIEWING;
  },

  // 判断当前是否为喝汤状态
  get isDrinking() {
    return this.soupState === PAGE_STATE.DRINKING;
  },

  // 判断当前是否为汤底状态
  get isTruth() {
    return this.soupState === PAGE_STATE.TRUTH;
  },

  // 提示模块是否应该可见
  // 在喝汤状态下且不处于偷看状态时可见，或者在汤底状态下可见
  get shouldShowTip() {
    // 当dialog可见时（即喝汤状态），tipmodule必定可见（除非偷看）
    return (this.soupState === PAGE_STATE.DRINKING && !this.isPeeking) ||
           (this.soupState === PAGE_STATE.TRUTH);
  },

  // 按钮是否应该可见
  // 只要是viewing状态，按钮就可见
  get shouldShowButtons() {
    return this.soupState === PAGE_STATE.VIEWING;
  },

  // 汤面显示组件是否应该可见
  // 在viewing和drinking状态下可见
  get shouldShowSoupDisplay() {
    return this.soupState === PAGE_STATE.VIEWING || this.soupState === PAGE_STATE.DRINKING;
  },

  // 交互底部栏是否应该可见
  // 只要是viewing状态，交互底部栏就可见
  get shouldShowInteractionFooter() {
    return this.soupState === PAGE_STATE.VIEWING;
  },

  // ===== Action方法 =====
  updateState: action(function (data) {
    // 更新状态
    if (data.soupState !== undefined) {
      this.soupState = data.soupState;
    }

    // 更新数据
    if (data.soupId !== undefined) {
      this.soupId = data.soupId;
    }
    if (data.dialogId !== undefined) {
      this.dialogId = data.dialogId;
    }
    if (data.userId !== undefined) {
      this.userId = data.userId;
    }

    // 更新UI状态
    if (data.isPeeking !== undefined) {
      this.isPeeking = data.isPeeking;
    }

    console.log('状态更新:', data);
  })
});


module.exports = {
  store,
  PAGE_STATE
};
