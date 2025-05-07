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

  // 为了向后兼容，保留旧的导出
  // 基础路径
  userBasePath: paths.user,
  soupBasePath: paths.soup,
  dialogBasePath: paths.dialog,
  assetBasePath: paths.asset,

  // 用户相关接口URL
  user_login_url: api.user.login,
  user_update_url: api.user.update,
  user_info_url: api.user.info,
  user_signin_url: api.user.signin,
  user_list_url: api.user.list,
  user_viewed_soup_url: api.user.viewedSoup,
  user_answered_soup_url: api.user.answeredSoup,
  user_created_soup_url: api.user.createdSoup,
  user_favorite_soup_url: api.user.favoriteSoup,
  user_liked_soup_url: api.user.likedSoup,
  user_solved_soup_url: api.user.solvedSoup,
  default_avatar_url: defaults.avatar,

  // 系统相关接口URL
  asset_list_url: api.asset.list,
  asset_by_id_url: api.asset.base,
  asset_by_type_url: api.asset.byType,
  asset_avatar_url: api.asset.avatar,
  asset_upload_url: api.asset.upload,

  // 汤面相关接口URL
  soup_base_url: api.soup.base,
  soup_by_id_url: api.soup.base,
  soup_random_url: api.soup.random,
  soup_like_url: api.soup.like,
  soup_view_url: api.soup.view,
  soup_favorite_url: api.soup.favorite,
  soup_map_url: api.soup.map,
  soup_unlike_url: api.soup.base,
  soup_by_tag_url: api.soup.base,
  soup_by_type_url: api.soup.base,

  // 对话相关接口URL
  dialog_create_url: api.dialog.create,
  dialog_send_url: api.dialog.base,
  dialog_save_url: api.dialog.base,
  dialog_list_url: api.dialog.list,
  dialog_detail_url: api.dialog.base,
  dialog_user_url: api.dialog.byUser,
  dialog_soup_url: api.dialog.bySoup,
  dialog_delete_url: api.dialog.base,

  // Agent相关接口URL
  agent_chat_url: api.agent.chat
};