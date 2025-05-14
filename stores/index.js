/**
 * stores/index.js
 * 统一导出所有Store实例
 * 简化导入，提供向后兼容性
 */
const { rootStore } = require('./rootStore');
const { CHAT_STATE } = require('./chatStore');

// 导出rootStore及其所有子Store
module.exports = {
  // 导出rootStore及其方法
  rootStore,
  userId: rootStore.userId,
  syncUserId: rootStore.syncUserId.bind(rootStore),
  setUserId: rootStore.setUserId.bind(rootStore),

  // 导出子Store，提供向后兼容性
  soupStore: rootStore.soupStore,
  chatStore: rootStore.chatStore,
  tipStore: rootStore.tipStore,

  // 导出常量
  CHAT_STATE
};
