/**
 * 网络请求模块
 * 提供HTTP请求方法，支持GET、POST、PUT、DELETE等常用方法
 * 支持请求拦截器、响应拦截器和错误处理
 */
import { ApiResult } from '../api/entities';

// 默认配置
const DEFAULT_CONFIG = {
    timeout: 5000,        // 默认超时时间（毫秒）
    retryCount: 0,        // 默认重试次数
    retryDelay: 1000,     // 默认重试延迟（毫秒）
    contentType: 'application/json'
};

// 请求拦截器
let requestInterceptors = [];

// 响应拦截器
let responseInterceptors = [];

/**
 * 添加请求拦截器
 * @param {Function} interceptor - 拦截器函数，接收options参数并返回处理后的options
 */
const addRequestInterceptor = (interceptor) => {
    if (typeof interceptor === 'function') {
        requestInterceptors.push(interceptor);
    }
};

/**
 * 添加响应拦截器
 * @param {Function} interceptor - 拦截器函数，接收response参数并返回处理后的response
 */
const addResponseInterceptor = (interceptor) => {
    if (typeof interceptor === 'function') {
        responseInterceptors.push(interceptor);
    }
};

/**
 * GET请求方法
 * @param {Object} param - 请求参数
 * @param {string} param.url - 请求URL
 * @param {Object} [param.data] - 请求数据
 * @param {Object} [param.header] - 请求头
 * @param {number} [param.timeout] - 超时时间（毫秒）
 * @param {number} [param.retryCount] - 重试次数
 * @param {number} [param.retryDelay] - 重试延迟（毫秒）
 * @returns {Promise} 返回Promise对象
 */
function get(param) {
    return request({
        url: param.url,
        method: "GET",
        data: param.data,
        header: param.header,
        timeout: param.timeout,
        retryCount: param.retryCount,
        retryDelay: param.retryDelay
    });
};

/**
 * POST请求方法
 * @param {Object} param - 请求参数
 * @param {string} param.url - 请求URL
 * @param {Object} [param.data] - 请求数据
 * @param {Object} [param.header] - 请求头
 * @param {number} [param.timeout] - 超时时间（毫秒）
 * @param {number} [param.retryCount] - 重试次数
 * @param {number} [param.retryDelay] - 重试延迟（毫秒）
 * @returns {Promise} 返回Promise对象
 */
const post = (param) => {
    return request({
        url: param.url,
        method: "POST",
        data: param.data,
        header: param.header,
        timeout: param.timeout,
        retryCount: param.retryCount,
        retryDelay: param.retryDelay
    });
};

/**
 * PUT请求方法
 * @param {Object} param - 请求参数
 * @param {string} param.url - 请求URL
 * @param {Object} [param.data] - 请求数据
 * @param {Object} [param.header] - 请求头
 * @param {number} [param.timeout] - 超时时间（毫秒）
 * @param {number} [param.retryCount] - 重试次数
 * @param {number} [param.retryDelay] - 重试延迟（毫秒）
 * @returns {Promise} 返回Promise对象
 */
const put = (param) => {
    return request({
        url: param.url,
        method: "PUT",
        data: param.data,
        header: param.header,
        timeout: param.timeout,
        retryCount: param.retryCount,
        retryDelay: param.retryDelay
    });
};

/**
 * DELETE请求方法
 * @param {Object} param - 请求参数
 * @param {string} param.url - 请求URL
 * @param {Object} [param.data] - 请求数据
 * @param {Object} [param.header] - 请求头
 * @param {number} [param.timeout] - 超时时间（毫秒）
 * @param {number} [param.retryCount] - 重试次数
 * @param {number} [param.retryDelay] - 重试延迟（毫秒）
 * @returns {Promise} 返回Promise对象
 */
const del = (param) => {
    return request({
        url: param.url,
        method: "DELETE",
        data: param.data,
        header: param.header,
        timeout: param.timeout,
        retryCount: param.retryCount,
        retryDelay: param.retryDelay
    });
};

/**
 * 统一请求方法
 * @param {Object} options - 请求配置
 * @param {string} options.url - 请求地址
 * @param {string} [options.method='GET'] - 请求方法
 * @param {Object} [options.data] - 请求数据
 * @param {Object} [options.header] - 请求头
 * @param {number} [options.timeout=5000] - 超时时间（毫秒）
 * @param {number} [options.retryCount=0] - 请求失败后的重试次数
 * @param {number} [options.retryDelay=1000] - 重试间隔（毫秒）
 * @returns {Promise} 返回Promise对象
 */
const request = (options) => {
    // 合并默认配置
    // 应用请求拦截器
    let processedConfig = {
        ...DEFAULT_CONFIG,
        ...options,
        header: {
            "Content-Type": DEFAULT_CONFIG.contentType,
            ...options.header,
        },
        retryCount: options.retryCount !== undefined ? options.retryCount : DEFAULT_CONFIG.retryCount,
        retryDelay: options.retryDelay !== undefined ? options.retryDelay : DEFAULT_CONFIG.retryDelay,
        currentRetryCount: 0
    };
    for (const interceptor of requestInterceptors) {
        try {
            processedConfig = interceptor(processedConfig) || processedConfig;
        } catch (error) {
            console.error('请求拦截器执行错误:', error);
        }
    }

    // 执行请求
    return executeRequest(processedConfig);
};

/**
 * 执行请求
 * @param {Object} config - 请求配置
 * @returns {Promise} 返回Promise对象
 * @private
 */
const executeRequest = (config) => {
    return new Promise((resolve, reject) => {
        // 直接从本地存储获取 token
        const token = wx.getStorageSync("token");

        // 如果有token，添加到请求头
        if (token && !config.skipAuth) {
            config.header.Authorization = `Bearer ${token}`;
        }

        // 发起请求
        wx.request({
            url: config.url,
            method: config.method || "GET",
            data: config.data,
            header: config.header,
            timeout: config.timeout || DEFAULT_CONFIG.timeout,
            success: (res) => {
                // 应用响应拦截器
                // res.data : code, data, msg
                let processedRes = res.data;
                for (const interceptor of responseInterceptors) {
                    try {
                        processedRes = interceptor(processedRes) || processedRes;
                    } catch (error) {
                        console.error('响应拦截器执行错误:', error);
                    }
                }
                // 处理返回的数据
                resolve(new ApiResult(
                    processedRes.code,
                    processedRes.data,
                    processedRes.msg
                ));

            },
            fail: (error) => {
                resolve(ApiResult.onError(error.errMsg || '网络请求失败'));
            }
        });
    });
};

/**
 * 处理响应
 * @param {Object} res - 响应对象
 * @param {Object} config - 请求配置
 * @param {Function} resolve - Promise resolve函数
 * @param {Function} reject - Promise reject函数
 * @private
 */
const handleResponse = (res, config, resolve, reject) => {
    switch (res.statusCode) {
        case 200:
            resolve(res.data);
            break;
        case 401:
            // 清除本地存储的用户信息和token
            wx.removeStorageSync("userInfo");
            wx.removeStorageSync("token");
            wx.removeStorageSync("loginTimestamp");

            // 显示错误提示
            wx.showToast({
                title: "登录已过期，请重新登录",
                icon: "none",
                duration: 2000,
            });

            reject(new Error("登录已过期，请重新登录"));
            break;
        case 400:
            // 处理业务逻辑错误
            const errorMsg400 = res.data?.error || res.data?.message || "请求参数错误";
            reject(new Error(errorMsg400));
            break;
        case 403:
            reject(new Error("没有权限访问该资源"));
            break;
        case 404:
            reject(new Error("请求的资源不存在"));
            break;
        case 500:
        case 502:
        case 503:
            // 服务器错误，可以尝试重试
            if (config.currentRetryCount < config.retryCount) {
                return retryRequest(config, resolve, reject);
            }
            reject(new Error("服务器错误，请稍后再试"));
            break;
        default:
            reject(
                new Error(`请求失败 [${res.statusCode}]：${res.data?.message || JSON.stringify(res.data)}`)
            );
    }
};

/**
 * 处理请求错误
 * @param {Object} err - 错误对象
 * @param {Object} config - 请求配置
 * @param {Function} resolve - Promise resolve函数
 * @param {Function} reject - Promise reject函数
 * @private
 */
const handleRequestError = (err, config, resolve, reject) => {
    // 判断是否需要重试
    if (config.currentRetryCount < config.retryCount) {
        return retryRequest(config, resolve, reject);
    }

    // 根据错误类型提供更具体的错误信息
    let errorMsg = "网络请求失败";
    if (err.errMsg) {
        if (err.errMsg.includes("timeout")) {
            errorMsg = "请求超时，请检查网络连接";
        } else if (err.errMsg.includes("ERR_CONNECTION_REFUSED")) {
            errorMsg = "无法连接到服务器";
        } else if (err.errMsg.includes("fail ssl")) {
            errorMsg = "SSL证书验证失败";
        } else if (err.errMsg.includes("fail")) {
            errorMsg = err.errMsg;
        }
    }

    // 显示错误提示
    wx.showToast({
        title: errorMsg,
        icon: "none",
        duration: 2000,
    });

    reject(new Error(errorMsg));
};

/**
 * 重试请求
 * @param {Object} config - 请求配置
 * @param {Function} resolve - Promise resolve函数
 * @param {Function} reject - Promise reject函数
 * @private
 */
const retryRequest = (config, resolve, reject) => {
    config.currentRetryCount++;
    console.log(`请求失败，正在进行第${config.currentRetryCount}次重试...`);

    setTimeout(() => {
        executeRequest(config).then(resolve).catch(reject);
    }, config.retryDelay);
};


/**
 * 开放请求方法（不需要身份验证）
 * @param {Object} options - 请求配置
 * @param {string} options.url - 请求地址
 * @param {string} [options.method='GET'] - 请求方法
 * @param {Object} [options.data] - 请求数据
 * @param {Object} [options.header] - 请求头
 * @param {number} [options.timeout] - 超时时间（毫秒）
 * @param {number} [options.retryCount] - 重试次数
 * @param {number} [options.retryDelay] - 重试延迟（毫秒）
 * @returns {Promise} 返回Promise对象
 */
const requestOpen = (options) => {
    // 标记为跳过身份验证
    return request({
        ...options,
        skipAuth: true
    });
};

/**
 * 上传文件
 * @param {Object} options - 上传配置
 * @param {string} options.url - 上传地址
 * @param {string} options.filePath - 文件路径
 * @param {string} options.name - 文件对应的 key
 * @param {Object} [options.formData] - 附加的表单数据
 * @param {Object} [options.header] - 请求头
 * @param {boolean} [options.skipAuth=false] - 是否跳过身份验证
 * @param {number} [options.retryCount=0] - 重试次数
 * @param {number} [options.retryDelay=1000] - 重试延迟（毫秒）
 * @returns {Promise} 返回Promise对象
 */
const uploadFile = (options) => {
    // 合并默认配置
    const config = {
        ...options,
        header: {
            ...options.header,
        },
        retryCount: options.retryCount !== undefined ? options.retryCount : DEFAULT_CONFIG.retryCount,
        retryDelay: options.retryDelay !== undefined ? options.retryDelay : DEFAULT_CONFIG.retryDelay,
        currentRetryCount: 0
    };

    return executeUpload(config);
};

/**
 * 执行上传
 * @param {Object} config - 上传配置
 * @returns {Promise} 返回Promise对象
 * @private
 */
const executeUpload = (config) => {
    return new Promise((resolve, reject) => {
        // 从本地存储获取 token
        const token = wx.getStorageSync("token");

        // 如果有token且不跳过身份验证，添加到请求头
        if (token && !config.skipAuth) {
            config.header = config.header || {};
            config.header.Authorization = `Bearer ${token}`;
        }

        wx.uploadFile({
            url: config.url,
            filePath: config.filePath,
            name: config.name,
            formData: config.formData,
            header: config.header,
            success: (res) => {
                if (res.statusCode === 200) {
                    try {
                        // 将返回的JSON字符串转换为对象
                        const data = JSON.parse(res.data);
                        resolve(data);
                    } catch (error) {
                        // 如果解析失败，返回原始数据
                        console.warn('上传响应数据解析失败，返回原始数据:', error);
                        resolve(res.data);
                    }
                } else if (res.statusCode === 401) {
                    // 清除本地存储的用户信息和token
                    wx.removeStorageSync("userInfo");
                    wx.removeStorageSync("token");
                    wx.removeStorageSync("loginTimestamp");

                    reject(new Error("登录已过期，请重新登录"));
                } else if ([500, 502, 503].includes(res.statusCode) && config.currentRetryCount < config.retryCount) {
                    // 服务器错误，可以尝试重试
                    retryUpload(config, resolve, reject);
                } else {
                    // 尝试解析错误信息
                    let errorMsg = "上传失败";
                    try {
                        const errorData = JSON.parse(res.data);
                        errorMsg = errorData.error || errorData.message || `上传失败 [${res.statusCode}]`;
                    } catch (e) {
                        // 解析失败，使用默认错误信息
                    }
                    reject(new Error(errorMsg));
                }
            },
            fail: (err) => {
                // 判断是否需要重试
                if (config.currentRetryCount < config.retryCount) {
                    return retryUpload(config, resolve, reject);
                }

                // 根据错误类型提供更具体的错误信息
                let errorMsg = "上传文件失败";
                if (err.errMsg) {
                    if (err.errMsg.includes("timeout")) {
                        errorMsg = "上传超时，请检查网络连接";
                    } else if (err.errMsg.includes("ERR_CONNECTION_REFUSED")) {
                        errorMsg = "无法连接到服务器";
                    } else {
                        errorMsg = err.errMsg;
                    }
                }
                console.error("上传文件失败:", err);
                reject(new Error(errorMsg));
            },
        });
    });
};

/**
 * 重试上传
 * @param {Object} config - 上传配置
 * @param {Function} resolve - Promise resolve函数
 * @param {Function} reject - Promise reject函数
 * @private
 */
const retryUpload = (config, resolve, reject) => {
    config.currentRetryCount++;
    console.log(`上传失败，正在进行第${config.currentRetryCount}次重试...`);

    setTimeout(() => {
        executeUpload(config).then(resolve).catch(reject);
    }, config.retryDelay);
};

/**
 * 资源服务开放请求方法（不需要身份验证）
 * @param {Object} options - 请求配置
 * @returns {Promise} 返回Promise对象
 */
const assetRequestOpen = (options) => {
    return requestOpen(options);
};

/**
 * 开放上传文件（不需要身份验证）
 * @param {Object} options - 上传配置
 * @returns {Promise} 返回Promise对象
 */
const uploadFileOpen = (options) => {
    return uploadFile({
        ...options,
        skipAuth: true
    });
};

export {
    // 核心方法
    assetRequestOpen,
    uploadFile,
    uploadFileOpen,

    // HTTP方法
    get,
    post,
    put,
    del,

    // 拦截器
    addRequestInterceptor,
    addResponseInterceptor,
};
