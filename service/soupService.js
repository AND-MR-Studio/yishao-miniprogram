/**
 * 海龟汤服务 - 前端调用封装
 * 提供符合RESTful规范的海龟汤数据操作
 * 遵循简洁设计原则，只提供必要的API接口
 *
 * 主要功能：
 * - 获取海龟汤（ID或完整数据）
 * - 创建海龟汤
 * - 获取随机海龟汤
 * 
 * 架构说明：
 * - Service层专注API调用，不做状态管理
 * - 所有用户相关操作移至 userService
 * - 数据状态管理由对应的 Store 层处理
 */
const {soupRequest, api} = require("../config/api");
const {get, post} = require("../utils/request");

const soupService = {
    /**
     * 获取海龟汤
     * @param {string} [soupId] 海龟汤ID或ID数组，如果不提供或为空数组则获取所有海龟汤
     * @returns {Promise<Object>} 海龟汤ID或完整数据
     */
    async getSoup(soupId) {
        try {
            // todo: 这里有个问题，soupId会传入soupdata
            // 原因是index onLoad处，随机获取的时候返回的是soupdata，而不是soupId
            // 得全盘梳理下soupid和soupdata的传递关系
            if (soupId && typeof soupId === "object") {
                return soupId;
            }

            // 获取单个海龟汤
            const response = await get("get_soup_by_id", {
                url: api.soup.get(soupId),
            });
            return response ? response : null;
        } catch (error) {
            console.error("获取海龟汤失败:", error);
            return null;
        }
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

        try {
            // 使用新的创建接口
            const response = await post("create_soup", {
                url: api.soup.create,
                data: soupData,
            });

            return response || null;
        } catch (error) {
            console.error("创建海龟汤失败:", error);
            return null;        }
    },    /**
     * 获取随机海龟汤 - Service层专注API调用
     * 只负责API调用，返回原始数据，不做状态管理
     * @returns {Promise<Object>} 随机汤面数据
     */
    async getRandomSoup() {
        try {
            // 直接调用随机海龟汤API
            const response = await get("soup", {
                url: api.soup.random,
            });
            // 根据API约定，直接返回数据
            return response ? response : null;
        } catch (error) {
            console.error("获取随机海龟汤失败:", error);
            return null;
        }
    },
};

module.exports = soupService;
