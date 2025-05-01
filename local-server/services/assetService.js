/**
 * 资源管理服务
 * 用于管理小程序中的icon、banner、font等资源
 *
 * 集成了资源管理的数据访问、业务逻辑和路由处理
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const multer = require('multer');
const assetData = require('../dataAccess/assetData');
const { ASSET_TYPES, ASSET_PATHS, SERVER_BASE_URL, ASSET_URL_PREFIX } = require('../models/assetConfig');

// 将fs的回调函数转换为Promise
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

// 配置文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 限制文件大小为10MB
  }
});

// 确保资源目录存在
(async () => {
  for (const dir of Object.values(ASSET_PATHS)) {
    try {
      if (!await existsAsync(dir)) {
        console.log(`创建资源目录: ${dir}`);
        await mkdirAsync(dir, { recursive: true });
      } else {
        console.log(`资源目录已存在: ${dir}`);
      }
    } catch (error) {
      console.error(`创建目录失败: ${dir}`, error);
    }
  }
})();

/**
 * 将相对路径转换为绝对路径URL
 * @param {string} url - 资源URL
 * @returns {string} - 绝对路径URL
 */
function toAbsoluteUrl(url) {
  // 如果URL为空，直接返回
  if (!url) return url;

  // 如果已经是绝对路径，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // 如果是小程序内部路径，不处理
  if (url.startsWith('/pages/')) {
    return url;
  }

  // 转换为绝对路径
  return SERVER_BASE_URL + (url.startsWith('/') ? url : '/' + url);
}

/**
 * 获取资源列表
 * @param {string} type - 资源类型
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页数量
 * @param {string} options.keyword - 关键词搜索
 * @param {string} options.sortBy - 排序字段
 * @param {string} options.sortOrder - 排序方向 (asc/desc)
 * @returns {Promise<Object>} - 资源列表和总数
 */
async function getAssets(type, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    keyword = '',
    sortBy = 'createTime',
    sortOrder = 'desc',
    status = 'active'
  } = options;

  try {
    // 获取所有资源
    let assets = await assetData.getAllAssets();

    // 过滤资源类型
    if (type && type !== 'all') {
      assets = assets.filter(asset => asset.type === type);
    }

    // 过滤状态
    if (status) {
      assets = assets.filter(asset => asset.status === status);
    }

    // 关键词搜索
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      assets = assets.filter(asset =>
        asset.name.toLowerCase().includes(lowerKeyword) ||
        (asset.description && asset.description.toLowerCase().includes(lowerKeyword))
      );
    }

    // 排序
    assets.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (sortOrder.toLowerCase() === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // 分页
    const total = assets.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedAssets = assets.slice(startIndex, startIndex + pageSize);

    return {
      assets: paginatedAssets,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error) {
    console.error('获取资源列表失败:', error);
    throw new Error('获取资源列表失败');
  }
}

/**
 * 获取单个资源
 * @param {string} id - 资源ID
 * @returns {Promise<Object>} - 资源信息
 */
async function getAssetById(id) {
  try {
    const asset = await assetData.getAssetById(id);

    if (!asset) {
      throw new Error('资源不存在');
    }

    return asset;
  } catch (error) {
    console.error('获取资源失败:', error);
    throw new Error('获取资源失败');
  }
}

/**
 * 获取指定页面的banner
 * @param {string} page - 页面标识
 * @returns {Promise<Array>} - banner列表
 */
async function getBanners(page) {
  try {
    // 获取所有资源
    const assets = await assetData.getAllAssets();

    // 过滤banner
    const banners = assets.filter(asset =>
      asset.type === ASSET_TYPES.BANNER &&
      asset.page === page &&
      asset.status === 'active'
    );

    // 按排序顺序排序
    banners.sort((a, b) => a.sortOrder - b.sortOrder);

    // 转换为前端需要的格式，确保URL是绝对路径
    return banners.map(banner => ({
      id: banner.id,
      title: banner.name,
      subtitle: banner.description,
      imageUrl: toAbsoluteUrl(banner.url),
      linkUrl: toAbsoluteUrl(banner.linkUrl || ''),
      bgColor: banner.bgColor || '',
      sortOrder: banner.sortOrder || 0,
      status: banner.status || 'active',
      page: banner.page || 'mine'
    }));
  } catch (error) {
    console.error('获取Banner失败:', error);
    throw new Error('获取Banner失败');
  }
}

/**
 * 获取指定类型的图标
 * @param {string} category - 图标分类
 * @returns {Promise<Array>} - 图标列表
 */
async function getIcons(category) {
  try {
    // 获取所有资源
    const assets = await assetData.getAllAssets();

    // 过滤图标
    let icons = assets.filter(asset =>
      asset.type === ASSET_TYPES.ICON &&
      asset.status === 'active'
    );

    // 按分类过滤
    if (category) {
      icons = icons.filter(icon => icon.category === category);
    }

    // 按排序顺序排序
    icons.sort((a, b) => a.sortOrder - b.sortOrder);

    // 转换为前端需要的格式，确保URL是绝对路径
    return icons.map(icon => ({
      id: icon.id,
      name: icon.name,
      url: toAbsoluteUrl(icon.url),
      category: icon.category
    }));
  } catch (error) {
    console.error('获取图标失败:', error);
    throw new Error('获取图标失败');
  }
}

/**
 * 查找用户的头像资源（内部使用）
 * @param {string} userId - 用户ID
 * @returns {Promise<Object|null>} - 原始头像资源对象或null
 */
async function findUserAvatar(userId) {
  if (!userId) return null;

  try {
    // 获取所有资源
    const assets = await assetData.getAllAssets();

    // 查找该用户的头像
    return assets.find(asset =>
      asset.type === ASSET_TYPES.AVATAR &&
      asset.userId === userId &&
      asset.status === 'active'
    ) || null;
  } catch (error) {
    console.error('查找用户头像失败:', error);
    return null;
  }
}

/**
 * 获取头像资源
 * @param {string} userId - 用户ID（可选）
 * @returns {Promise<Array|Object>} - 头像列表或单个头像
 */
async function getAvatars(userId) {
  try {
    // 获取所有资源
    const assets = await assetData.getAllAssets();

    // 过滤头像
    let avatars = assets.filter(asset =>
      asset.type === ASSET_TYPES.AVATAR &&
      asset.status === 'active'
    );

    // 按排序顺序排序
    avatars.sort((a, b) => a.sortOrder - b.sortOrder);

    // 转换为前端需要的格式，确保URL是绝对路径
    const formattedAvatars = avatars.map(avatar => ({
      id: avatar.id,
      url: toAbsoluteUrl(avatar.url),
      userId: avatar.userId || ''
    }));

    // 如果指定了用户ID，返回该用户的头像
    if (userId) {
      const userAvatar = formattedAvatars.find(avatar => avatar.userId === userId);
      return userAvatar || null;
    }

    return formattedAvatars;
  } catch (error) {
    console.error('获取头像失败:', error);
    throw new Error('获取头像失败');
  }
}

/**
 * 上传资源
 * @param {Object} file - 文件对象
 * @param {Object} metadata - 资源元数据
 * @param {string} metadata.type - 资源类型
 * @param {string} metadata.name - 资源名称 (avatar类型可选，会自动生成)
 * @param {string} metadata.description - 资源描述 (avatar类型不需要)
 * @param {string} metadata.page - 页面标识 (仅banner类型需要)
 * @param {string} metadata.category - 分类 (可选)
 * @param {string} metadata.linkUrl - 链接URL (仅banner类型需要)
 * @param {string} metadata.bgColor - 背景色 (仅banner类型需要)
 * @param {number} metadata.sortOrder - 排序顺序
 * @param {string} metadata.userId - 用户ID (仅avatar类型需要)
 * @returns {Promise<Object>} - 上传结果
 */
async function uploadAsset(file, metadata) {
  const {
    type = ASSET_TYPES.OTHER,
    name,
    description = '',
    page = '',
    category = '',
    linkUrl = '',
    bgColor = '',
    sortOrder = 0,
    userId = ''
  } = metadata;

  if (!file) {
    throw new Error('文件不能为空');
  }

  // 对于非头像类型，名称是必需的
  if (!name && type.toUpperCase() !== 'AVATAR') {
    throw new Error('资源名称不能为空');
  }

  const assetType = type.toUpperCase();
  if (!ASSET_TYPES[assetType]) {
    throw new Error('无效的资源类型');
  }

  // Banner类型的特殊验证
  if (assetType === 'BANNER' && !page) {
    throw new Error('Banner资源必须指定页面');
  }

  // Avatar类型的特殊验证
  if (assetType === 'AVATAR' && !userId) {
    throw new Error('头像资源必须指定用户ID');
  }

  try {
    const typePath = ASSET_TYPES[assetType];
    const fileExt = path.extname(file.originalname).toLowerCase();
    let fileName, filePath, relativeUrl, url;
    let existingAvatar = null;
    const now = new Date().toISOString();

    // 头像类型特殊处理
    if (assetType === 'AVATAR' && userId) {
      // 查找用户现有头像
      existingAvatar = await findUserAvatar(userId);

      // 格式化头像文件名，使用用户ID作为文件名的一部分
      // 格式: avatar_userId_timestamp.ext
      fileName = `avatar_${userId}_${Date.now()}${fileExt}`;
      filePath = path.join(ASSET_PATHS[typePath], fileName);

      // 如果存在旧头像，删除旧文件
      if (existingAvatar && existingAvatar.url) {
        try {
          const oldFilePath = path.join(process.cwd(), existingAvatar.url.replace(/^\//, ''));
          if (await existsAsync(oldFilePath)) {
            await unlinkAsync(oldFilePath);
            console.log(`删除旧头像文件: ${oldFilePath}`);
          }
        } catch (err) {
          console.error('删除旧头像文件失败:', err);
          // 继续处理，不中断上传流程
        }
      }
    } else {
      // 其他类型资源使用UUID作为文件名
      fileName = `${uuidv4()}${fileExt}`;
      filePath = path.join(ASSET_PATHS[typePath], fileName);
    }

    // 保存文件
    await writeFileAsync(filePath, file.buffer);

    // 生成访问URL（使用相对路径，然后转换为绝对路径）
    relativeUrl = `${ASSET_URL_PREFIX}/${typePath}s/${fileName}`;
    url = toAbsoluteUrl(relativeUrl);
    console.log(`生成资源URL: ${url}`);

    // 为头像类型自动生成名称
    let assetName = name;
    let assetDescription = description;

    if (typePath === ASSET_TYPES.AVATAR) {
      assetName = `用户头像_${userId}_${now.substring(0, 10)}`;
      assetDescription = '';
    }

    // 如果是更新头像，使用现有记录的ID
    const id = (existingAvatar) ? existingAvatar.id : uuidv4();

    // 基础资源对象
    const asset = {
      id,
      type: typePath,
      name: assetName,
      description: assetDescription,
      url,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      category,
      sortOrder: parseInt(sortOrder) || 0,
      status: 'active',
      createTime: existingAvatar ? existingAvatar.createTime : now,
      updateTime: now
    };

    // 根据资源类型添加特定属性
    if (typePath === ASSET_TYPES.BANNER) {
      asset.page = page;
      asset.linkUrl = linkUrl;
      asset.bgColor = bgColor;
    } else if (typePath === ASSET_TYPES.AVATAR) {
      asset.userId = userId;
    }

    // 保存资源信息
    if (existingAvatar) {
      // 更新现有头像记录
      await assetData.updateAsset(existingAvatar.id, asset);
      console.log(`更新用户 ${userId} 的头像记录`);
    } else {
      // 添加新资源记录
      await assetData.addAsset(asset);
      console.log(`添加新${typePath}资源记录`);
    }

    return asset;
  } catch (error) {
    console.error('上传资源失败:', error);
    throw new Error('上传资源失败: ' + error.message);
  }
}

/**
 * 更新资源信息
 * @param {string} id - 资源ID
 * @param {Object} updates - 更新内容
 * @returns {Promise<Object>} - 更新结果
 */
async function updateAsset(id, updates) {
  try {
    // 获取当前资源信息
    const currentAsset = await assetData.getAssetById(id);
    if (!currentAsset) {
      throw new Error('资源不存在');
    }

    // 允许更新的基础字段
    const allowedFields = [
      'name', 'description', 'category', 'sortOrder', 'status'
    ];

    // 根据资源类型添加特定可更新字段
    if (currentAsset.type === ASSET_TYPES.BANNER) {
      allowedFields.push('page', 'linkUrl', 'bgColor');
    } else if (currentAsset.type === ASSET_TYPES.AVATAR) {
      allowedFields.push('userId');
    }

    // 过滤无效的更新字段
    const validUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        validUpdates[field] = updates[field];
      }
    });

    if (Object.keys(validUpdates).length === 0) {
      throw new Error('没有提供有效的更新字段');
    }

    // Banner类型的特殊验证
    if (currentAsset.type === ASSET_TYPES.BANNER && validUpdates.page === '') {
      throw new Error('Banner资源必须指定页面');
    }

    // 添加更新时间
    validUpdates.updateTime = new Date().toISOString();

    // 更新资源
    const updatedAsset = await assetData.updateAsset(id, validUpdates);

    if (!updatedAsset) {
      throw new Error('资源更新失败');
    }

    return updatedAsset;
  } catch (error) {
    console.error('更新资源失败:', error);
    throw new Error('更新资源失败: ' + error.message);
  }
}

/**
 * 删除资源
 * @param {string} id - 资源ID
 * @returns {Promise<boolean>} - 删除结果
 */
async function deleteAsset(id) {
  try {
    // 获取资源信息
    const asset = await assetData.getAssetById(id);

    if (!asset) {
      throw new Error('资源不存在');
    }

    // 删除文件
    if (asset.url) {
      const filePath = path.join(process.cwd(), asset.url.replace(/^\//, ''));
      if (await existsAsync(filePath)) {
        await unlinkAsync(filePath);
      }
    }

    // 删除资源记录
    const result = await assetData.deleteAsset(id);

    return result;
  } catch (error) {
    console.error('删除资源失败:', error);
    throw new Error('删除资源失败: ' + error.message);
  }
}

/**
 * 批量更新资源排序
 * @param {Array<Object>} items - 资源排序项 [{id, sortOrder}]
 * @returns {Promise<boolean>} - 更新结果
 */
async function updateAssetOrder(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('无效的排序数据');
  }

  try {
    // 批量更新排序
    await assetData.updateAssetOrder(items);

    return true;
  } catch (error) {
    console.error('更新资源排序失败:', error);
    throw new Error('更新资源排序失败: ' + error.message);
  }
}

/**
 * 通用响应处理函数
 * @param {Object} res - Express响应对象
 * @param {boolean} success - 是否成功
 * @param {*} data - 响应数据
 * @param {number} statusCode - HTTP状态码
 * @returns {Object} - Express响应
 */
function sendResponse(res, success, data, statusCode = 200) {
  return res.status(statusCode).json({
    success,
    data: success ? data : undefined,
    error: !success ? data : undefined
  });
}

/**
 * 初始化资源服务
 * @returns {Promise<void>}
 */
async function init() {
  try {
    // 确保资源数据目录存在
    const dataDir = path.join(__dirname, '../data');
    if (!await existsAsync(dataDir)) {
      await mkdirAsync(dataDir, { recursive: true });
    }

    // 确保资源数据文件存在
    const assetsFilePath = path.join(dataDir, 'assets.json');
    if (!await existsAsync(assetsFilePath)) {
      await writeFileAsync(assetsFilePath, JSON.stringify({ assets: [] }, null, 2), 'utf8');
    }

    console.log('资源服务初始化完成');
  } catch (error) {
    console.error('资源服务初始化失败:', error);
    throw error;
  }
}

/**
 * 初始化资源服务路由
 * @param {Object} app - Express应用实例
 */
function initAssetRoutes(app) {
  // 资源基础路径
  const assetBasePath = '/yishao-api/asset/';

  /**
   * 1. 获取资源列表
   * GET /yishao-api/asset/list?type=banner&page=1&pageSize=20&keyword=&sortBy=createTime&sortOrder=desc
   */
  app.get(assetBasePath + 'list', async (req, res) => {
    try {
      const { type, page, pageSize, keyword, sortBy, sortOrder, status } = req.query;

      const options = {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 20,
        keyword: keyword || '',
        sortBy: sortBy || 'createTime',
        sortOrder: sortOrder || 'desc',
        status: status || 'active'
      };

      const result = await getAssets(type, options);
      return sendResponse(res, true, {
        assets: result.assets,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('获取资源列表失败:', error);
      return sendResponse(res, false, '获取资源列表失败: ' + error.message, 500);
    }
  });

  /**
   * 2. 获取单个资源
   * GET /yishao-api/asset/:id
   */
  app.get(assetBasePath + ':id', async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await getAssetById(id);

      if (!asset) {
        return sendResponse(res, false, '资源不存在', 404);
      }

      return sendResponse(res, true, asset);
    } catch (error) {
      console.error('获取资源失败:', error);
      return sendResponse(res, false, '获取资源失败: ' + error.message, 500);
    }
  });

  /**
   * 3. 获取资源
   * GET /yishao-api/asset/:id - 获取单个资源
   * GET /yishao-api/asset/all - 获取所有资源
   * GET /yishao-api/asset/type/:type - 获取指定类型的资源
   */
  app.get(assetBasePath + 'all', async (_, res) => {
    try {
      // 获取所有资源
      const assets = await assetData.getAllAssets();
      return sendResponse(res, true, assets);
    } catch (error) {
      console.error('获取所有资源失败:', error);
      return sendResponse(res, false, '获取所有资源失败: ' + error.message, 500);
    }
  });

  /**
   * 获取指定类型的资源
   * GET /yishao-api/asset/type/:type?page=xxx
   */
  app.get(assetBasePath + 'type/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const { page, status = 'active', userId } = req.query;

      console.log(`收到获取${type}类型资源请求，页面参数: ${page || '所有'}, 用户ID: ${userId || '所有'}`);

      // 获取所有资源
      const assets = await assetData.getAllAssets();

      // 筛选指定类型的资源
      let filteredAssets = assets.filter(asset =>
        asset.type === type &&
        asset.status === status
      );

      // 如果指定了页面参数，进一步筛选
      if (page && type === ASSET_TYPES.BANNER) {
        filteredAssets = filteredAssets.filter(asset => asset.page === page);
      }

      // 如果指定了用户ID，进一步筛选
      if (userId && type === ASSET_TYPES.AVATAR) {
        filteredAssets = filteredAssets.filter(asset => asset.userId === userId);
      }

      // 按排序顺序排序
      filteredAssets.sort((a, b) => a.sortOrder - b.sortOrder);

      console.log(`筛选出${type}类型资源数量: ${filteredAssets.length}`);

      // 如果是banner类型，转换为前端需要的格式
      if (type === ASSET_TYPES.BANNER) {
        const banners = filteredAssets.map(banner => ({
          id: banner.id,
          title: banner.name,
          subtitle: banner.description,
          imageUrl: toAbsoluteUrl(banner.url),
          linkUrl: toAbsoluteUrl(banner.linkUrl || ''),
          bgColor: banner.bgColor || '',
          sortOrder: banner.sortOrder || 0,
          status: banner.status || 'active',
          page: banner.page || 'index'
        }));

        return sendResponse(res, true, banners);
      }

      // 如果是avatar类型，转换为前端需要的格式
      if (type === ASSET_TYPES.AVATAR) {
        const avatars = filteredAssets.map(avatar => ({
          id: avatar.id,
          url: toAbsoluteUrl(avatar.url),
          userId: avatar.userId || ''
        }));

        // 如果指定了用户ID且找到了头像，返回第一个匹配的头像
        if (userId && avatars.length > 0) {
          return sendResponse(res, true, avatars[0]);
        }

        return sendResponse(res, true, avatars);
      }

      return sendResponse(res, true, filteredAssets);
    } catch (error) {
      console.error(`获取资源类型失败:`, error);
      // 返回空数组而不是错误，这样前端可以显示默认内容
      return sendResponse(res, true, []);
    }
  });

  /**
   * 4. 获取用户头像
   * GET /yishao-api/asset/avatar/:userId
   */
  app.get(assetBasePath + 'avatar/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return sendResponse(res, false, '用户ID不能为空', 400);
      }

      // 获取用户头像
      const avatar = await getAvatars(userId);

      if (!avatar) {
        // 如果没有找到用户头像，返回空对象而不是错误
        return sendResponse(res, true, null);
      }

      return sendResponse(res, true, avatar);
    } catch (error) {
      console.error('获取用户头像失败:', error);
      // 返回空对象而不是错误，这样前端可以显示默认头像
      return sendResponse(res, true, null);
    }
  });

  /**
   * 5. 上传资源
   * POST /yishao-api/asset/upload
   */
  app.post(assetBasePath + 'upload', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const metadata = req.body;

      if (!file) {
        return sendResponse(res, false, '文件不能为空', 400);
      }

      const result = await uploadAsset(file, metadata);
      return sendResponse(res, true, result);
    } catch (error) {
      console.error('上传资源失败:', error);
      return sendResponse(res, false, '上传资源失败: ' + error.message, 500);
    }
  });

  /**
   * 6. 更新资源信息
   * PUT /yishao-api/asset/update/:id
   */
  app.put(assetBasePath + 'update/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await updateAsset(id, updates);

      if (!result) {
        return sendResponse(res, false, '资源不存在', 404);
      }

      return sendResponse(res, true, result);
    } catch (error) {
      console.error('更新资源失败:', error);
      return sendResponse(res, false, '更新资源失败: ' + error.message, 500);
    }
  });

  /**
   * 7. 删除资源
   * DELETE /yishao-api/asset/delete/:id
   */
  app.delete(assetBasePath + 'delete/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const result = await deleteAsset(id);

      if (!result) {
        return sendResponse(res, false, '资源不存在或删除失败', 404);
      }

      return sendResponse(res, true, { message: '资源删除成功' });
    } catch (error) {
      console.error('删除资源失败:', error);
      return sendResponse(res, false, '删除资源失败: ' + error.message, 500);
    }
  });

  /**
   * 8. 批量更新资源排序
   * PUT /yishao-api/asset/order
   */
  app.put(assetBasePath + 'order', async (req, res) => {
    try {
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return sendResponse(res, false, '无效的排序数据', 400);
      }

      await updateAssetOrder(items);
      return sendResponse(res, true, { message: '资源排序更新成功' });
    } catch (error) {
      console.error('更新资源排序失败:', error);
      return sendResponse(res, false, '更新资源排序失败: ' + error.message, 500);
    }
  });
}

module.exports = {
  ASSET_TYPES,
  getAssets,
  getAssetById,
  getBanners,
  getIcons,
  getAvatars,
  findUserAvatar,
  uploadAsset,
  updateAsset,
  deleteAsset,
  updateAssetOrder,
  init,
  initAssetRoutes
};