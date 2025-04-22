/**
 * API接口定义
 */
let App = getApp();
let baseUrl = App.globalData.config.baseUrl;
let ysUrl = App.globalData.config.ysUrl;
const { request, soupRequest, agentRequest } = require('./request');

// 基础路径
const userBasePath = 'user/';
const soupBasePath = 'soup/';
const dialogBasePath = 'dialog/';

// 用户相关接口URL
const user_login_url = ysUrl + userBasePath + 'login';
const user_update_url = ysUrl + userBasePath + 'update';
const user_info_url = ysUrl + userBasePath + 'info';
const user_soups_url = ysUrl + userBasePath + 'soups';
const user_soups_update_url = ysUrl + userBasePath + 'soups/update';
const user_list_url = ysUrl + userBasePath + 'list';
const user_delete_url = ysUrl + userBasePath + 'delete';

// 海龟汤相关接口URL - RESTful风格
const soup_base_url = ysUrl + soupBasePath; // 基础路径，用于获取、创建海龟汤
const soup_by_id_url = ysUrl + soupBasePath; // 后面需要追加ID，用于获取、更新、删除指定ID的海龟汤
const soup_random_url = ysUrl + soupBasePath + 'random'; // 获取随机海龟汤
const soup_like_url = ysUrl + soupBasePath; // 后面需要追加ID+'/like'，用于点赞海龟汤
const soup_view_url = ysUrl + soupBasePath; // 后面需要追加ID+'/view'，用于增加阅读数


// 对话相关接口URL
const dialog_send_url = ysUrl + dialogBasePath + 'send';
const dialog_save_url = ysUrl + dialogBasePath + 'save';
const dialog_list_url = ysUrl + dialogBasePath + 'list';
const dialog_detail_url = ysUrl + dialogBasePath + 'detail/';
const dialog_delete_url = ysUrl + dialogBasePath + 'delete/';

module.exports = {
  // 导出请求方法
  request,
  soupRequest,
  agentRequest,

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
  user_soups_url,
  user_soups_update_url,
  user_list_url,
  user_delete_url,

  // 汤面相关接口URL - RESTful风格
  soup_base_url,
  soup_by_id_url,
  soup_random_url,
  soup_like_url,
  soup_view_url,

  // 对话相关接口URL
  dialog_send_url,
  dialog_save_url,
  dialog_list_url,
  dialog_detail_url,
  dialog_delete_url
};