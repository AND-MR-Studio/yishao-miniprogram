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
  // 注意：syncUserInfo 已移除，请直接使用 rootStore.userStore.syncUserInfo()

  // 导出子Store，提供向后兼容性
  soupStore: rootStore.soupStore,
  chatStore: rootStore.chatStore,
  tipStore: rootStore.tipStore,
  uploadStore: rootStore.uploadStore,
  userStore: rootStore.userStore, // 添加 userStore 的直接导出
  settingStore: rootStore.settingStore, // 添加 settingStore 的直接导出

  // 导出常量
  CHAT_STATE,
  TIP_STATE,
  tipConfig
};