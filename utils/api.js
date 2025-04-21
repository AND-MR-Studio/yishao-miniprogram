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

// 汤面相关接口URL
const soup_list_url = soupBasePath + 'list';
const soup_random_url = soupBasePath + 'random';
const soup_detail_url = soupBasePath + 'detail/';
const soup_add_url = soupBasePath + 'add';
const soup_update_url = soupBasePath + 'update/';
const soup_delete_url = soupBasePath + 'delete/';

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

  // 汤面相关接口URL
  soup_list_url,
  soup_random_url,
  soup_detail_url,
  soup_add_url,
  soup_update_url,
  soup_delete_url,

  // 对话相关接口URL
  dialog_send_url,
  dialog_save_url,
  dialog_list_url,
  dialog_detail_url,
  dialog_delete_url
};