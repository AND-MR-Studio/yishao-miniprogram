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
        url: 'http://localhost:8080/agent'
    },

    // 对话服务配置
    dialog: {
        url: 'http://localhost:8080/dialog'
    },

    // 用户服务配置
    user: {
        url: 'http://localhost:8080/user'
    },
};

module.exports = devConfig;