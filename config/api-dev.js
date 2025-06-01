/**
 * 开发环境URL配置
 * 此文件包含所有开发环境的URL配置
 */


const devConfig = {
  // 汤面服务配置
  soup: {
    url: 'http://localhost:8080/soup'
  },
  
  // 用户代理服务配置
  agent: {
    url: 'http://localhost:8081/agent'
  },

  // 对话服务配置
  dialog: {
    url: 'http://localhost:8082/dialog'
  },

  // 用户服务配置
  user: {
    url: 'http://localhost:8083/user'
  },
  
  // 资源服务配置
  asset: {
    url: 'http://localhost:8084/asset'
  },
};

module.exports = devConfig;