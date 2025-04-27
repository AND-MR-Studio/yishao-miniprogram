/**
 * 资源管理配置
 */
const path = require('path');

// 资源类型
const ASSET_TYPES = {
  ICON: 'icon',
  BANNER: 'banner',
  FONT: 'font',
  IMAGE: 'image',
  AVATAR: 'avatar',
  OTHER: 'other'
};

// 上传目录
const UPLOAD_DIR = path.join(__dirname, '../html/uploads');

// 资源存储路径
const ASSET_PATHS = {
  [ASSET_TYPES.ICON]: path.join(UPLOAD_DIR, 'icons'),
  [ASSET_TYPES.BANNER]: path.join(UPLOAD_DIR, 'banners'),
  [ASSET_TYPES.FONT]: path.join(UPLOAD_DIR, 'fonts'),
  [ASSET_TYPES.IMAGE]: path.join(UPLOAD_DIR, 'images'),
  [ASSET_TYPES.AVATAR]: path.join(UPLOAD_DIR, 'avatars'),
  [ASSET_TYPES.OTHER]: path.join(UPLOAD_DIR, 'others')
};

// 服务器基础URL
const SERVER_BASE_URL = 'http://14.103.193.11:8080';

// 资源URL前缀（相对路径）
const ASSET_URL_PREFIX = '/uploads';

// 资源URL前缀（绝对路径）
const ASSET_ABSOLUTE_URL_PREFIX = `${SERVER_BASE_URL}${ASSET_URL_PREFIX}`;

module.exports = {
  ASSET_TYPES,
  UPLOAD_DIR,
  ASSET_PATHS,
  ASSET_URL_PREFIX,
  SERVER_BASE_URL,
  ASSET_ABSOLUTE_URL_PREFIX
};
