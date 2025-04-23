/**
 * 海龟汤数据模型
 * 定义海龟汤的数据结构和验证规则
 */

// 海龟汤类型枚举
const SOUP_TYPES = {
  PRESET: 0, // 预制汤
  DIY: 1     // DIY汤
};

// 海龟汤标签枚举
const SOUP_TAGS = {
  ABSURD: '荒诞',    // 荒诞
  FUNNY: '搞笑',     // 搞笑
  HORROR: '惊悚',    // 惊悚
  VARIANT: '变格',   // 变格
  UNKNOWN: '未知'    // 未知
};

/**
 * 海龟汤模型结构
 * @typedef {Object} SoupModel
 * @property {string} soupId - 海龟汤唯一ID
 * @property {string} title - 标题
 * @property {string[]} contentLines - 内容行数组
 * @property {string} truth - 汤底
 * @property {number} soupType - 类型：0预制汤/1DIY汤
 * @property {string} tag - 标签：荒诞/搞笑/惊悚/变格/未知
 * @property {string} creatorId - 创建者ID（可选）
 * @property {number} viewCount - 阅读数
 * @property {number} likeCount - 点赞数
 * @property {string} publishTime - 发布时间 (ISO格式)
 * @property {string} publishIp - 发布IP
 * @property {string} updateTime - 更新时间 (ISO格式)
 * @property {string} updateIp - 更新IP
 */

/**
 * 验证海龟汤数据
 * @param {Object} soup - 海龟汤数据
 * @returns {Object} 验证结果，包含valid和errors字段
 */
function validateSoup(soup) {
  const errors = [];

  if (!soup.title) errors.push('标题不能为空');
  if (!soup.contentLines || !Array.isArray(soup.contentLines) || soup.contentLines.length === 0) {
    errors.push('内容不能为空且必须是数组');
  }
  if (!soup.truth) errors.push('汤底不能为空');

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 创建新的海龟汤对象
 * @param {Object} data - 海龟汤数据
 * @returns {Object} 格式化后的海龟汤对象
 */
function createSoupObject(data) {
  const now = new Date().toISOString();

  return {
    soupId: data.soupId || `local_${Date.now()}`,
    title: data.title || '',
    contentLines: data.contentLines || [],
    truth: data.truth || '',
    soupType: data.soupType !== undefined ? data.soupType : SOUP_TYPES.PRESET,
    tag: data.tag || SOUP_TAGS.UNKNOWN,
    creatorId: data.creatorId || 'admin',
    viewCount: data.viewCount || 0,
    likeCount: data.likeCount || 0,
    publishTime: data.publishTime || now,
    publishIp: data.publishIp || '127.0.0.1',
    updateTime: data.updateTime || now,
    updateIp: data.updateIp || '127.0.0.1'
  };
}

module.exports = {
  SOUP_TYPES,
  SOUP_TAGS,
  validateSoup,
  createSoupObject
};
