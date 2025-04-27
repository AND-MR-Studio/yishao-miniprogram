// utils/bannerService.js
const api = require('./api');

/**
 * 获取banner数据
 * @param {string} page - 页面标识，用于获取特定页面的banner
 * @param {boolean} forceRefresh - 是否强制从后端刷新
 * @returns {Promise<Array>} - banner数据数组
 */
async function getBanners(page = 'mine', forceRefresh = true) {
  try {
    // 缓存键
    const cacheKey = `banners_${page}`;
    
    // 如果不强制刷新，尝试从缓存获取
    if (!forceRefresh) {
      const cachedData = wx.getStorageSync(cacheKey);
      if (cachedData && cachedData.expireTime > Date.now()) {
        return cachedData.banners;
      }
    }
    
    // 从后端获取banner数据
    const res = await api.request({
      url: api.banner_url,
      method: 'GET',
      data: { page }
    });
    
    if (res.success && res.data && Array.isArray(res.data)) {
      // 设置缓存，有效期1小时
      const cacheData = {
        banners: res.data,
        expireTime: Date.now() + 3600000 // 1小时后过期
      };
      wx.setStorageSync(cacheKey, cacheData);
      
      return res.data;
    } else {
      console.error('获取banner数据失败:', res.error || '未知错误');
      return [];
    }
  } catch (error) {
    console.error('获取banner数据出错:', error);
    return [];
  }
}

/**
 * 处理banner点击事件
 * @param {Object} banner - banner数据
 */
function handleBannerClick(banner) {
  if (!banner) return;
  
  // 根据banner类型执行不同操作
  switch (banner.actionType) {
    case 'page':
      // 跳转到小程序内部页面
      if (banner.linkUrl) {
        wx.navigateTo({
          url: banner.linkUrl,
          fail: (err) => {
            console.error('导航到页面失败:', err);
            wx.showToast({
              title: '页面跳转失败',
              icon: 'none'
            });
          }
        });
      }
      break;
      
    case 'webview':
      // 打开web-view页面
      if (banner.linkUrl) {
        wx.navigateTo({
          url: `/pages/webview/webview?url=${encodeURIComponent(banner.linkUrl)}`,
          fail: (err) => {
            console.error('打开网页失败:', err);
            wx.showToast({
              title: '打开网页失败',
              icon: 'none'
            });
          }
        });
      }
      break;
      
    case 'function':
      // 执行特定功能，可以通过事件通知页面执行
      // 这里只记录日志，具体功能由页面处理
      console.log('Banner触发功能:', banner.functionName);
      break;
      
    default:
      // 默认不执行任何操作
      console.log('Banner点击，无操作:', banner);
      break;
  }
}

module.exports = {
  getBanners,
  handleBannerClick
};
