/**
 * 事件工具模块
 * 提供安全的事件发送和监听方法，避免重复检查 wx.eventCenter 是否存在
 */

/**
 * 初始化事件中心
 * 如果 wx.eventCenter 不存在，则创建一个简单的事件中心
 * @returns {Object} 事件中心对象
 */
function initEventCenter() {
  if (!wx.eventCenter) {
    wx.eventCenter = {
      callbacks: {},
      on(eventName, callback) {
        this.callbacks[eventName] = this.callbacks[eventName] || [];
        this.callbacks[eventName].push(callback);
      },
      emit(eventName, data) {
        const callbacks = this.callbacks[eventName] || [];
        callbacks.forEach(callback => callback(data));
      }
    };
  }
  return wx.eventCenter;
}

/**
 * 安全地发送事件
 * @param {string} eventName 事件名称
 * @param {any} data 事件数据
 * @returns {boolean} 是否成功发送事件
 */
function emitEvent(eventName, data) {
  if (wx.eventCenter && typeof wx.eventCenter.emit === 'function') {
    wx.eventCenter.emit(eventName, data);
    return true;
  }
  return false;
}

/**
 * 监听事件
 * @param {string} eventName 事件名称
 * @param {Function} callback 回调函数
 * @returns {boolean} 是否成功监听事件
 */
function onEvent(eventName, callback) {
  if (wx.eventCenter && typeof wx.eventCenter.on === 'function') {
    wx.eventCenter.on(eventName, callback);
    return true;
  }
  return false;
}

/**
 * 移除事件监听器
 * @param {string} eventName 事件名称
 * @param {Function} callback 回调函数，如果不提供则移除该事件的所有监听器
 * @returns {boolean} 是否成功移除事件监听器
 */
function offEvent(eventName, callback) {
  if (wx.eventCenter && wx.eventCenter.callbacks) {
    if (callback && wx.eventCenter.callbacks[eventName]) {
      // 移除特定的回调函数
      wx.eventCenter.callbacks[eventName] = wx.eventCenter.callbacks[eventName].filter(
        cb => cb !== callback
      );
      return true;
    } else if (!callback && wx.eventCenter.callbacks[eventName]) {
      // 移除该事件的所有监听器
      wx.eventCenter.callbacks[eventName] = [];
      return true;
    }
  }
  return false;
}

/**
 * 显示提示
 * @param {string} title 提示标题
 * @param {string[]} content 提示内容数组
 * @returns {boolean} 是否成功显示提示
 */
function showTip(title, content) {
  return emitEvent('showTip', { title, content });
}

/**
 * 隐藏提示
 * @returns {boolean} 是否成功隐藏提示
 */
function hideTip() {
  return emitEvent('hideTip');
}

module.exports = {
  initEventCenter,
  emitEvent,
  onEvent,
  offEvent,
  showTip,
  hideTip
};
