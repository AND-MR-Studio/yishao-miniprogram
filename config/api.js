/**
 * !!!!!!!!!!!!!!该类后续废弃，请使用 api-dev/api-prod/url 代替!!!!!!!!!!!!!!
 */
const ysUrl = "https://and-tech.cn/yishao-api/";
const assetsBaseUrl = "'http://oss.and-tech.cn'";
const assetsPath = "asset";

// API端点定义
const api = {
  // 资源服务
  asset: {
    base: `${ysUrl}${assetsPath}/`,
    byType: (type) => `${ysUrl}${assetsPath}/type/${type}`,
    avatar: (id) => `${ysUrl}${assetsPath}/avatar/${id}`,
    upload: `${ysUrl}${assetsPath}/upload`
  },  // 海龟汤服务
};

// 资源管理
const assets = {
  // 本地静态资源
  local: {
    avatar: '/static/images/default-avatar.jpg'
  },

  // 远程资源
  remote: {
    // 图片资源
    images: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.images}${filename}`,
      share: `${assetsBaseUrl}/${paths.assets.images}test.webp`
    },

    // 图标资源
    icons: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.icons}${filename}`
    },

    // 头像资源
    avatars: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.avatars}${filename}`
    },

    // UI资源
    ui: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.ui}${filename}`,
      notFound: `${assetsBaseUrl}/${paths.assets.ui}404.webp`,
      xiaoshao_avatar: `${assetsBaseUrl}/${paths.assets.ui}xiaoshao.heif`,
      popup: `${assetsBaseUrl}/${paths.assets.ui}popup.png`
    },

    // 字体资源
    fonts: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.fonts}${filename}`
    },

    // 海龟汤配图资源
    cover: {
      get: (soupId) => `${assetsBaseUrl}/${paths.assets.covers}${soupId}.jpeg`
    },

    // Banner资源
    banners: {
      get: (filename) => `${assetsBaseUrl}/${paths.assets.banners}${filename}`
    }
  }
};

module.exports = {

  // 导出基础URL
  // 导出API端点
  api,

  // 导出资源管理
  assets,

  // 导出路径配置
  paths
};