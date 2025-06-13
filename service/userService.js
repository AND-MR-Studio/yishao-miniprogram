// service/userService.js - 纯服务层，只负责API调用
const userApiImpl = require('../api/userApiImpl');

/**
 * 用户服务层 - 纯函数集合
 * 严格遵循三层架构分离原则：
 * - 只负责API调用，不包含业务逻辑
 * - 不处理本地存储和状态管理
 * - 统一返回 {success, data, error} 格式
 * - 使用函数式API URL格式
 */

/**
 * 获取用户信息
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function getUserInfo() {
    try {
        // 调用API实现层获取用户信息
        const res = await userApiImpl.getUserInfo();
        if (res.success() && res.data) {
            return {success: true, data: res.data};
        } else {
            return {success: false, error: res.error || '获取用户信息失败'};
        }
    } catch (error) {
        return {success: false, error: '获取用户信息失败'};
    }
}

/**
 * 登录
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function login() {
    // 调用API实现层登录
    const res = await userApiImpl.login();
    if (res.success() && res.data) {
        return {success: true, data: res.data};
    } else {
        throw Error("登录失败: " + res);
    }
}

/**
 * 退出登录 - 纯API调用，不处理本地存储
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function logout() {
    try {
        // 只负责API调用，本地存储清理由Store层处理
        return {success: true, data: null};
    } catch (error) {
        return {success: false, error: '退出登录失败'};
    }
}


/**
 * 更新用户资料
 * @param {object} profileData - 用户资料数据
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function updateUserInfo(profileData) {
    if (!profileData || Object.keys(profileData).length === 0) {
        return {success: false, error: '无更新内容'};
    }

    try {
        // 调用API实现层更新用户资料
        const res = await userApiImpl.updateUserInfo(profileData);
        return res.success() ? {success: true, data: res.data} : {success: false, error: res.error || '更新用户资料失败'};
    } catch (error) {
        return {success: false, error: '更新用户资料失败'};
    }
}

/**
 * 收藏汤面
 * @param {string} soupId - 汤ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function favoriteSoup(soupId) {
    if (!soupId) {
        return {success: false, error: '汤ID为空'};
    }

    try {
        // 调用API实现层收藏汤面
        const res = await userApiImpl.favoriteSoup(soupId);
        return res.success() ? {success: true, data: res.data} : {success: false, error: res.error || '收藏汤面失败'};
    } catch (error) {
        return {success: false, error: '收藏汤面失败'};
    }
}

/**
 * 取消收藏汤面
 * @param {string} soupId - 汤ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function unfavoriteSoup(soupId) {
    if (!soupId) {
        return {success: false, error: '汤ID为空'};
    }

    try {
        // 调用API实现层取消收藏汤面
        const res = await userApiImpl.unfavoriteSoup(soupId);
        return res.success() ? {success: true, data: res.data} : {success: false, error: res.error || '取消收藏汤面失败'};
    } catch (error) {
        return {success: false, error: '取消收藏汤面失败'};
    }
}

/**
 * 点赞汤面
 * @param {string} soupId - 汤ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function likeSoup(soupId) {
    if (!soupId) {
        return {success: false, error: '汤ID为空'};
    }

    try {
        // 调用API实现层点赞汤面
        const res = await userApiImpl.likeSoup(soupId);
        return res.success() ? {success: true, data: res.data} : {success: false, error: res.error || '点赞汤面失败'};
    } catch (error) {
        return {success: false, error: '点赞汤面失败'};
    }
}

/**
 * 取消点赞汤面
 * @param {string} soupId - 汤ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function unlikeSoup(soupId) {
    if (!soupId) {
        return {success: false, error: '汤ID为空'};
    }

    try {
        // 调用API实现层取消点赞汤面
        const res = await userApiImpl.unlikeSoup(soupId);
        return res.success() ? {success: true, data: res.data} : {success: false, error: res.error || '取消点赞汤面失败'};
    } catch (error) {
        return {success: false, error: '取消点赞汤面失败'};
    }
}

/**
 * 更新用户已解决的汤
 * @param {string} soupId - 汤ID
 * @param {boolean} isSolved - 是否已解决
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function updateSolvedSoup(soupId, isSolved) {
    if (!soupId) {
        return {success: false, error: '汤ID为空'};
    }

    try {
        // 调用API实现层更新解决状态
        const res = await userApiImpl.updateSolvedSoup(soupId, isSolved);
        return res.success() ? {success: true, data: res.data} : {success: false, error: res.error || '更新解决记录失败'};
    } catch (error) {
        return {success: false, error: '更新解决记录失败'};
    }
}

/**
 * 更新用户回答过的汤
 * @param {string} soupId - 汤ID
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function updateAnsweredSoup(soupId) {
    if (!soupId) {
        return {success: false, error: '汤ID为空'};
    }

    try {
        const res = await userApiImpl.updateAnsweredSoup(soupId);
        return res.success() ? {success: true, data: res.data} : {success: false, error: res.error || '更新回答记录失败'};
    } catch (error) {
        return {success: false, error: '更新回答记录失败'};
    }
}

module.exports = {
    getUserInfo,
    login,
    logout,
    updateUserInfo,
    favoriteSoup,
    unfavoriteSoup,
    likeSoup,
    unlikeSoup,
    updateSolvedSoup,
    updateAnsweredSoup
};
