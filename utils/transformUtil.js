/**
 * 转换响应数据中的键名格式
 * snake_case 转 camelCase
 * @param {*} data 要转换的数据
 * @returns {*} 转换后的数据
 */
function transformResponseData(data) {
    if (Array.isArray(data)) {
        return data.map(item => transformResponseData(item));
    }

    if (data !== null && typeof data === 'object') {
        return Object.keys(data).reduce((result, key) => {
            // 转换键名：将 snake_case 转换为 camelCase
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = transformResponseData(data[key]);
            return result;
        }, {});
    }

    return data;
}

/**
 * 转换请求数据中的键名格式
 * camelCase 转 snake_case
 * @param {*} data 要转换的数据
 * @returns {*} 转换后的数据
 */
function transformRequestData(data) {
    if (Array.isArray(data)) {
        return data.map(item => transformRequestData(item));
    }

    if (data !== null && typeof data === 'object') {
        return Object.keys(data).reduce((result, key) => {
            // 转换键名：将 camelCase 转换为 snake_case
            const snakeKey = key.replace(/([A-Z])/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = transformRequestData(data[key]);
            return result;
        }, {});
    }

    return data;
}

module.exports = {
    transformResponseData,
    transformRequestData
};
