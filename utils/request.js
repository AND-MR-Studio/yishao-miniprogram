/**
 * 网络请求模块
 */

/**
 * 统一请求方法
 * @param {Object} options - 请求配置
 * @param {string} options.url - 请求地址
 * @param {string} [options.method='GET'] - 请求方法
 * @param {Object} [options.data] - 请求数据
 * @param {Object} [options.header] - 请求头
 * @param {string} [options.service='user'] - 服务名称
 * @returns {Promise} 返回Promise对象
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 获取用户token
    const userInfo = wx.getStorageSync('userInfo') || {};
    const token = userInfo.token;

    // 合并请求头
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };

    // 如果有token，添加到请求头
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

    // 直接使用传入的URL，不再拼接基础URL
    // 因为在api.js中已经拼接好了完整URL
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      header: header,
      success: (res) => {
        const { data } = res;

        // 请求成功
        if (res.statusCode === 200) {
          resolve(data);
        }
        // token过期
        else if (res.statusCode === 401) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo');
          // 跳转到登录页或重新登录
          reject(new Error('登录已过期，请重新登录'));
        }
        // 其他错误
        else {
          reject(new Error(data.error || '请求失败'));
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        // 显示错误提示
        wx.showToast({
          title: '网络请求失败，请检查网络连接',
          icon: 'none',
          duration: 2000
        });
        reject(new Error('网络请求失败'));
      }
    });
  });
};

/**
 * 汤面服务专用请求方法
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const soupRequest = (options) => {
  return request({
    ...options,
    service: 'soup'
  });
};

/**
 * 一勺代理服务专用请求方法
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const agentRequest = (options) => {
  return request({
    ...options,
    service: 'agent'
  });
};

module.exports = {
  request,
  soupRequest,
  agentRequest
};
