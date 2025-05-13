/**
 * API接口定义
 * 根据最新的接口契约进行配置
 * 简化版本 - 只返回soupId
 */
const App = getApp();
const baseUrl = App.globalData.config.baseUrl;
const ysUrl = App.globalData.config.ysUrl;
const {
  request,
  requestOpen,
  soupRequest,
  dialogRequest,
  userRequest,
  assetRequest,
  assetRequestOpen,
  uploadFile,
  agentRequest
} = require('./request');

// 基础路径
const paths = {
  user: 'user/',
  soup: 'soup/',
  dialog: 'dialog/',
  asset: 'asset/'
};

// API端点定义
const api = {
  // 用户服务
  user: {
    login: ysUrl + paths.user + 'login',
    update: ysUrl + paths.user + 'update', // 统一的用户更新接口，包含交互功能
    info: ysUrl + paths.user + 'info',
    signin: ysUrl + paths.user + 'signin'
  },

  // 资源服务
  asset: {
    base: ysUrl + paths.asset,
    avatar: ysUrl + paths.asset + 'avatar/'
  },

  // 海龟汤服务
  soup: {
    base: ysUrl + paths.soup,
    random: ysUrl + paths.soup + 'random',
    view: ysUrl + paths.soup + 'view',
    like: ysUrl + paths.soup + 'like',
    favorite: ysUrl + paths.soup + 'favorite',
    map: ysUrl + paths.soup + 'map'
  },

  // 对话服务
  dialog: {
    base: ysUrl + paths.dialog,
    create: ysUrl + paths.dialog + 'create',
    list: ysUrl + paths.dialog + 'list',
    byUser: ysUrl + paths.dialog + 'user/',
    bySoup: ysUrl + paths.dialog + 'soup/'
  },

  // Agent服务
  agent: {
    chat: 'https://yavin.and-tech.cn/agent/yishao/chat'
  }
};

// 默认资源
const defaults = {
  avatar: '/static/images/default-avatar.jpg'
};

module.exports = {
  // 导出请求方法
  request,
  requestOpen,
  soupRequest,
  dialogRequest,
  userRequest,
  assetRequest,
  assetRequestOpen,
  uploadFile,
  agentRequest,

  // 导出基础URL
  baseUrl,
  ysUrl,

  // 导出API端点
  api,

  // 导出默认资源
  defaults,
};