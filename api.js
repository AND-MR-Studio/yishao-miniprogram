/**
 * api.js - 网络请求工具模块
 * 支持常规请求和流式请求，专为大模型对话设计
 */

// 基础配置
const BASE_CONFIG = {
  baseURL: "https://api.coze.cn", // 替换为实际的API地址
  timeout: 30000, // 默认超时时间
  header: {
    "content-type": "application/json",
    Authorization:
      "Bearer pat_04mwt1lj2Bq0649rh6Nz8HtgG4R3STnhVVQDKJHMXQoX14u1yq278zwTa0cviBUX",
  },
};

/**
 * 请求拦截器
 * @param {Object} config 请求配置
 * @returns {Object} 处理后的请求配置
 */
const requestInterceptor = (config) => {
  // 获取token
  // const token = wx.getStorageSync("token");
  // if (token) {
  //   config.header = {
  //     ...config.header,
  //     Authorization: `Bearer ${token}`,
  //   };
  // }
  return config;
};

/**
 * 响应拦截器
 * @param {Object} response 响应数据
 * @returns {Object|Promise} 处理后的响应数据或错误
 */
const responseInterceptor = (response) => {
  // 这里可以根据业务需求处理响应
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data;
  } else {
    return Promise.reject({
      code: response.statusCode,
      message: response.data?.message || "请求失败",
      data: response.data,
    });
  }
};

/**
 * 错误处理函数
 * @param {Object} error 错误对象
 * @returns {Promise} 错误Promise
 */
const errorHandler = (error) => {
  // 处理网络错误
  let message = "网络请求失败";
  if (error.errMsg) {
    if (error.errMsg.includes("timeout")) {
      message = "请求超时";
    } else if (error.errMsg.includes("fail")) {
      message = "网络连接失败";
    }
  }

  // 可以在这里统一处理错误，如显示提示等
  wx.showToast({
    title: message,
    icon: "none",
    duration: 2000,
  });

  return Promise.reject(error);
};
``;
/**
 * 基础请求函数
 * @param {Object} options 请求选项
 * @returns {Promise} 请求Promise
 */
const request = (options) => {
  // 合并配置：baseConfig + options.config
  const config = {
    ...BASE_CONFIG,
    ...options,
    header: {
      ...BASE_CONFIG.header,
      ...options.header,
    },
  };

  // 应用请求拦截器
  const interceptedConfig = requestInterceptor(config);

  return new Promise((resolve, reject) => {
    wx.request({
      ...interceptedConfig,
      success: (res) => {
        try {
          // 应用响应拦截器
          const result = responseInterceptor(res);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      fail: (error) => {
        errorHandler(error).catch(reject);
      },
    });
  });
};

/**
 * HTTP请求方法
 */
const http = {
  /**
   * GET请求
   * @param {string} url 请求地址
   * @param {Object} data 请求参数
   * @param {Object} options 其他选项
   * @returns {Promise} 请求Promise
   */
  get: (url, data = {}, options = {}) => {
    return request({
      url,
      data,
      method: "GET",
      ...options,
    });
  },

  /**
   * POST请求
   * @param {string} url 请求地址
   * @param {Object} data 请求参数
   * @param {Object} options 其他选项
   * @returns {Promise} 请求Promise
   */
  post: (url, data = {}, options = {}) => {
    return request({
      url,
      data,
      method: "POST",
      ...options,
    });
  },

  /**
   * PUT请求
   * @param {string} url 请求地址
   * @param {Object} data 请求参数
   * @param {Object} options 其他选项
   * @returns {Promise} 请求Promise
   */
  put: (url, data = {}, options = {}) => {
    return request({
      url,
      data,
      method: "PUT",
      ...options,
    });
  },

  /**
   * DELETE请求
   * @param {string} url 请求地址
   * @param {Object} data 请求参数
   * @param {Object} options 其他选项
   * @returns {Promise} 请求Promise
   */
  delete: (url, data = {}, options = {}) => {
    return request({
      url,
      data,
      method: "DELETE",
      ...options,
    });
  },
};

/**
 * 流式请求处理类
 */
class StreamRequest {
  /**
   * 创建流式请求任务
   * @param {Object} options 请求选项
   * @param {Function} onMessage 消息回调函数
   * @param {Function} onComplete 完成回调函数
   * @param {Function} onError 错误回调函数
   * @returns {Object} 请求任务对象
   */
  createTask(options, onMessage, onComplete, onError) {
    // 合并配置
    const config = {
      ...BASE_CONFIG,
      ...options,
      header: {
        ...BASE_CONFIG.header,
        ...options.header,
      },
      enableChunked: true, // 启用分块传输
      enableCache: false, // 禁用缓存
    };

    // 应用请求拦截器
    const interceptedConfig = requestInterceptor(config);

    // 创建请求任务
    const requestTask = wx.request({
      ...interceptedConfig,
      success: () => {}, // 不在这里处理响应
      fail: (error) => {
        console.error("流式请求错误: ", interceptedConfig);
        if (onError) onError(error);
        errorHandler(error);
      },
      complete: () => {
        if (onComplete) onComplete();
      },
    });

    // 监听数据接收
    requestTask.onChunkReceived((response) => {
      try {
        if (response.data) {
          // 处理接收到的数据块
          const result = this._parseChunk(response.data);

          if (result) {
            // 处理返回的单个结果或结果数组
            if (Array.isArray(result)) {
              // 如果是数组，逐个处理每个结果
              for (const chunk of result) {
                if (chunk && onMessage) {
                  onMessage(chunk);
                }
              }
            } else {
              // 单个结果直接处理
              if (onMessage) {
                onMessage(result);
              }
            }
          }
        }
      } catch (error) {
        console.error("解析数据块失败:", error);
        if (onError) onError(error);
      }
    });

    return requestTask;
  }

  /**
   * 解析数据块
   * @param {ArrayBuffer} data 接收到的数据
   * @returns {Object|null} 解析后的数据对象event,data
   * @private
   */
  _parseChunk(data) {
    try {
      // 将ArrayBuffer转换为字符串
      const decoder = new TextDecoder("utf-8");
      const text = decoder.decode(data);

      // 处理可能包含多个event+data对的SSE格式数据
      if (text.startsWith("event:") && text.includes("data:")) {
        // 按照空行分割多个event+data对
        const chunks = text.split("\n\n").filter((chunk) => chunk.trim());
        const results = [];

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          let event = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              event = line.replace(/^event:\s*/, "").trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.replace(/^data:\s*/, "").trim();
            }
          }

          if (event && dataStr) {
            if (dataStr === "[DONE]") {
              results.push({ event: event, data: "[DONE]" });
            } else {
              try {
                const data = JSON.parse(dataStr);
                results.push({ event: event, data: data.content });
              } catch (e) {
                console.log(
                  "JSON解析错误(event):",
                  e.message,
                  "原始文本:",
                  dataStr
                );
                results.push({ event: "error", content: dataStr });
              }
            }
          }
        }

        // 如果只有一个结果，直接返回；否则返回数组
        return results.length === 1 ? results[0] : results;
      }

      // 处理只有data:的SSE格式数据
      if (text.startsWith("data:")) {
        // 按照空行分割多个data块
        const chunks = text.split("\n\n").filter((chunk) => chunk.trim());
        const results = [];

        for (const chunk of chunks) {
          const jsonStr = chunk.replace(/^data:\s*/, "").trim();
          if (jsonStr === "[DONE]") {
            results.push({ data: "[DONE]" });
          } else {
            try {
              results.push({ data: JSON.parse(jsonStr) });
            } catch (e) {
              console.log(
                "JSON解析错误(data):",
                e.message,
                "原始文本:",
                jsonStr
              );
              results.push({ data: jsonStr });
            }
          }
        }

        // 如果只有一个结果，直接返回；否则返回数组
        return results.length === 1 ? results[0] : results;
      }

      // 尝试直接解析JSON
      if (text.trim()) {
        // 检查是否为SSE格式数据，如果是则不尝试直接解析
        if (text.startsWith("event:") || text.startsWith("data:")) {
          console.log("跳过SSE格式数据的直接解析");
          return null;
        }
        try {
          return JSON.parse(text);
        } catch (e) {
          console.log("JSON解析错误:", e.message, "原始文本:", text);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error("解析数据块错误:", error);
      return null;
    }
  }

  /**
   * 中止请求任务
   * @param {Object} task 请求任务对象
   */
  abortTask(task) {
    if (task && typeof task.abort === "function") {
      task.abort();
    }
  }
}

/**
 * 聊天API模块 - 专为大模型对话设计
 */
const chatAPI = {
  /**
   * 发送常规聊天消息
   * @param {Object} params 请求参数
   * @param {Object} options 其他选项
   * @returns {Promise} 请求Promise
   */
  sendMessage: (params, options = {}) => {
    return http.post("/chat/completions", params, options);
  },

  /**
   * 发送流式聊天消息
   * @param {Object} params 请求参数
   * @param {Function} onMessage 消息回调函数
   * @param {Function} onComplete 完成回调函数
   * @param {Function} onError 错误回调函数
   * @returns {Object} 请求任务对象
   */
  sendStreamMessage: (params, onMessage, onComplete, onError) => {
    const streamRequest = new StreamRequest();
    return streamRequest.createTask(
      {
        url: `${BASE_CONFIG.baseURL}/v3/chat`,
        method: "POST",
        data: params,
      },
      onMessage,
      onComplete,
      onError
    );
  },

  /**
   * 中止流式请求
   * @param {Object} task 请求任务对象
   */
  abortStreamRequest: (task) => {
    const streamRequest = new StreamRequest();
    streamRequest.abortTask(task);
  },
};

module.exports = {
  http,
  chatAPI,
  StreamRequest,
};
