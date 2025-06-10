const {addRequestInterceptor, addResponseInterceptor} = require('request');
const {userStore} = require('../stores/index'); // 从 stores/index.js 引入实例
/**
 * 业务拦截器工具
 */


addRequestInterceptor((config) => {

    let userId = userStore.userId;
    config.header = config.header || {};
    config.header['X-User-Id'] = userId ? userId : 'guest';

    return config;
})