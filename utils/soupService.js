/**
 * 汤面数据服务类
 * 提供符合RESTful规范的汤面数据CRUD操作
 * 遵循简洁设计原则，只提供必要的API接口
 */
const { soupRequest, soup_base_url, soup_random_url } = require('./api');

const soupService = {
    /**
     * 获取汤面数据
     * @param {string|string[]|null} [soupId] 汤面ID或ID数组，如果不提供或为空数组则获取所有汤面
     * @returns {Promise<Object|Array>} 汤面数据或汤面列表
     */
    async getSoup(soupId) {
        try {
            // 如果没有提供参数或提供了空数组，获取所有汤面
            if (!soupId || (Array.isArray(soupId) && soupId.length === 0)) {
                const response = await soupRequest({
                    url: soup_base_url,
                    method: 'GET'
                });
                const data = response.data || response;
                return Array.isArray(data) ? data : [];
            }

            // 如果是非空数组，获取多个汤面
            if (Array.isArray(soupId)) {
                // 使用逗号分隔的ID列表进行查询
                const response = await soupRequest({
                    url: `${soup_base_url}?id=${soupId.join(',')}`,
                    method: 'GET'
                });
                const data = response.data || response;
                return Array.isArray(data) ? data : [];
            }

            // 如果是单个ID，获取单个汤面
            const response = await soupRequest({
                url: `${soup_base_url}/${soupId}`,
                method: 'GET'
            });
            return response.data || response;
        } catch (error) {
            console.error('获取汤面数据失败:', error);
            return Array.isArray(soupId) ? [] : null;
        }
    },

    /**
     * 创建新汤面
     * @param {Object} soupData 汤面数据
     * @returns {Promise<Object>} 创建的汤面数据
     */
    async createSoup(soupData) {
        if (!soupData) {
            console.error('创建汤面失败: 缺少汤面数据');
            return null;
        }

        try {
            const response = await soupRequest({
                url: soup_base_url,
                method: 'POST',
                data: soupData
            });
            return response.data || response;
        } catch (error) {
            console.error('创建汤面失败:', error);
            return null;
        }
    },

    /**
     * 更新汤面数据
     * @param {string} soupId 汤面ID
     * @param {Object} soupData 汤面数据
     * @returns {Promise<Object>} 更新后的汤面数据
     */
    async updateSoup(soupId, soupData) {
        if (!soupId || !soupData) {
            console.error('更新汤面失败: 缺少必要参数');
            return null;
        }

        try {
            const response = await soupRequest({
                url: `${soup_base_url}/${soupId}`,
                method: 'PUT',
                data: soupData
            });
            return response.data || response;
        } catch (error) {
            console.error('更新汤面失败:', error);
            return null;
        }
    },

    /**
     * 删除汤面
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object>} 删除结果
     */
    async deleteSoup(soupId) {
        if (!soupId) {
            console.error('删除汤面失败: 缺少汤面ID');
            return null;
        }

        try {
            const response = await soupRequest({
                url: `${soup_base_url}/${soupId}`,
                method: 'DELETE'
            });
            return response.data || response;
        } catch (error) {
            console.error('删除汤面失败:', error);
            return null;
        }
    },

    /**
     * 获取随机汤面
     * @returns {Promise<Object>} 随机汤面数据
     */
    async getRandomSoup() {
        try {
            // 直接使用随机汤面API
            const response = await soupRequest({
                url: soup_random_url,
                method: 'GET'
            });
            return response.data || response;
        } catch (error) {
            console.error('获取随机汤面失败:', error);
            return null;
        }
    },

    /**
     * 批量删除汤面
     * @param {string[]} soupIds 汤面ID数组
     * @returns {Promise<Object>} 删除结果
     */
    async deleteSoups(soupIds) {
        if (!Array.isArray(soupIds) || soupIds.length === 0) {
            console.error('批量删除汤面失败: 无效的ID数组');
            return null;
        }

        try {
            const response = await soupRequest({
                url: `${soup_base_url}?ids=${soupIds.join(',')}`,
                method: 'DELETE'
            });
            return response.data || response;
        } catch (error) {
            console.error('批量删除汤面失败:', error);
            return null;
        }
    }
};

module.exports = soupService;