/**
 * 对话模型定义
 * 定义对话的数据结构和验证规则
 */

/**
 * 对话消息类型枚举
 */
const MESSAGE_ROLES = {
  USER: 'user',
  AGENT: 'agent'
};

/**
 * 对话消息模型结构
 * @typedef {Object} DialogMessage
 * @property {string} messageId - 消息ID
 * @property {string} userId - 用户ID
 * @property {string} role - 消息角色 (user/agent)
 * @property {string} content - 消息内容
 * @property {number} timestamp - 消息时间戳
 */

/**
 * 对话数据模型结构
 * @typedef {Object} DialogData
 * @property {string} dialogId - 对话唯一标识符
 * @property {string} soupId - 关联的汤面ID
 * @property {string} userId - 对话所属的用户ID
 * @property {Array<DialogMessage>} messages - 消息列表
 * @property {number} lastUpdated - 最后更新时间戳
 */

/**
 * 创建新的对话消息对象
 * @param {Object} data - 消息数据
 * @returns {Object} 格式化后的消息对象
 */
function createMessageObject(data) {
  return {
    messageId: data.messageId || data.id || `msg_${Date.now()}`,
    userId: data.userId || 'anonymous',
    role: data.role || MESSAGE_ROLES.USER,
    content: data.content || '',
    timestamp: data.timestamp || Date.now()
  };
}

/**
 * 创建新的对话数据对象
 * @param {Object} data - 对话数据
 * @returns {Object} 格式化后的对话数据对象
 */
function createDialogObject(data = {}) {
  return {
    dialogId: data.dialogId || `dialog_${Date.now()}`,
    soupId: data.soupId || '',
    userId: data.userId || '',
    messages: data.messages || [],
    lastUpdated: data.lastUpdated || Date.now()
  };
}

/**
 * 验证对话消息数据
 * @param {Object} message - 对话消息数据
 * @returns {Object} 验证结果，包含valid和errors字段
 */
function validateMessage(message) {
  const errors = [];

  if (!message.content) errors.push('消息内容不能为空');
  if (!message.role) errors.push('消息角色不能为空');
  if (!Object.values(MESSAGE_ROLES).includes(message.role)) {
    errors.push(`消息角色必须是以下之一: ${Object.values(MESSAGE_ROLES).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  MESSAGE_ROLES,
  createMessageObject,
  createDialogObject,
  validateMessage
};
