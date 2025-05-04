const { observable, action } = require('mobx-miniprogram');

// 页面状态常量
const PAGE_STATE = {
  VIEWING: 'viewing',  // 看汤状态
  DRINKING: 'drinking', // 喝汤状态(对话)
  TRUTH: 'truth'       // 汤底状态
};

// 创建汤面Store
const soupStore = observable({
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
  // 切换页面状态
  switchSoupState: action(function(state) {
    this.soupState = state;
  }),

  // 设置汤面ID
  setSoupId: action(function(id) {
    this.soupId = id;
  }),

  // 设置对话ID
  setDialogId: action(function(id) {
    this.dialogId = id;
  }),

  // 设置用户ID
  setUserId: action(function(id) {
    this.userId = id;
  }),

  // 更新所有核心数据
  updateSoupData: action(function(data) {
    if (data.soupId !== undefined) this.soupId = data.soupId;
    if (data.dialogId !== undefined) this.dialogId = data.dialogId;
    if (data.userId !== undefined) this.userId = data.userId;
    if (data.soupState !== undefined) this.soupState = data.soupState;
  })
});

// 使用CommonJS语法导出模块
module.exports = {
  soupStore,
  PAGE_STATE
};
