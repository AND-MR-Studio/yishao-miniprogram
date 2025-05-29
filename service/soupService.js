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
    };

module.exports = soupService;