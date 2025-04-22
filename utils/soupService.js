/**
 * 海龟汤服务 - 前端调用封装
 * 提供符合RESTful规范的海龟汤数据CRUD操作
 * 遵循简洁设计原则，只提供必要的API接口
 *
 * 主要功能：
 * - 获取海龟汤数据（单个、多个或全部）
 * - 创建、更新、删除海龟汤
 * - 获取相邻海龟汤（上一个或下一个）
 * - 获取随机海龟汤
 * - 增加海龟汤阅读数和点赞数
 */
const { soupRequest, soup_base_url, soup_by_id_url, soup_random_url, soup_like_url, soup_view_url } = require('./api');

const soupService = {
    /**
     * 获取海龟汤数据
     * @param {string|string[]|null} [soupId] 海龟汤ID或ID数组，如果不提供或为空数组则获取所有海龟汤
     * @returns {Promise<Object|Array>} 海龟汤数据或海龟汤列表
     */
    async getSoup(soupId) {
        try {
            // 如果没有提供参数或提供了空数组，获取所有海龟汤
            if (!soupId || (Array.isArray(soupId) && soupId.length === 0)) {
                const response = await soupRequest({
                    url: soup_base_url,
                    method: 'GET'
                });
                return response.success ? response.data : [];
            }

            // 如果是非空数组，获取多个海龟汤
            if (Array.isArray(soupId)) {
                // 使用逗号分隔的ID列表进行查询
                const response = await soupRequest({
                    url: `${soup_base_url}?id=${soupId.join(',')}`,
                    method: 'GET'
                });
                return response.success ? response.data : [];
            }

            // 如果是单个ID，获取单个海龟汤
            const response = await soupRequest({
                url: `${soup_by_id_url}${soupId}`,
                method: 'GET'
            });
            return response.success ? response.data : null;
        } catch (error) {
            console.error('获取海龟汤数据失败:', error);
            return Array.isArray(soupId) ? [] : null;
        }
    },

    /**
     * 获取海龟汤列表
     * @param {Object} options 选项
     * @param {number} [options.type] 海龟汤类型，0表示预制汤，1表示DIY汤
     * @returns {Promise<Array>} 海龟汤数组
     */
    async getSoupList(options = {}) {
        try {
            let url = soup_base_url;
            if (options.type !== undefined) {
                url += `?type=${options.type}`;
            }

            const response = await soupRequest({
                url,
                method: 'GET'
            });

            return response.success ? response.data : [];
        } catch (error) {
            console.error('获取海龟汤列表失败:', error);
            return [];
        }
    },

    /**
     * 创建新海龟汤
     * @param {Object} soupData 海龟汤数据
     * @param {string} soupData.title 标题
     * @param {string[]} soupData.contentLines 内容行数组
     * @param {string} soupData.truth 汤底
     * @param {number} [soupData.soupType] 海龟汤类型，0表示预制汤，1表示DIY汤
     * @returns {Promise<Object>} 创建的海龟汤数据
     */
    async createSoup(soupData) {
        if (!soupData) {
            console.error('创建海龟汤失败: 缺少海龟汤数据');
            return null;
        }

        try {
            const response = await soupRequest({
                url: soup_base_url,
                method: 'POST',
                data: soupData
            });
            return response.success ? response.data : null;
        } catch (error) {
            console.error('创建海龟汤失败:', error);
            return null;
        }
    },

    /**
     * 更新海龟汤数据
     * @param {string} soupId 海龟汤ID
     * @param {Object} soupData 海龟汤数据
     * @returns {Promise<Object>} 更新后的海龟汤数据
     */
    async updateSoup(soupId, soupData) {
        if (!soupId || !soupData) {
            console.error('更新海龟汤失败: 缺少必要参数');
            return null;
        }

        try {
            const response = await soupRequest({
                url: `${soup_by_id_url}${soupId}`,
                method: 'PUT',
                data: soupData
            });
            return response.success ? response.data : null;
        } catch (error) {
            console.error('更新海龟汤失败:', error);
            return null;
        }
    },

    /**
     * 删除海龟汤
     * @param {string} soupId 海龟汤ID
     * @returns {Promise<Object>} 删除结果
     */
    async deleteSoup(soupId) {
        if (!soupId) {
            console.error('删除海龟汤失败: 缺少海龟汤ID');
            return null;
        }

        try {
            const response = await soupRequest({
                url: `${soup_by_id_url}${soupId}`,
                method: 'DELETE'
            });
            return response.success ? response.data : null;
        } catch (error) {
            console.error('删除海龟汤失败:', error);
            return null;
        }
    },

    /**
     * 获取随机海龟汤
     * @returns {Promise<Object>} 随机海龟汤数据
     */
    async getRandomSoup() {
        try {
            // 直接使用随机海龟汤API
            const response = await soupRequest({
                url: soup_random_url,
                method: 'GET'
            });
            return response.success ? response.data : null;
        } catch (error) {
            console.error('获取随机海龟汤失败:', error);
            return null;
        }
    },

    /**
     * 批量删除海龟汤
     * @param {string[]} soupIds 海龟汤ID数组
     * @returns {Promise<Object>} 删除结果
     */
    async deleteSoups(soupIds) {
        if (!Array.isArray(soupIds) || soupIds.length === 0) {
            console.error('批量删除海龟汤失败: 无效的ID数组');
            return null;
        }

        try {
            const response = await soupRequest({
                url: `${soup_base_url}?ids=${soupIds.join(',')}`,
                method: 'DELETE'
            });
            return response.success ? response.data : null;
        } catch (error) {
            console.error('批量删除海龟汤失败:', error);
            return null;
        }
    },

    /**
     * 点赞海龟汤
     * @param {string} soupId 海龟汤ID
     * @returns {Promise<Object>} 点赞结果，包含更新后的点赞数
     */
    async likeSoup(soupId) {
        if (!soupId) {
            console.error('点赞海龟汤失败: 缺少海龟汤ID');
            return null;
        }

        try {
            const response = await soupRequest({
                url: `${soup_like_url}${soupId}/like`,
                method: 'POST'
            });
            return response.success ? response.data : null;
        } catch (error) {
            console.error('点赞海龟汤失败:', error);
            return null;
        }
    },

    /**
     * 增加海龟汤阅读数
     * @param {string} soupId 海龟汤ID
     * @returns {Promise<Object>} 结果，包含更新后的阅读数
     */
    async viewSoup(soupId) {
        if (!soupId) {
            console.error('增加阅读数失败: 缺少海龟汤ID');
            return null;
        }

        try {
            const response = await soupRequest({
                url: `${soup_view_url}${soupId}/view`,
                method: 'POST'
            });
            return response.success ? response.data : null;
        } catch (error) {
            console.error('增加阅读数失败:', error);
            return null;
        }
    },

    /**
     * 获取相邻的海龟汤（上一个或下一个）
     * @param {string} currentSoupId 当前海龟汤ID
     * @param {boolean} isNext 是否获取下一个，false表示获取上一个
     * @returns {Promise<Object>} 相邻的海龟汤数据
     *
     * @example
     * // 获取下一个海龟汤
     * const nextSoup = await soupService.getAdjacentSoup(currentSoupId, true);
     *
     * // 获取上一个海龟汤
     * const prevSoup = await soupService.getAdjacentSoup(currentSoupId, false);
     *
     * // 获取第一个海龟汤
     * const firstSoup = await soupService.getAdjacentSoup(null, true);
     *
     * // 获取最后一个海龟汤
     * const lastSoup = await soupService.getAdjacentSoup(null, false);
     */
    async getAdjacentSoup(currentSoupId, isNext = true) {
        try {
            // 获取所有汤面
            const allSoups = await this.getSoup();
            if (!Array.isArray(allSoups) || allSoups.length === 0) {
                return null;
            }

            // 如果没有当前汤面ID，根据方向返回第一个或最后一个汤面
            if (!currentSoupId) {
                return isNext ? allSoups[0] : allSoups[allSoups.length - 1];
            }

            // 找到当前汤面的索引
            const currentIndex = allSoups.findIndex(soup =>
                (soup.soupId === currentSoupId || soup.id === currentSoupId));

            // 如果找不到当前汤面，根据方向返回第一个或最后一个汤面
            if (currentIndex === -1) {
                return isNext ? allSoups[0] : allSoups[allSoups.length - 1];
            }

            // 计算相邻汤面的索引
            const adjacentIndex = isNext
                ? (currentIndex + 1) % allSoups.length
                : (currentIndex - 1 + allSoups.length) % allSoups.length;

            return allSoups[adjacentIndex];
        } catch (error) {
            console.error(`获取${isNext ? '下' : '上'}一个海龟汤失败:`, error);
            return null;
        }
    }
};

module.exports = soupService;