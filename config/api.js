/**
 * API接口定义
 * 根据最新的接口契约进行配置
 * 简化版本 - 只返回soupId
 */
const App = getApp();
const baseUrl = App.globalData.config.baseUrl;
const ysUrl = App.globalData.config.ysUrl;
const memoryUrl = App.globalData.config.memory;
const assetsBaseUrl = App.globalData.config.assetsBaseUrl;

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
  // API路径
  api: {
    user: 'user/',
    soup: 'soup/',
    dialog: 'dialog/',
    asset: 'asset/'
  },
  // 资源文件路径
  assets: {
    images: 'images/',
    fonts: 'fonts/',
    icons: 'icons/',
    avatars: 'avatars/',
    ui: 'ui/'
  }
};

// API端点定义
const api = {
  // 用户服务
  user: {
    login: `${ysUrl}${paths.api.user}login`,
    update: `${ysUrl}${paths.api.user}update`,
    info: `${ysUrl}${paths.api.user}info`,
    signin: `${ysUrl}${paths.api.user}signin`,
    list: `${ysUrl}${paths.api.user}list`,
    viewedSoup: `${ysUrl}${paths.api.user}viewed-soup`,
    answeredSoup: `${ysUrl}${paths.api.user}answered-soup`,
    createdSoup: `${ysUrl}${paths.api.user}created-soup`,
    favoriteSoup: `${ysUrl}${paths.api.user}favorite-soup`,
    likedSoup: `${ysUrl}${paths.api.user}liked-soup`,
    solvedSoup: `${ysUrl}${paths.api.user}solved-soup`
  },

  // 资源服务
  asset: {
    base: `${ysUrl}${paths.api.asset}`,
    byType: (type) => `${ysUrl}${paths.api.asset}type/${type}`,
    avatar: (id) => `${ysUrl}${paths.api.asset}avatar/${id}`,
    upload: `${ysUrl}${paths.api.asset}upload`
  },

  // 海龟汤服务
  soup: {
    base: `${memoryUrl}${paths.api.soup}`,
    random: `${memoryUrl}/api/soups/random`,
    get: (soupId) => `${memoryUrl}/api/soups/${soupId}`,
    view: (soupId) => `${memoryUrl}/api/soups/${soupId}/view`,
    like: (soupId) => `${memoryUrl}/api/soups/${soupId}/like`,
    unlike: (soupId) => `${memoryUrl}/api/soups/${soupId}/unlike`,
    favorite: (soupId) => `${memoryUrl}/api/soups/${soupId}/favor`,
    unfavorite: (soupId) => `${memoryUrl}/api/soups/${soupId}/unfavor`,
    create: `${memoryUrl}/api/soups/create`,
    map: `${memoryUrl}${paths.api.soup}map`
  },

  // 对话服务
  dialog: {
    base: `${ysUrl}${paths.api.dialog}`,
    create: `${ysUrl}${paths.api.dialog}create`,
    list: `${ysUrl}${paths.api.dialog}list`,
    byUser: (userId) => `${ysUrl}${paths.api.dialog}user/${userId}`,
    bySoup: (soupId) => `${ysUrl}${paths.api.dialog}soup/${soupId}`
  },

  // Agent服务
  agent: {
    chat: 'https://m1.apifoxmock.com/m1/6036386-5726220-default/agent/yishao/chat'
  }
};

// 资源管理
const assets = {
  // 本地静态资源
  local: {
    avatar: '/static/images/default-avatar.jpg'
  },

  // 远程资源
  remote: {
    // 图片资源
    images: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.images}${filename}`,
      share: `${assetsBaseUrl}/images/test.webp`
    },

    // 图标资源
    icons: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.icons}${filename}`
    },

    // 头像资源
    avatars: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.avatars}${filename}`
    },

    // UI资源
    ui: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.ui}${filename}`,
      notFound: `${assetsBaseUrl}/${paths.assets.ui}404.webp`
    },

    // 字体资源
    fonts: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.fonts}${filename}`
    }
  }
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
  memoryUrl,
  assetsBaseUrl,

  // 导出API端点
  api,

  // 导出资源管理
  assets,

  // 导出路径配置
  paths
};