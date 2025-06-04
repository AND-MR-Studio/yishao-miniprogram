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
     * 更新用户收藏的汤
     * @param {string} userId - 用户ID
     * @param {string} soupId - 汤ID
     * @param {boolean} isFavorite - 是否收藏
     * @returns {Promise<ApiResult>} 更新结果
     */
    updateFavoriteSoup: async (userId, soupId, isFavorite) => {
        if (!userId) {
            return ApiResult.onError("用户ID为空");
        }
        if (!soupId) {
            return ApiResult.onError("汤ID为空");
        }

        try {
            return await post({
                url: getFullUrl(USER, `${soupId}/favor`),
                data: {soupId, isFavorite},
            });
        } catch (error) {
            console.error(`[${USER}] 更新收藏记录失败:`, error);
            return ApiResult.onError("更新收藏记录失败");
        }
    },

    /**
     * 更新用户点赞的汤
     * @param {string} soupId - 汤ID
     * @param {boolean} isLike - 是否点赞
     * @returns {Promise<ApiResult>} 更新结果
     */
    updateLikedSoup: async (soupId, isLike) => {
        if (!soupId) {
            return ApiResult.onError("汤ID为空");
        }

        try {
            return await post({
                url: getFullUrl(USER, "/liked-soup"),
                data: {soupId, isLike},
            });
        } catch (error) {
            console.error(`[${USER}] 更新点赞记录失败:`, error);
            return ApiResult.onError("更新点赞记录失败");
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