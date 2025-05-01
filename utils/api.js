/**
 * API接口定义
 * 根据最新的后端接口规范进行配置
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
  uploadFile
} = require('./request');

// 直接使用字符串常量，避免重复定义

// 基础路径
const userBasePath = 'user/';
const soupBasePath = 'soup/';
const dialogBasePath = 'dialog/';
// 资源服务基础路径
const assetBasePath = 'asset/';

// ===== 用户服务接口 =====
// 用户登录/注册
const user_login_url = ysUrl + userBasePath + 'login';
// 用户信息更新
const user_update_url = ysUrl + userBasePath + 'update';
// 获取用户信息
const user_info_url = ysUrl + userBasePath + 'info';
// 用户签到
const user_signin_url = ysUrl + userBasePath + 'signin';
// 获取用户列表（管理员接口）
const user_list_url = ysUrl + userBasePath + 'list';
// 更新用户浏览过的汤
const user_viewed_soup_url = ysUrl + userBasePath + 'viewed-soup';
// 更新用户回答过的汤
const user_answered_soup_url = ysUrl + userBasePath + 'answered-soup';
// 更新用户创建的汤
const user_created_soup_url = ysUrl + userBasePath + 'created-soup';
// 更新用户收藏的汤
const user_favorite_soup_url = ysUrl + userBasePath + 'favorite-soup';
// 更新用户已解决的汤
const user_solved_soup_url = ysUrl + userBasePath + 'solved-soup';

// 默认头像URL (绝对路径)
const default_avatar_url = '/static/images/default-avatar.jpg';

// ===== 系统服务接口 =====

// 获取所有资源
const asset_list_url = ysUrl + assetBasePath + 'all';
// 获取单个资源
const asset_by_id_url = ysUrl + assetBasePath;
// 获取指定类型的资源
const asset_by_type_url = ysUrl + assetBasePath + 'type/';
// 获取用户头像
const asset_avatar_url = ysUrl + assetBasePath + 'avatar/';
// 上传资源
const asset_upload_url = ysUrl + assetBasePath + 'upload';

// ===== 海龟汤服务接口 =====
// 基础路径，用于获取所有汤面或创建新汤面
const soup_base_url = ysUrl + soupBasePath;
// 获取指定ID的汤面，后面需要追加ID
const soup_by_id_url = ysUrl + soupBasePath;
// 获取随机汤面
const soup_random_url = ysUrl + soupBasePath + 'random';
// 汤面点赞，后面需要追加ID+'/like'
const soup_like_url = ysUrl + soupBasePath;
// 增加汤面阅读数，后面需要追加ID+'/view'
const soup_view_url = ysUrl + soupBasePath;
// 收藏汤面，后面需要追加ID+'/favorite'
const soup_favorite_url = ysUrl + soupBasePath;
// 不喜欢汤面，后面需要追加ID+'/unlike'
const soup_unlike_url = ysUrl + soupBasePath;
// 按标签获取汤面，使用查询参数 ?tags=xxx 或 ?tags=xxx,yyy,zzz
const soup_by_tag_url = ysUrl + soupBasePath;
// 按类型获取汤面，使用查询参数 ?type=xxx
const soup_by_type_url = ysUrl + soupBasePath;

// ===== 对话服务接口 =====
// 创建新对话
const dialog_create_url = ysUrl + dialogBasePath + 'create';
// 发送消息，后面需要追加dialogId+'/send'
const dialog_send_url = ysUrl + dialogBasePath;
// 保存对话，后面需要追加dialogId+'/save'
const dialog_save_url = ysUrl + dialogBasePath;
// 获取所有对话列表
const dialog_list_url = ysUrl + dialogBasePath + 'list';
// 获取指定对话详情，后面需要追加dialogId
const dialog_detail_url = ysUrl + dialogBasePath;
// 获取用户的所有对话，后面需要追加user/userId
const dialog_user_url = ysUrl + dialogBasePath + 'user/';
// 获取与特定汤面相关的对话，后面需要追加soup/soupId
const dialog_soup_url = ysUrl + dialogBasePath + 'soup/';
// 删除对话，后面需要追加dialogId
const dialog_delete_url = ysUrl + dialogBasePath;

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

  // 导出基础URL
  baseUrl,
  ysUrl,

  // 导出基础路径
  userBasePath,
  soupBasePath,
  dialogBasePath,

  // 用户相关接口URL
  user_login_url,
  user_update_url,
  user_info_url,
  user_signin_url,
  user_list_url,
  user_viewed_soup_url,
  user_answered_soup_url,
  user_created_soup_url,
  user_favorite_soup_url,
  user_solved_soup_url,
  default_avatar_url,

  // 系统相关接口URL
  assetBasePath,
  asset_list_url,
  asset_by_id_url,
  asset_by_type_url,
  asset_avatar_url,
  asset_upload_url,

  // 汤面相关接口URL
  soup_base_url,
  soup_by_id_url,
  soup_random_url,
  soup_like_url,
  soup_view_url,
  soup_favorite_url,
  soup_unlike_url,
  soup_by_tag_url,
  soup_by_type_url,

  // 对话相关接口URL
  dialog_create_url,
  dialog_send_url,
  dialog_save_url,
  dialog_list_url,
  dialog_detail_url,
  dialog_user_url,
  dialog_soup_url,
  dialog_delete_url
};