/**
 * stores/index.js
 * 统一导出所有Store实例
 * 简化导入，提供向后兼容性
 */
const { rootStore } = require('./rootStore');
const { CHAT_STATE } = require('./chatStore');
const { TIP_STATE, tipConfig } = require('./tipStore');

// 导出rootStore及其所有子Store
module.exports = {
  // 导出rootStore及其方法
  rootStore,
  userId: rootStore.userId,
  syncUserId: rootStore.syncUserId.bind(rootStore),

  // 导出子Store，提供向后兼容性
  soupStore: rootStore.soupStore,
  chatStore: rootStore.chatStore,
  tipStore: rootStore.tipStore,
  uploadStore: rootStore.uploadStore,

  // 导出常量
  CHAT_STATE,
  TIP_STATE,
  tipConfig
};
