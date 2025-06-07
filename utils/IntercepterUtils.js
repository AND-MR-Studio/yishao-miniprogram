const {addRequestInterceptor, addResponseInterceptor} = require('request');
const {userStore} = require('../stores/userStore');
/**
 * 业务拦截器工具
 */


addRequestInterceptor((config) => {

    let userId = userStore.userId;
    config.header = config.header || {};
    config.header['X-User-Id'] = userId ? userId : 'guest';

    return config;
})