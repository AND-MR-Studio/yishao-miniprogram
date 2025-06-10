const {addRequestInterceptor, addResponseInterceptor} = require('request');

/**
 * 业务拦截器工具
 */

addRequestInterceptor((config) => {
    // 延迟加载 userStore，避免循环依赖
    const {userStore} = require('../stores/index');
    
    let userId = userStore.userId;
    config.header = config.header || {};
    config.header['X-User-Id'] = userId ? userId : 'guest';

    return config;
})