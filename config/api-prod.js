/**
 * 生产环境URL配置
 * 此文件包含所有生产环境的URL配置
 */

const prodConfig = {
  // todo base后续要删除
  base: {
    baseUrl: 'https://yavin.and-tech.cn',
    ysUrl: 'https://yavin.and-tech.cn/yishao-api/',
    memory: 'http://alex.and-tech.cn/memory',
    assetsBaseUrl: 'http://cdn.and-tech.cn'
  },
  
  // 汤面服务配置
  soup: {
    url: 'http://and-tech.cn/soup'
  },
  
  // 用户代理服务配置
  agent: {
    url: 'http://and-tech.cn/agent'
  },

  // 对话服务配置
  dialog: {
    url: 'http://and-tech.cn/dialog'
  },

  // 用户服务配置
  user: {
    url: 'http://and-tech.cn/user'
  },
  
  // 资源服务配置
  asset: {
    url: 'http://and-tech.cn/asset'
  },
  
  // 环境特有配置
  env: {
    name: '正式环境',
    debug: false,
    logLevel: 'error'
  }
};

module.exports = prodConfig;