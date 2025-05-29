/**
 * URL配置管理模块
 * 实现环境隔离的URL配置
 * 支持开发环境和生产环境的配置切换
 */

// 获取全局应用实例
const App = getApp();

// 从全局配置中获取环境信息
const isDevelopment = () => App.globalData.isDevelopment();

// ==================== 开发环境配置 ====================
const devConfig = {
  // 汤面服务配置
  soup: {
    baseUrl: 'http://localhost:8080/soup',
    endpoints: {
      get: '/get/',
      random: '/random',
      create: '/create',
      like: '/like/',
      unlike: '/unlike/',
      favorite: '/favor/',
      unfavorite: '/unfavor/',
      view: '/view/'
    }
  },
  
  // 用户代理服务配置
  agent: {
    baseUrl: 'http://localhost:8081/agent',
    endpoints: {
      chat: '/chat'
    }
  },

  // 对话服务配置
  dialog: {
    baseUrl: 'http://localhost:8082/dialog',
    endpoints: {
      get: '/get',
      list: '/list',
      byUser: '/user/',
      bySoup: '/soup/',
      chatData: '/chat-data'
    }
  },

  // 用户服务配置
  user: {
    baseUrl: 'http://localhost:8083/user',
    endpoints: {
      login: '/login',
      update: '/update',
      info: '/info',
      signin: '/signin',
      list: '/list',
      viewedSoup: '/viewed-soup',
      answeredSoup: '/answered-soup',
      createdSoup: '/created-soup',
      favoriteSoup: '/favorite-soup',
      likedSoup: '/liked-soup',
      solvedSoup: '/solved-soup'
    }
  }
};

// ==================== 生产环境配置 ====================
const prodConfig = {
  // 汤面服务配置
  soup: {
    baseUrl: 'http://and-tech.cn/soup',
    endpoints: {
      get: '/get/',
      random: '/random',
      create: '/create',
      like: '/like/',
      unlike: '/unlike/',
      favorite: '/favor/',
      unfavorite: '/unfavor/',
      view: '/view/'
    }
  },
  
  // 用户代理服务配置
  agent: {
    baseUrl: 'http://and-tech.cn/agent',
    endpoints: {
      chat: '/chat'
    }
  },

  // 对话服务配置
  dialog: {
    baseUrl: 'http://and-tech.cn/dialog',
    endpoints: {
      get: '/get',
      list: '/list',
      byUser: '/user/',
      bySoup: '/soup/',
      chatData: '/chat-data'
    }
  },

  // 用户服务配置
  user: {
    baseUrl: 'http://and-tech.cn/user',
    endpoints: {
      login: '/login',
      update: '/update',
      info: '/info',
      signin: '/signin',
      list: '/list',
      viewedSoup: '/viewed-soup',
      answeredSoup: '/answered-soup',
      createdSoup: '/created-soup',
      favoriteSoup: '/favorite-soup',
      likedSoup: '/liked-soup',
      solvedSoup: '/solved-soup'
    }
  }
};

/**
 * 获取当前环境的URL配置
 * @returns {Object} 当前环境的URL配置
 */
const getUrlConfig = () => {
  return isDevelopment() ? devConfig : prodConfig;
};

/**
 * 获取完整的API URL
 * @param {string} service - 服务名称 (soup, agent)
 * @param {string} endpoint - 端点名称
 * @param {string} [id] - 可选的资源ID
 * @returns {string} 完整的API URL
 */
const getFullUrl = (service, endpoint, id = '') => {
  const config = getUrlConfig();
  const serviceConfig = config[service];
  
  if (!serviceConfig) {
    console.error(`未找到服务配置: ${service}`);
    return '';
  }
  
  const endpointPath = serviceConfig.endpoints[endpoint];
  if (!endpointPath) {
    console.error(`未找到端点配置: ${service}.${endpoint}`);
    return '';
  }
  
  // 如果端点路径包含斜杠结尾且提供了ID，则拼接ID
  if (endpointPath.endsWith('/') && id) {
    return `${serviceConfig.baseUrl}${endpointPath}${id}`;
  }
  
  // 否则直接返回完整路径
  return `${serviceConfig.baseUrl}${endpointPath}`;
};

module.exports = {
  // 配置获取
  getUrlConfig,
  getFullUrl,
  
  // 汤面服务URL构建函数
  soupUrl: {
    get: (id) => getFullUrl('soup', 'get', id),
    random: () => getFullUrl('soup', 'random'),
    create: () => getFullUrl('soup', 'create'),
    like: (id) => getFullUrl('soup', 'like', id),
    unlike: (id) => getFullUrl('soup', 'unlike', id),
    favorite: (id) => getFullUrl('soup', 'favorite', id),
    unfavorite: (id) => getFullUrl('soup', 'unfavorite', id),
    view: (id) => getFullUrl('soup', 'view', id)
  },
  
  // 代理服务URL构建函数
  agentUrl: {
    chat: () => getFullUrl('agent', 'chat')
  },

  // 对话服务URL构建函数
  dialogUrl: {
    base: () => {
      const config = getUrlConfig();
      return `${config.dialog.baseUrl}/`;
    },
    get: () => getFullUrl('dialog', 'get'),
    list: () => getFullUrl('dialog', 'list'),
    byUser: (userId) => getFullUrl('dialog', 'byUser', userId),
    bySoup: (soupId) => getFullUrl('dialog', 'bySoup', soupId),
    chatData: () => getFullUrl('dialog', 'chatData')
  },

  // 用户服务URL构建函数
  userUrl: {
    login: () => getFullUrl('user', 'login'),
    update: () => getFullUrl('user', 'update'),
    info: () => getFullUrl('user', 'info'),
    signin: () => getFullUrl('user', 'signin'),
    list: () => getFullUrl('user', 'list'),
    viewedSoup: () => getFullUrl('user', 'viewedSoup'),
    answeredSoup: () => getFullUrl('user', 'answeredSoup'),
    createdSoup: () => getFullUrl('user', 'createdSoup'),
    favoriteSoup: () => getFullUrl('user', 'favoriteSoup'),
    likedSoup: () => getFullUrl('user', 'likedSoup'),
    solvedSoup: () => getFullUrl('user', 'solvedSoup')
  }
};