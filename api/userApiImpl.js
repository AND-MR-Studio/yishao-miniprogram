/**
 * 用户API接口实现
 * 负责封装所有与用户API相关的接口调用
 * 实现接口层设计，与服务层解耦
 */
const {get, post} = require("../utils/request");
const {getFullUrl} = require("../utils/urlUtils");
const ApiResult = require("./entities");
const USER = "user";

/**
 * 用户API接口实现类
 * 提供所有用户相关的API调用方法
 */
const userApiImpl = {
    /**
     * 获取用户信息
     * @returns {Promise<ApiResult>} 用户信息
     */
    getUserInfo: async (userId) => {
        try {
            return await get({
                url: getFullUrl(USER, `/api/users/${userId}`),
            });
        } catch (error) {
            console.error(`[${USER}] 获取用户信息失败:`, error);
            return ApiResult.onError("获取用户信息失败");
        }
    },

    /**
     * 登录
     * @returns {Promise<ApiResult>} 登录结果
     */
    login: async () => {
        try {
            wx.login({
                success(res) {
                    if (res.code) {
                        return get({
                            url: getFullUrl(USER, `/login?code=${res.code}`),
                        });
                    } else {
                        return ApiResult.onError("登录失败：无授权码");
                    }
                },
            });
        } catch (error) {
            console.error(`[${USER}] 登录失败:`, error);
            return ApiResult.onError(`登录失败：${error.message}`);
        }
    },

    /**
     * 更新用户资料
     * @returns {Promise<ApiResult>} 更新结果
     * @param userId 用户ID
     * @param nickName
     * @param avatarUrl
     */
    updateUserInfo: async (userId, nickName, avatarUrl) => {
        try {
            return await post({
                url: getFullUrl(USER, `/${userId}`),
                data: {"nickName": nickName, "avatarUrl": avatarUrl}
            });
        } catch (error) {
            console.error(`[${USER}] 更新用户资料失败:`, error);
            return ApiResult.onError("更新用户资料失败");
        }
    },

    /**
     * 收藏汤面
     * @param {string} soupId - 汤ID
     * @returns {Promise<ApiResult>} 收藏结果
     */
    favoriteSoup: async (soupId) => {
        if (!soupId) {
            return ApiResult.onError("汤ID为空");
        }

        try {
            return await post({
                url: getFullUrl(USER, `/favor/${soupId}`),
            });
        } catch (error) {
            console.error(`[${USER}] 收藏汤面失败:`, error);
            return ApiResult.onError("收藏汤面失败");
        }
    },

    /**
     * 取消收藏汤面
     * @param {string} soupId - 汤ID
     * @returns {Promise<ApiResult>} 取消收藏结果
     */
    unfavoriteSoup: async (soupId) => {
        if (!soupId) {
            return ApiResult.onError("汤ID为空");
        }

        try {
            return await post({
                url: getFullUrl(USER, `/unfavor/${soupId}`),
            });
        } catch (error) {
            console.error(`[${USER}] 取消收藏汤面失败:`, error);
            return ApiResult.onError("取消收藏汤面失败");
        }
    },
    

    /**
     * 点赞汤面
     * @param {string} soupId - 汤ID
     * @returns {Promise<ApiResult>} 点赞结果
     */
    likeSoup: async (soupId) => {
        if (!soupId) {
            return ApiResult.onError("汤ID为空");
        }

        try {
            return await post({
                url: getFullUrl(USER, `/like/${soupId}`),
            });
        } catch (error) {
            console.error(`[${USER}] 点赞汤面失败:`, error);
            return ApiResult.onError("点赞汤面失败");
        }
    },

    /**
     * 取消点赞汤面
     * @param {string} soupId - 汤ID
     * @returns {Promise<ApiResult>} 取消点赞结果
     */
    unlikeSoup: async (soupId) => {
        if (!soupId) {
            return ApiResult.onError("汤ID为空");
        }

        try {
            return await post({
                url: getFullUrl(USER, `/unlike/${soupId}`),
            });
        } catch (error) {
            console.error(`[${USER}] 取消点赞汤面失败:`, error);
            return ApiResult.onError("取消点赞汤面失败");
        }
    },

    /**
     * 更新用户已解决的汤
     * @param {string} soupId - 汤ID
     * @returns {Promise<ApiResult>} 更新结果
     */
    updateSolvedSoup: async (soupId) => {
        if (!soupId) {
            return ApiResult.onError("汤ID为空");
        }

        try {
            return await post({
                url: getFullUrl(USER, "/solved-soup"),
                data: {soupId},
            });
        } catch (error) {
            console.error(`[${USER}] 更新解决记录失败:`, error);
            return ApiResult.onError("更新解决记录失败");
        }
    },

    updateAnsweredSoup: async (soupId) => {
        return null;
    }
};

module.exports = userApiImpl;