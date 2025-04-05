const { chatAPI } = require('../api');

/**
 * 对话服务类
 * 处理与后端的对话交互，支持普通对话和流式对话
 */
class DialogService {
  constructor() {
    // 存储当前的流式请求任务
    this._currentStreamTask = null;
  }

  /**
   * 发送普通对话消息
   * @param {Object} params - 消息参数
   * @returns {Promise} - 返回处理后的响应
   */
  async sendMessage(params) {
    try {
      const response = await chatAPI.sendMessage(params);
      
      // 转换为项目使用的消息格式 {type: 'system', content: 'xxx'}
      return {
        type: 'system',
        content: this._formatResponseContent(response)
      };
    } catch (error) {
      console.error('发送消息失败:', error);
      wx.showToast({
        title: '请求失败',
        icon: 'none'
      });
      throw error;
    }
  }

  /**
   * 发送流式对话消息
   * @param {Object} params - 消息参数
   * @param {Function} onMessageUpdate - 接收消息的回调函数，参数为处理后的消息对象
   * @param {Function} onComplete - 完成时的回调
   * @param {Function} onError - 错误处理回调
   */
  sendStreamMessage(params, onMessageUpdate, onComplete, onError) {
    // 如果存在正在进行的对话，先中止它
    this.abortCurrentStream();

    // 创建缓存对象来累积流式回复内容
    let responseContent = '';

    // 创建新的流式请求
    this._currentStreamTask = chatAPI.sendStreamMessage(
      params,
      (message) => {
        if (message.data === '[DONE]') {
          // 流式接收完成
          if (onComplete) onComplete();
          this._currentStreamTask = null;
        } else {
          // 累积响应内容
          if (message.data) {
            responseContent += message.data;
            
            // 调用回调函数，传入累积的消息内容
            if (onMessageUpdate) {
              onMessageUpdate({
                type: 'system',
                content: responseContent
              });
            }
          }
        }
      },
      () => {
        if (onComplete) onComplete();
        this._currentStreamTask = null;
      },
      (error) => {
        console.error('流式对话错误:', error);
        wx.showToast({
          title: '请求失败',
          icon: 'none'
        });
        if (onError) onError(error);
        this._currentStreamTask = null;
      }
    );

    return this._currentStreamTask;
  }

  /**
   * 中止当前的流式对话
   */
  abortCurrentStream() {
    if (this._currentStreamTask) {
      chatAPI.abortStreamRequest(this._currentStreamTask);
      this._currentStreamTask = null;
    }
  }

  /**
   * 格式化响应内容
   * @param {Object} response - API返回的原始响应
   * @returns {String} - 格式化后的响应内容
   * @private
   */
  _formatResponseContent(response) {
    // 根据API实际返回格式，提取文本内容
    // 假设response是{content: 'xxx'}格式，根据实际情况调整
    if (response && typeof response === 'object') {
      if (response.content) return response.content;
      if (response.message) return response.message;
      if (response.text) return response.text;
      if (response.data && response.data.content) return response.data.content;
    }
    
    // 如果是字符串，直接返回
    if (typeof response === 'string') return response;
    
    // 最后尝试将整个响应转为字符串
    try {
      return JSON.stringify(response);
    } catch (e) {
      return '收到回复';
    }
  }
}

// 导出单例实例
const dialogService = new DialogService();
module.exports = dialogService;
