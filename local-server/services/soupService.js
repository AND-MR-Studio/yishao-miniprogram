/**
 * 海龟汤服务 - RESTful yishao-api实现
 * 提供符合RESTful规范的海龟汤数据CRUD操作
 * 遵循简洁设计原则，只提供必要的yishao-api接口
 */
const soupDataAccess = require('../dataAccess/soupDataAccess');
const { SOUP_TYPES, SOUP_TAGS, validateSoup } = require('../models/soupModel');

/**
 * 获取客户端IP地址
 * @param {Object} req Express请求对象
 * @returns {string} IP地址
 */
function getClientIp(req) {
  return req.ip ||
         req.headers['x-forwarded-for'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         '127.0.0.1';
}

/**
 * 获取海龟汤数据
 * @param {string|string[]|null} [soupId] 海龟汤ID或ID数组，如果不提供或为空数组则获取所有海龟汤
 * @returns {Promise<Object|Array>} 海龟汤数据或海龟汤列表
 */
async function getSoup(soupId) {
  try {
    // 如果没有提供参数或提供了空数组，获取所有海龟汤
    if (!soupId || (Array.isArray(soupId) && soupId.length === 0)) {
      return await soupDataAccess.getAllSoups();
    }

    // 如果是非空数组，获取多个海龟汤
    if (Array.isArray(soupId)) {
      return await soupDataAccess.getSoupsByIds(soupId);
    }

    // 如果提供了单个ID，获取单个海龟汤
    return await soupDataAccess.getSoupById(soupId);
  } catch (err) {
    console.error('获取海龟汤数据失败:', err);
    return Array.isArray(soupId) ? [] : null;
  }
}

/**
 * 创建新海龟汤
 * @param {Object} soupData 海龟汤数据
 * @param {Object} req Express请求对象
 * @returns {Promise<Object|null>} 创建的海龟汤数据
 */
async function createSoup(soupData, req) {
  try {
    // 验证数据
    const validation = validateSoup(soupData);
    if (!validation.valid) {
      throw new Error(`无效的海龟汤数据: ${validation.errors.join(', ')}`);
    }

    // 获取客户端IP
    const clientIp = getClientIp(req);

    // 准备数据
    const newSoupData = {
      ...soupData,
      publishIp: clientIp,
      updateIp: clientIp
    };

    // 创建海龟汤
    return await soupDataAccess.createSoup(newSoupData);
  } catch (err) {
    console.error('创建海龟汤失败:', err);
    return null;
  }
}

/**
 * 更新海龟汤数据
 * @param {string} soupId 海龟汤ID
 * @param {Object} soupData 海龟汤数据
 * @param {Object} req Express请求对象
 * @returns {Promise<Object|null>} 更新后的海龟汤数据
 */
async function updateSoup(soupId, soupData, req) {
  try {
    if (!soupId) {
      throw new Error('缺少海龟汤ID');
    }

    // 获取客户端IP
    const clientIp = getClientIp(req);

    // 准备更新数据
    const updateData = {
      ...soupData,
      updateIp: clientIp
    };

    // 处理增加阅读数
    if (soupData.incrementView) {
      const soup = await soupDataAccess.getSoupById(soupId);
      if (soup) {
        updateData.viewCount = (soup.viewCount || 0) + 1;
        delete updateData.incrementView;
      }
    }

    // 更新海龟汤
    return await soupDataAccess.updateSoup(soupId, updateData);
  } catch (err) {
    console.error('更新海龟汤失败:', err);
    return null;
  }
}

/**
 * 删除海龟汤
 * @param {string} soupId 海龟汤ID
 * @returns {Promise<Object>} 删除结果，包含删除的海龟汤数据
 */
async function deleteSoup(soupId) {
  return await soupDataAccess.deleteSoup(soupId);
}

/**
 * 批量删除海龟汤
 * @param {string[]} soupIds 海龟汤ID数组
 * @returns {Promise<Object>} 删除结果，包含删除的海龟汤数量
 */
async function deleteSoups(soupIds) {
  return await soupDataAccess.deleteSoups(soupIds);
}

/**
 * 通用响应处理函数
 * @param {Object} res Express响应对象
 * @param {boolean} success 是否成功
 * @param {*} data 响应数据
 * @param {number} statusCode HTTP状态码
 * @returns {Object} Express响应对象
 */
function sendResponse(res, success, data, statusCode = 200) {
  return res.status(statusCode).json({
    success,
    data: success ? data : undefined,
    error: !success ? data : undefined
  });
}

/**
 * 初始化海龟汤服务路由
 * 实现RESTful yishao-api规范的路由
 * 简化yishao-api设计，只提供必要的接口
 */
function initSoupRoutes(app) {
  // 基础路径
  const BASE_PATH = '/yishao-api/soup';

  // GET /api/soup - 获取所有海龟汤或根据ID获取特定海龟汤
  app.get(BASE_PATH, async (req, res) => {
    try {
      const { id, type, tags } = req.query;
      let result;

      // 如果指定了标签，按标签筛选
      if (tags !== undefined) {
        // 将逗号分隔的标签字符串转换为数组
        const tagArray = tags.includes(',') ? tags.split(',') : [tags];
        result = await soupDataAccess.getSoupsByTag(tagArray);
      }
      // 如果指定了类型，按类型筛选
      else if (type !== undefined) {
        result = await soupDataAccess.getSoupsByType(parseInt(type));
      } else if (id) {
        // 如果提供了多个ID，转换为数组
        let soupId = id;
        if (id.includes(',')) {
          soupId = id.split(',');
        }
        result = await getSoup(soupId);
      } else {
        // 获取所有海龟汤
        result = await getSoup();
      }

      if (id && !Array.isArray(id) && !result) {
        return sendResponse(res, false, '海龟汤不存在', 404);
      }

      return sendResponse(res, true, result);
    } catch (err) {
      return sendResponse(res, false, '获取海龟汤失败: ' + err.message, 500);
    }
  });

  // GET /api/soup/random - 获取随机海龟汤
  app.get(`${BASE_PATH}/random`, async (_, res) => {
    try {
      const soups = await getSoup();
      if (soups.length === 0) {
        return sendResponse(res, false, '没有可用的海龟汤', 404);
      }

      const randomIndex = Math.floor(Math.random() * soups.length);
      return sendResponse(res, true, soups[randomIndex]);
    } catch (err) {
      return sendResponse(res, false, '获取随机海龟汤失败: ' + err.message, 500);
    }
  });

  // GET /api/soup/tags - 获取所有海龟汤标签
  app.get(`${BASE_PATH}/tags`, async (_, res) => {
    try {
      // 返回所有标签类型
      return sendResponse(res, true, SOUP_TAGS);
    } catch (err) {
      return sendResponse(res, false, '获取海龟汤标签失败: ' + err.message, 500);
    }
  });

  // GET /api/soup/:soupId - 获取指定ID的海龟汤
  app.get(`${BASE_PATH}/:soupId`, async (req, res) => {
    try {
      const soup = await getSoup(req.params.soupId);
      if (soup) {
        return sendResponse(res, true, soup);
      } else {
        return sendResponse(res, false, '海龟汤不存在', 404);
      }
    } catch (err) {
      return sendResponse(res, false, '获取海龟汤失败: ' + err.message, 500);
    }
  });

  // POST /api/soup - 创建新海龟汤
  app.post(BASE_PATH, async (req, res) => {
    try {
      const result = await createSoup(req.body, req);
      if (!result) {
        return sendResponse(res, false, '创建海龟汤失败', 400);
      }
      return sendResponse(res, true, result, 201);
    } catch (err) {
      return sendResponse(res, false, '创建海龟汤失败: ' + err.message, 500);
    }
  });

  // PUT /api/soup/:soupId - 更新指定ID的海龟汤
  app.put(`${BASE_PATH}/:soupId`, async (req, res) => {
    try {
      const result = await updateSoup(req.params.soupId, req.body, req);
      if (!result) {
        return sendResponse(res, false, '更新海龟汤失败', 400);
      }
      return sendResponse(res, true, result);
    } catch (err) {
      return sendResponse(res, false, '更新海龟汤失败: ' + err.message, 500);
    }
  });

  // POST /api/soup/:soupId/like - 点赞海龟汤
  app.post(`${BASE_PATH}/:soupId/like`, async (req, res) => {
    try {
      const soup = await getSoup(req.params.soupId);
      if (!soup) {
        return sendResponse(res, false, '海龟汤不存在', 404);
      }

      const updatedData = {
        likeCount: (soup.likeCount || 0) + 1
      };

      const result = await updateSoup(req.params.soupId, updatedData, req);
      if (!result) {
        return sendResponse(res, false, '点赞失败', 400);
      }
      return sendResponse(res, true, { likeCount: result.likeCount });
    } catch (err) {
      return sendResponse(res, false, '点赞失败: ' + err.message, 500);
    }
  });

  // POST /api/soup/:soupId/view - 增加阅读数
  app.post(`${BASE_PATH}/:soupId/view`, async (req, res) => {
    try {
      const soup = await getSoup(req.params.soupId);
      if (!soup) {
        return sendResponse(res, false, '海龟汤不存在', 404);
      }

      const updatedData = {
        incrementView: true
      };

      const result = await updateSoup(req.params.soupId, updatedData, req);
      if (!result) {
        return sendResponse(res, false, '更新阅读数失败', 400);
      }
      return sendResponse(res, true, { viewCount: result.viewCount });
    } catch (err) {
      return sendResponse(res, false, '更新阅读数失败: ' + err.message, 500);
    }
  });

  // POST /api/soup/:soupId/favorite - 收藏海龟汤
  app.post(`${BASE_PATH}/:soupId/favorite`, async (req, res) => {
    try {
      const soup = await getSoup(req.params.soupId);
      if (!soup) {
        return sendResponse(res, false, '海龟汤不存在', 404);
      }

      // 检查是否是取消收藏操作
      const isUnfavorite = req.query.action === 'unfavorite';

      const updatedData = {
        favoriteCount: isUnfavorite
          ? Math.max((soup.favoriteCount || 0) - 1, 0) // 确保不会小于0
          : (soup.favoriteCount || 0) + 1
      };

      const result = await updateSoup(req.params.soupId, updatedData, req);
      if (!result) {
        return sendResponse(res, false, isUnfavorite ? '取消收藏失败' : '收藏失败', 400);
      }
      return sendResponse(res, true, { favoriteCount: result.favoriteCount });
    } catch (err) {
      return sendResponse(res, false, '收藏操作失败: ' + err.message, 500);
    }
  });

  // POST /api/soup/:soupId/unlike - 不喜欢海龟汤
  app.post(`${BASE_PATH}/:soupId/unlike`, async (req, res) => {
    try {
      const soup = await getSoup(req.params.soupId);
      if (!soup) {
        return sendResponse(res, false, '海龟汤不存在', 404);
      }

      const updatedData = {
        unlikeCount: (soup.unlikeCount || 0) + 1
      };

      const result = await updateSoup(req.params.soupId, updatedData, req);
      if (!result) {
        return sendResponse(res, false, '操作失败', 400);
      }
      return sendResponse(res, true, { unlikeCount: result.unlikeCount });
    } catch (err) {
      return sendResponse(res, false, '操作失败: ' + err.message, 500);
    }
  });

  // DELETE /api/soup/:soupId - 删除指定ID的海龟汤
  app.delete(`${BASE_PATH}/:soupId`, async (req, res) => {
    try {
      const result = await deleteSoup(req.params.soupId);
      if (!result.success) {
        return sendResponse(res, false, result.error, 400);
      }
      return sendResponse(res, true, {
        message: '删除成功',
        deletedSoup: result.deletedSoup
      });
    } catch (err) {
      return sendResponse(res, false, '删除海龟汤失败: ' + err.message, 500);
    }
  });

  // DELETE /api/soup - 批量删除海龟汤
  app.delete(BASE_PATH, async (req, res) => {
    try {
      const { ids } = req.query;
      if (!ids) {
        return sendResponse(res, false, '缺少海龟汤ID参数', 400);
      }

      const soupIds = ids.split(',');
      const result = await deleteSoups(soupIds);

      if (!result.success) {
        return sendResponse(res, false, result.error, 400);
      }

      return sendResponse(res, true, {
        message: `成功删除 ${result.deletedCount} 个海龟汤`,
        deletedCount: result.deletedCount
      });
    } catch (err) {
      return sendResponse(res, false, '批量删除海龟汤失败: ' + err.message, 500);
    }
  });
}

/**
 * 初始化模块
 */
async function init() {
  await soupDataAccess.init();
  console.log('海龟汤服务初始化完成');
}

module.exports = {
  init,
  initSoupRoutes,
  getSoup,
  createSoup,
  updateSoup,
  deleteSoup,
  deleteSoups,
  getClientIp,
  SOUP_TYPES,
  SOUP_TAGS
};
