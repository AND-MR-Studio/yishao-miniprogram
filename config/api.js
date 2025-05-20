/**
 * API接口定义
 * 根据最新的接口契约进行配置
 * 简化版本 - 只返回soupId
 */
const App = getApp();
const baseUrl = App.globalData.config.baseUrl;
const ysUrl = App.globalData.config.ysUrl;
const memoryUrl = App.globalData.config.memory;
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
} = require('../utils/request');

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
    update: ysUrl + paths.user + 'update',
    info: ysUrl + paths.user + 'info',
    signin: ysUrl + paths.user + 'signin',
    list: ysUrl + paths.user + 'list',
    viewedSoup: ysUrl + paths.user + 'viewed-soup',
    answeredSoup: ysUrl + paths.user + 'answered-soup',
    createdSoup: ysUrl + paths.user + 'created-soup',
    favoriteSoup: ysUrl + paths.user + 'favorite-soup',
    likedSoup: ysUrl + paths.user + 'liked-soup',
    solvedSoup: ysUrl + paths.user + 'solved-soup'
  },

  // 资源服务
  asset: {
    base: ysUrl + paths.asset,
    list: ysUrl + paths.asset + 'all',
    byType: ysUrl + paths.asset + 'type/',
    avatar: ysUrl + paths.asset + 'avatar/',
    upload: ysUrl + paths.asset + 'upload'
  },

  // 海龟汤服务
  soup: {
    base: memoryUrl + paths.soup,
    random: memoryUrl + '/api/soups/random',
    get: (soupId) => `${memoryUrl}/api/soups/${soupId}`,
    view: (soupId) => `${memoryUrl}/api/soups/${soupId}/view`,
    like: (soupId) => `${memoryUrl}/api/soups/${soupId}/like`,
    unlike: (soupId) => `${memoryUrl}/api/soups/${soupId}/unlike`,
    favorite: (soupId) => `${memoryUrl}/api/soups/${soupId}/favor`,
    unfavorite: (soupId) => `${memoryUrl}/api/soups/${soupId}/unfavor`,
    create: memoryUrl + '/api/soups/create',
    map: memoryUrl + paths.soup + 'map'
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
    chat: 'https://m1.apifoxmock.com/m1/6036386-5726220-default/agent/yishao/chat'
  }
};

  // 默认资源
 const defaults = {
    avatar: '/static/images/default-avatar.jpg',
    shareImage: 'https://and-tech.cn/uploads/images/78e17666-0671-487e-80bc-a80c0b8d0e07.png'
}

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

  defaults
};