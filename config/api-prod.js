/**
 * 生产环境URL配置
 * 此文件包含所有生产环境的URL配置
 */

const prodConfig = {
    // 汤面服务配置
    soup: {
        url: 'http://alex.and-tech.cn/yishao/api/soups'
    },

    // 用户代理服务配置
    agent: {
        url: 'http://alex.and-tech.cn/yishao/agent'
    },

    // 对话服务配置
    dialog: {
        url: 'http://alex.and-tech.cn/yishao/api/v1/dialog'
    },

    // 用户服务配置
    user: {
        url: 'http://alex.and-tech.cn/yishao/api/users'
    },
};

module.exports = prodConfig;