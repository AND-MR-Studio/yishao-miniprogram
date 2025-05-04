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

  // ===== Action方法 =====
  // 使用单一的updateState方法来管理状态，避免多种action定义导致的错误
  updateState: action(function(data) {
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

    console.log('状态更新:', data);
  })
});

// 使用CommonJS语法导出模块
module.exports = {
  store,
  PAGE_STATE
};
