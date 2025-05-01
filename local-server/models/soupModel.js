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
 * @property {string[]} tags - 标签数组：可包含多个标签
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

  // 验证标签
  if (soup.tags) {
    if (!Array.isArray(soup.tags)) {
      errors.push('标签必须是数组');
    } else if (soup.tags.length > 0) {
      // 验证每个标签是否为字符串
      for (const tag of soup.tags) {
        if (typeof tag !== 'string' || tag.trim() === '') {
          errors.push('标签不能为空且必须是字符串');
          break;
        }
      }
    }
  }

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

  // 处理标签数据
  let tags = [];

  // 如果提供了tags数组，使用它
  if (data.tags && Array.isArray(data.tags)) {
    tags = [...data.tags];
  }
  // 如果没有提供tags但提供了单个tag（兼容旧数据），将其作为数组的第一个元素
  else if (data.tag) {
    tags = [data.tag];
  }

  // 确保至少有一个默认标签
  if (tags.length === 0) {
    tags = [SOUP_TAGS.UNKNOWN];
  }

  return {
    soupId: data.soupId || `local_${Date.now()}`,
    title: data.title || '',
    contentLines: data.contentLines || [],
    truth: data.truth || '',
    soupType: data.soupType !== undefined ? data.soupType : SOUP_TYPES.PRESET,
    tags: tags,
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
