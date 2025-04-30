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
    // 直接从本地存储获取 token
    const token = wx.getStorageSync('token');

    // 合并请求头
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };

    // 如果有token，添加到请求头
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

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
          // 清除本地存储的用户信息和token
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          wx.removeStorageSync('loginTimestamp');

          // 跳转到登录页或重新登录
          reject(new Error('登录已过期，请重新登录'));
        }
        // 处理400错误 - 通常是业务逻辑错误，如"今日已签到"
        else if (res.statusCode === 400) {
          // 从响应中获取错误信息
          const errorMsg = data.error || data.message || '请求参数错误';
          reject(new Error(errorMsg));
        }
        // 其他错误
        else {
          reject(new Error(data.error || data.message || '请求失败'));
        }
      },
      fail: (err) => {
        // 根据错误类型提供更具体的错误信息
        let errorMsg = '网络请求失败';

        if (err.errMsg && err.errMsg.includes('ERR_CONNECTION_REFUSED')) {
          errorMsg = '无法连接到服务器，请确保服务器已启动';
        } else if (err.errMsg && err.errMsg.includes('timeout')) {
          errorMsg = '请求超时，请检查网络连接';
        }

        // 显示错误提示
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });

        reject(new Error(errorMsg));
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
 * 一勺Agent服务专用请求方法
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const agentRequest = (options) => {
  return request({
    ...options,
    service: 'agent'
  });
};

/**
 * 对话服务专用请求方法
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const dialogRequest = (options) => {
  return request({
    ...options,
    service: 'dialog'
  });
};

/**
 * 用户服务专用请求方法
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const userRequest = (options) => {
  return request({
    ...options,
    service: 'user'
  });
};

/**
 * 开放请求方法（不需要身份验证）
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const requestOpen = (options) => {
  return new Promise((resolve, reject) => {
    // 合并请求头
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };

    // 直接使用传入的URL
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
        // 处理400错误 - 通常是业务逻辑错误
        else if (res.statusCode === 400) {
          // 从响应中获取错误信息
          const errorMsg = data.error || data.message || '请求参数错误';
          console.log('400错误，错误信息:', errorMsg);
          reject(new Error(errorMsg));
        }
        // 其他错误
        else {
          reject(new Error(data.error || data.message || '请求失败'));
        }
      },
      fail: (err) => {
        let errorMsg = '网络请求失败';
        if (err.errMsg && err.errMsg.includes('ERR_CONNECTION_REFUSED')) {
          errorMsg = '无法连接到服务器';
        } else if (err.errMsg && err.errMsg.includes('timeout')) {
          errorMsg = '请求超时';
        }
        reject(new Error(errorMsg));
      }
    });
  });
};

/**
 * 上传文件
 * @param {Object} options - 上传配置
 * @param {string} options.url - 上传地址
 * @param {string} options.filePath - 文件路径
 * @param {string} options.name - 文件对应的 key
 * @param {Object} [options.formData] - 附加的表单数据
 * @returns {Promise} 返回Promise对象
 */
const uploadFile = (options) => {
  return new Promise((resolve, reject) => {
    // 从本地存储获取 token
    const token = wx.getStorageSync('token');

    // 合并请求头
    const header = {
      ...options.header
    };

    // 如果有token，添加到请求头
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

    wx.uploadFile({
      url: options.url,
      filePath: options.filePath,
      name: options.name,
      formData: options.formData,
      header: header,
      success: (res) => {
        if (res.statusCode === 200) {
          // 将返回的JSON字符串转换为对象
          const data = JSON.parse(res.data);
          resolve(data);
        } else {
          reject(new Error('上传失败'));
        }
      },
      fail: (err) => {
        console.error('上传文件失败:', err);
        reject(new Error('上传文件失败'));
      }
    });
  });
};

/**
 * 资源服务专用请求方法
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const assetRequest = (options) => {
  return request({
    ...options,
    service: 'asset'
  });
};

/**
 * 资源服务开放请求方法（不需要身份验证）
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const assetRequestOpen = (options) => {
  return requestOpen({
    ...options
  });
};

module.exports = {
  request,
  requestOpen,
  soupRequest,
  dialogRequest,
  userRequest,
  agentRequest,
  assetRequest,
  assetRequestOpen,
  uploadFile
};
