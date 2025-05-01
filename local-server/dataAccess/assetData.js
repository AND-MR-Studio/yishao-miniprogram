/**
 * 资源数据访问层
 * 用于读写资源数据
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 将fs的回调函数转换为Promise
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// 资源数据文件路径
const ASSETS_FILE_PATH = path.join(__dirname, '../data/assets.json');

/**
 * 读取所有资源数据
 * @returns {Promise<Array>} 资源数据数组
 */
async function getAllAssets() {
  try {
    const data = await readFileAsync(ASSETS_FILE_PATH, 'utf8');
    const jsonData = JSON.parse(data);
    return jsonData.assets || [];
  } catch (error) {
    console.error('读取资源数据失败:', error);
    // 如果文件不存在或读取失败，返回空数组
    return [];
  }
}

/**
 * 保存所有资源数据
 * @param {Array} assets 资源数据数组
 * @returns {Promise<boolean>} 保存结果
 */
async function saveAllAssets(assets) {
  try {
    const jsonData = { assets };
    await writeFileAsync(ASSETS_FILE_PATH, JSON.stringify(jsonData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存资源数据失败:', error);
    throw error;
  }
}

/**
 * 获取单个资源
 * @param {string} id 资源ID
 * @returns {Promise<Object|null>} 资源对象或null
 */
async function getAssetById(id) {
  const assets = await getAllAssets();
  return assets.find(asset => asset.id === id) || null;
}

/**
 * 添加资源
 * @param {Object} asset 资源对象
 * @returns {Promise<Object>} 添加的资源对象
 */
async function addAsset(asset) {
  const assets = await getAllAssets();
  
  // 检查ID是否已存在
  if (assets.some(a => a.id === asset.id)) {
    throw new Error('资源ID已存在');
  }
  
  assets.push(asset);
  await saveAllAssets(assets);
  return asset;
}

/**
 * 更新资源
 * @param {string} id 资源ID
 * @param {Object} updates 更新内容
 * @returns {Promise<Object|null>} 更新后的资源对象或null
 */
async function updateAsset(id, updates) {
  const assets = await getAllAssets();
  const index = assets.findIndex(asset => asset.id === id);
  
  if (index === -1) {
    return null;
  }
  
  // 更新资源
  const updatedAsset = { ...assets[index], ...updates, updateTime: new Date().toISOString() };
  assets[index] = updatedAsset;
  
  await saveAllAssets(assets);
  return updatedAsset;
}

/**
 * 删除资源
 * @param {string} id 资源ID
 * @returns {Promise<boolean>} 删除结果
 */
async function deleteAsset(id) {
  const assets = await getAllAssets();
  const filteredAssets = assets.filter(asset => asset.id !== id);
  
  if (filteredAssets.length === assets.length) {
    return false; // 没有找到要删除的资源
  }
  
  await saveAllAssets(filteredAssets);
  return true;
}

/**
 * 批量更新资源排序
 * @param {Array<Object>} items 资源排序项 [{id, sortOrder}]
 * @returns {Promise<boolean>} 更新结果
 */
async function updateAssetOrder(items) {
  const assets = await getAllAssets();
  
  // 更新排序
  items.forEach(item => {
    const asset = assets.find(a => a.id === item.id);
    if (asset) {
      asset.sortOrder = item.sortOrder;
      asset.updateTime = new Date().toISOString();
    }
  });
  
  await saveAllAssets(assets);
  return true;
}

module.exports = {
  getAllAssets,
  getAssetById,
  addAsset,
  updateAsset,
  deleteAsset,
  updateAssetOrder
};
