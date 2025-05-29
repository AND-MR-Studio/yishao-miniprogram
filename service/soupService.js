/**
 * 海龟汤服务 - 业务逻辑层
 * 提供符合RESTful规范的海龟汤数据操作
 * 遵循简洁设计原则，只提供必要的业务逻辑
 *
 * 支持两种模式：
 * 1. 默认模式：只返回soupId（适合列表展示）
 * 2. 详情模式：返回完整汤面数据（适合快速滑动查看详情）
 *
 * 主要功能：
 * - 获取海龟汤（ID或完整数据）
 * - 批量获取海龟汤详情
 * - 创建海龟汤
 * - 批量删除海龟汤
 * - 获取相邻海龟汤（上一个或下一个）
 * - 获取随机海龟汤
 * - 管理收藏和点赞状态
 * - 增加汤面阅读数
 */
const soupApiImpl = require("../api/soupApiImpl");


const soupService = {
    /**
     * 获取海龟汤
     * @param {string} [soupId] 海龟汤ID或ID数组，如果不提供或为空数组则获取所有海龟汤
     * @returns {Promise<Object>} 海龟汤ID或完整数据
     */
    async getSoup(soupId) {
        // 处理已经是对象的情况
        if (soupId && typeof soupId === "object") {
            return soupId;
        }
        
        // 调用API接口层获取汤面
        return await soupApiImpl.getSoup(soupId);
    },

    /**
     * 创建新海龟汤
     * @param {Object} soupData 海龟汤数据
     * @param {string} soupData.title 标题
     * @param {string} soupData.content 汤面内容
     * @param {string} soupData.truth 汤底
     * @param {string[]} [soupData.tags] 海龟汤标签数组（可包含多个标签）
     * @returns {Promise<Object>} 创建的海龟汤数据
     */
    async createSoup(soupData) {
        if (!soupData) {
            return null;
        }

        // 调用API接口层创建汤面
        return await soupApiImpl.createSoup(soupData);
    },

    /**
     * 获取随机海龟汤ID
     * @returns {Promise<Object>} 随机汤面数据
     * */
    async getRandomSoup() {
        // 调用API接口层获取随机汤面
        return await soupApiImpl.getRandomSoup();
    },

    /**
     * 点赞/取消点赞海龟汤
     * @param {string} soupId 海龟汤ID
     * @param {boolean} [isLike=true] 是否点赞，false表示取消点赞
     * @returns {Promise<Object>} 点赞结果，包含likes数量
     */
    async likeSoup(soupId, isLike = true) {
        if (!soupId) {
            return {success: false, message: "缺少汤面ID"};
        }
        
        try {
            // 根据操作类型调用不同的API接口
            const response = isLike ? 
                await soupApiImpl.likeSoup(soupId) : 
                await soupApiImpl.unlikeSoup(soupId);

            // 确保返回格式正确
            if (response) {
                return {
                    success: true,
                    likes: response.likes || 0,
                    message: isLike ? "点赞成功" : "取消点赞成功"
                };
            } else {
                return {
                    success: false,
                    message: "点赞操作失败，请重试"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "点赞操作失败: " + (error.message || "未知错误")
            };
        }
    },

    /**
     * 收藏/取消收藏海龟汤
     * @param {string} soupId 海龟汤ID
     * @param {boolean} [isFavorite=true] 是否收藏，false表示取消收藏
     * @returns {Promise<Object>} 结果，包含favorites数量
     */
    async favoriteSoup(soupId, isFavorite = true) {
        if (!soupId) {
            return {success: false, message: "缺少汤面ID"};
        }
        
        try {
            // 根据操作类型调用不同的API接口
            const response = isFavorite ? 
                await soupApiImpl.favoriteSoup(soupId) : 
                await soupApiImpl.unfavoriteSoup(soupId);

            // 确保返回格式正确
            if (response) {
                return {
                    success: true,
                    favorites: response.favorites || 0,
                    message: isFavorite ? "收藏成功" : "取消收藏成功"
                };
            } else {
                return {
                    success: false,
                    message: "收藏操作失败，请重试"
                };
            }
        } catch (error) {
            return {
                success: false,
                message: "收藏操作失败: " + (error.message || "未知错误")
            };
        }
    },

    /**
     * 增加汤面阅读数
     * @param {string} soupId 海龟汤ID
     * @returns {Promise<Object>} 结果，包含更新后的阅读数
     */
    async viewSoup(soupId) {
        if (!soupId) {
            return null;
        }
        
        // 处理传入对象的情况
        if (soupId && typeof soupId === "object" && !Array.isArray(soupId)) {
            soupId = soupId.id;
        }
        
        // 调用API接口层增加浏览量
        const response = await soupApiImpl.viewSoup(soupId);
        return response ? response.views : null;
    },

    /**
     * 获取用户创建的海龟汤列表
     * @param {string} userId 用户ID
     * @returns {Promise<Array>} 用户创建的海龟汤列表
     */
    async getUserCreatedSoups(userId) {
        if (!userId) {
            return [];
        }

        // 这个方法暂时保留原有实现，因为它依赖于用户服务API
        // 未来可以考虑将其移动到userApiImpl中
        try {
            // 使用旧的API调用方式，后续可以迁移到专门的userApiImpl
            const {get} = require("../utils/request");
            const {api} = require("../config/api");
            
            const response = await get("user_created_soup", {
                url: api.user.createdSoup,
                data: {userId}
            });

            return response && Array.isArray(response) ? response : [];
        } catch (error) {
            console.error("获取用户创建的汤失败:", error);
            return [];
        }
    },
};

module.exports = soupService;
