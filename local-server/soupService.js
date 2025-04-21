/**
 * 汤面服务 - RESTful API实现
 * 提供符合RESTful规范的汤面数据CRUD操作
 */
const fs = require('fs-extra');
const path = require('path');

// 数据文件路径
const SOUPS_FILE = path.join(__dirname, 'soups.json');

/**
 * 初始化数据文件
 * @returns {Promise<void>}
 */
async function initSoupsFile() {
  try {
    // 确保文件存在
    await fs.ensureFile(SOUPS_FILE);

    // 读取文件内容
    let data;
    try {
      data = await fs.readJson(SOUPS_FILE);
      // 如果数据已存在且有效，直接返回
      if (data && Array.isArray(data) && data.length > 0) {
        return;
      }
    } catch (e) {
      // 文件存在但不是有效的JSON或为空
      console.log('初始化汤面数据文件...');
    }

    // 初始化样本数据
    const initialData = [
      {
        soupId: 'local_001',
        title: '《本地测试汤面1》',
        contentLines: ['这是一个', '本地测试汤面', '用于开发环境测试'],
        truth: '这是一个测试用的汤底',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      {
        soupId: 'local_002',
        title: '《本地测试汤面2》',
        contentLines: ['又一个', '本地测试汤面', '开发环境专用'],
        truth: '这是另一个测试用的汤底',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
    ];

    // 写入初始数据
    await fs.writeJson(SOUPS_FILE, initialData);
    console.log('汤面数据文件初始化完成');
  } catch (err) {
    console.error('初始化汤面数据文件失败:', err);
  }
}

/**
 * 获取汤面数据
 * @param {string|string[]} [soupId] 汤面ID或ID数组，不提供则获取所有汤面
 * @returns {Promise<Array|Object|null>} 汤面数据
 */
async function getSoup(soupId) {
  try {
    await initSoupsFile();
    const soups = await fs.readJson(SOUPS_FILE) || [];

    // 如果没有提供ID，返回所有汤面
    if (!soupId) {
      return soups;
    }

    // 如果提供了ID数组，返回多个汤面
    if (Array.isArray(soupId)) {
      return soups.filter(soup => soupId.includes(soup.soupId));
    }

    // 如果提供了单个ID，返回单个汤面
    return soups.find(soup => soup.soupId === soupId) || null;
  } catch (err) {
    console.error('获取汤面数据失败:', err);
    return Array.isArray(soupId) ? [] : null;
  }
}

/**
 * 创建新汤面
 * @param {Object} soupData 汤面数据
 * @returns {Promise<Object|null>} 创建的汤面数据
 */
async function createSoup(soupData) {
  try {
    if (!soupData || !soupData.title || !soupData.contentLines || !Array.isArray(soupData.contentLines)) {
      throw new Error('无效的汤面数据');
    }

    await initSoupsFile();
    const soups = await fs.readJson(SOUPS_FILE) || [];

    const newSoup = {
      soupId: `local_${Date.now()}`,
      title: soupData.title,
      contentLines: soupData.contentLines,
      truth: soupData.truth || '',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };

    soups.push(newSoup);
    await fs.writeJson(SOUPS_FILE, soups);
    return newSoup;
  } catch (err) {
    console.error('创建汤面失败:', err);
    return null;
  }
}

/**
 * 更新汤面数据
 * @param {string} soupId 汤面ID
 * @param {Object} soupData 汤面数据
 * @returns {Promise<Object|null>} 更新后的汤面数据
 */
async function updateSoup(soupId, soupData) {
  try {
    if (!soupId) {
      throw new Error('缺少汤面ID');
    }

    if (!soupData || (!soupData.title && !soupData.contentLines && !soupData.truth)) {
      throw new Error('无效的汤面数据');
    }

    await initSoupsFile();
    const soups = await fs.readJson(SOUPS_FILE) || [];
    const index = soups.findIndex(s => s.soupId === soupId);

    if (index === -1) {
      throw new Error('汤面不存在');
    }

    const updatedSoup = {
      ...soups[index],
      ...(soupData.title && { title: soupData.title }),
      ...(soupData.contentLines && { contentLines: soupData.contentLines }),
      ...(soupData.truth && { truth: soupData.truth }),
      updateTime: new Date().toISOString()
    };

    soups[index] = updatedSoup;
    await fs.writeJson(SOUPS_FILE, soups);
    return updatedSoup;
  } catch (err) {
    console.error('更新汤面失败:', err);
    return null;
  }
}

/**
 * 删除汤面
 * @param {string} soupId 汤面ID
 * @returns {Promise<Object>} 删除结果，包含删除的汤面数据
 */
async function deleteSoup(soupId) {
  try {
    if (!soupId) {
      throw new Error('缺少汤面ID');
    }

    await initSoupsFile();
    const soups = await fs.readJson(SOUPS_FILE) || [];
    const index = soups.findIndex(s => s.soupId === soupId);

    if (index === -1) {
      throw new Error('汤面不存在');
    }

    const deletedSoup = soups[index];
    soups.splice(index, 1);
    await fs.writeJson(SOUPS_FILE, soups);

    return {
      success: true,
      deletedSoup
    };
  } catch (err) {
    console.error('删除汤面失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * 批量删除汤面
 * @param {string[]} soupIds 汤面ID数组
 * @returns {Promise<Object>} 删除结果，包含删除的汤面数量
 */
async function deleteSoups(soupIds) {
  try {
    if (!Array.isArray(soupIds) || soupIds.length === 0) {
      throw new Error('无效的汤面ID数组');
    }

    await initSoupsFile();
    const soups = await fs.readJson(SOUPS_FILE) || [];
    const initialCount = soups.length;

    // 过滤掉要删除的汤面
    const remainingSoups = soups.filter(soup => !soupIds.includes(soup.soupId));
    const deletedCount = initialCount - remainingSoups.length;

    if (deletedCount === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: '没有找到要删除的汤面'
      };
    }

    await fs.writeJson(SOUPS_FILE, remainingSoups);

    return {
      success: true,
      deletedCount
    };
  } catch (err) {
    console.error('批量删除汤面失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
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
 * 初始化汤面服务路由
 * 实现RESTful API规范的路由
 */
function initSoupRoutes(app) {
  // 基础路径
  const BASE_PATH = '/api/soup';

  // GET /api/soup - 获取所有汤面或根据ID获取特定汤面
  app.get(BASE_PATH, async (req, res) => {
    try {
      const { id } = req.query;
      let soupId = id;

      // 如果提供了多个ID，转换为数组
      if (id && id.includes(',')) {
        soupId = id.split(',');
      }

      const result = await getSoup(soupId);

      if (soupId && !Array.isArray(soupId) && !result) {
        return sendResponse(res, false, '汤面不存在', 404);
      }

      return sendResponse(res, true, result);
    } catch (err) {
      return sendResponse(res, false, '获取汤面失败: ' + err.message, 500);
    }
  });

  // GET /api/soup/random - 获取随机汤面
  // 注意：这个路由必须放在特定汤面ID路由之前，否则Express会将random解析为soupId
  app.get(`${BASE_PATH}/random`, async (_, res) => {
    try {
      const soups = await getSoup();
      if (soups.length === 0) {
        return sendResponse(res, false, '没有可用的汤面', 404);
      }

      const randomIndex = Math.floor(Math.random() * soups.length);
      return sendResponse(res, true, soups[randomIndex]);
    } catch (err) {
      return sendResponse(res, false, '获取随机汤面失败: ' + err.message, 500);
    }
  });

  // GET /api/soup/:soupId - 获取指定ID的汤面
  app.get(`${BASE_PATH}/:soupId`, async (req, res) => {
    try {
      const soup = await getSoup(req.params.soupId);
      if (soup) {
        return sendResponse(res, true, soup);
      } else {
        return sendResponse(res, false, '汤面不存在', 404);
      }
    } catch (err) {
      return sendResponse(res, false, '获取汤面失败: ' + err.message, 500);
    }
  });

  // POST /api/soup - 创建新汤面
  app.post(BASE_PATH, async (req, res) => {
    try {
      const result = await createSoup(req.body);
      if (!result) {
        return sendResponse(res, false, '创建汤面失败', 400);
      }
      return sendResponse(res, true, result, 201);
    } catch (err) {
      return sendResponse(res, false, '创建汤面失败: ' + err.message, 500);
    }
  });

  // PUT /api/soup/:soupId - 更新指定ID的汤面
  app.put(`${BASE_PATH}/:soupId`, async (req, res) => {
    try {
      const result = await updateSoup(req.params.soupId, req.body);
      if (!result) {
        return sendResponse(res, false, '更新汤面失败', 400);
      }
      return sendResponse(res, true, result);
    } catch (err) {
      return sendResponse(res, false, '更新汤面失败: ' + err.message, 500);
    }
  });

  // PATCH /api/soup/:soupId - 部分更新指定ID的汤面
  app.patch(`${BASE_PATH}/:soupId`, async (req, res) => {
    try {
      const result = await updateSoup(req.params.soupId, req.body);
      if (!result) {
        return sendResponse(res, false, '更新汤面失败', 400);
      }
      return sendResponse(res, true, result);
    } catch (err) {
      return sendResponse(res, false, '更新汤面失败: ' + err.message, 500);
    }
  });

  // DELETE /api/soup/:soupId - 删除指定ID的汤面
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
      return sendResponse(res, false, '删除汤面失败: ' + err.message, 500);
    }
  });

  // DELETE /api/soup - 批量删除汤面
  app.delete(BASE_PATH, async (req, res) => {
    try {
      const { ids } = req.query;
      if (!ids) {
        return sendResponse(res, false, '缺少汤面ID参数', 400);
      }

      const soupIds = ids.split(',');
      const result = await deleteSoups(soupIds);

      if (!result.success) {
        return sendResponse(res, false, result.error, 400);
      }

      return sendResponse(res, true, {
        message: `成功删除 ${result.deletedCount} 个汤面`,
        deletedCount: result.deletedCount
      });
    } catch (err) {
      return sendResponse(res, false, '批量删除汤面失败: ' + err.message, 500);
    }
  });
}

/**
 * 初始化模块
 */
async function init() {
  await initSoupsFile();
  console.log('汤面服务初始化完成');
}

module.exports = {
  init,
  initSoupRoutes,
  getSoup,
  createSoup,
  updateSoup,
  deleteSoup,
  deleteSoups
};
