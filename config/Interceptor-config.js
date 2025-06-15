const {addRequestInterceptor, addResponseInterceptor} = require('../utils/request');
const {userStore} = require('../stores/index');
const {transformResponseData, transformRequestData} = require("../utils/transformUtil");

console.log('=============== 拦截器初始化 ===============');

// 添加响应拦截器处理数据格式转换
addResponseInterceptor((response) => {
    console.log('Response before transform:', response);
    if (response && response.data) {
        response.data = transformResponseData(response.data);
    }
    console.log('Response after transform:', response);
    return response;
});

// 添加请求拦截器处理数据格式转换
addRequestInterceptor((config) => {
    console.log('Request before transform:', config);
    if (config.data) {
        config.data = transformRequestData(config.data);
    }
    console.log('Request after transform:', config);
    return config;
});

// 添加用户ID到请求头
addRequestInterceptor((config) => {
    const userId = userStore?.userId;
    config.header = config.header || {};
    config.header['X-User-Id'] = userId || 'guest';
    return config;
});
