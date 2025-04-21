/**
 * 汤面数据服务类
 * 负责处理汤面数据的加载、获取等操作
 * 优化版：不再缓存所有汤面数据，而是在需要时通过API获取
 */
const { soupRequest, soupBasePath } = require('./api');

const soupService = {
    // 当前汤面列表的ID数组（仅存储ID，不存储完整数据）
    soupIds: [],

    // 是否已从服务器加载ID列表
    isIdsLoaded: false,

    // 加载状态标志
    _isLoading: false,

    // 加载Promise缓存
    _loadingPromise: null,

    // 最后一次加载数据的日期
    _lastLoadDate: null,

    /**
     * 从服务器加载汤面ID列表
     * @returns {Promise<Array>} 返回包含汤面ID的Promise
     */
    /**
     * 检查是否需要重新加载数据
     * 汤面数据每天只更新一次，所以只需要每天加载一次
     * @returns {boolean} 是否需要重新加载
     */
    _needReload: function() {
        // 如果没有加载过数据，需要加载
        if (!this.isIdsLoaded || !this.soupIds || this.soupIds.length === 0) {
            return true;
        }

        // 如果没有记录最后加载日期，需要加载
        if (!this._lastLoadDate) {
            return true;
        }

        // 获取当前日期
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastLoadDay = new Date(this._lastLoadDate.getFullYear(), this._lastLoadDate.getMonth(), this._lastLoadDate.getDate());

        // 如果最后加载日期不是今天，需要重新加载
        return today.getTime() > lastLoadDay.getTime();
    },

    loadSoupIds: function() {
        // 如果已经在加载中，返回现有的Promise
        if (this._isLoading && this._loadingPromise) {
            return this._loadingPromise;
        }

        // 如果已经加载过数据且今天已经加载过，直接返回缓存的数据
        if (this.isIdsLoaded && !this._needReload()) {
            console.log('使用缓存的汤面ID列表，当前数量:', this.soupIds.length);
            return Promise.resolve(this.soupIds);
        }

        // 标记为加载中
        this._isLoading = true;
        console.log('开始从服务器加载汤面ID列表');

        // 创建加载Promise
        this._loadingPromise = new Promise((resolve) => {
            soupRequest({
                url: soupBasePath + 'list',
                method: 'GET'
            }).then(response => {
                // 检查响应格式
                const data = response.data?.soups || response.data || response;

                if (Array.isArray(data)) {
                    console.log('服务器返回数据数量:', data.length);
                    // 只保存ID列表
                    this.soupIds = data.map(soup => soup.soupId || soup.id || soup._id);
                    this.isIdsLoaded = true;
                    // 更新最后加载日期
                    this._lastLoadDate = new Date();
                    console.log('更新ID列表成功，当前数量:', this.soupIds.length);
                } else {
                    console.warn('服务器返回非预期数据格式');
                }
                resolve(this.soupIds);
            }).catch(err => {
                console.error('从服务器加载ID列表失败:', err);
                resolve(this.soupIds);
            }).finally(() => {
                // 无论成功或失败，都重置加载状态
                this._isLoading = false;
                // 清除Promise缓存
                setTimeout(() => {
                    this._loadingPromise = null;
                }, 100);
            });
        });

        return this._loadingPromise;
    },

    /**
     * 获取指定汤面的索引
     * @param {string} soupId 汤面ID
     * @returns {number} 汤面索引，未找到返回-1
     */
    getSoupIndex: function (soupId) {
        if (!soupId || !this.soupIds || !this.soupIds.length) {
            console.log('无效的参数或数据:', { soupId, hasData: !!this.soupIds, dataLength: this.soupIds?.length });
            return -1;
        }
        // 查找ID在数组中的索引
        const index = this.soupIds.indexOf(soupId);
        console.log('查找汤面索引:', { soupId, index });
        return index;
    },

    /**
     * 获取下一个汤面的ID
     * @param {string} currentSoupId 当前汤面ID
     * @returns {Promise<string>} 下一个汤面的ID
     */
    getNextSoupId: async function (currentSoupId) {
        try {
            // 如果ID列表未加载，先加载
            if (!this.isIdsLoaded) {
                await this.loadSoupIds();
            }

            // 如果ID列表为空，返回空
            if (!this.soupIds || !this.soupIds.length) {
                console.log('ID列表为空');
                return '';
            }

            // 如果没有当前ID，返回第一个
            if (!currentSoupId) {
                console.log('没有当前ID，返回第一个');
                return this.soupIds[0];
            }

            const currentIndex = this.getSoupIndex(currentSoupId);
            console.log('当前索引:', currentIndex, '当前ID:', currentSoupId);

            // 如果找不到当前汤面，返回第一个汤面的ID
            if (currentIndex === -1) {
                console.log('找不到当前汤面，返回第一个');
                return this.soupIds[0];
            }

            // 如果是最后一个，返回第一个汤面的ID
            if (currentIndex === this.soupIds.length - 1) {
                console.log('是最后一个，返回第一个');
                return this.soupIds[0];
            }

            // 返回下一个汤面的ID
            const nextId = this.soupIds[currentIndex + 1];
            console.log('返回下一个:', nextId);
            return nextId;
        } catch (error) {
            console.error('获取下一个汤面ID失败:', error);
            return '';
        }
    },

    /**
     * 根据ID获取指定的汤面
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object|null>} 汤面数据或null
     */
    getSoupById: async function (soupId) {
        if (!soupId) {
            console.error('获取汤面数据失败: 缺少soupId');
            return null;
        }

        try {
            console.log('从服务器获取汤面数据:', soupId);
            const response = await soupRequest({
                url: `${soupBasePath}detail/${soupId}`,
                method: 'GET'
            });

            // 检查响应格式
            const soupData = response.data?.data || response.data || response;

            if (!soupData) {
                console.warn('服务器返回空数据');
                return null;
            }

            // 确保数据有id字段
            return {
                ...soupData,
                id: soupData.id || soupData.soupId || soupData._id
            };
        } catch (error) {
            console.error('获取汤面数据失败:', error);
            return null;
        }
    },

    /**
     * 获取随机汤面数据
     * @returns {Promise<Object|null>} 返回随机汤面数据或null
     */
    getRandomSoup: async function() {
        try {
            console.log('从汤面ID列表中随机选择汤面');

            // 先获取所有汤面ID
            if (!this.isIdsLoaded) {
                await this.loadSoupIds();
            }

            // 如果ID列表为空，返回null
            if (!this.soupIds || this.soupIds.length === 0) {
                console.warn('汤面ID列表为空');
                return null;
            }

            // 随机选择一个ID
            const randomIndex = Math.floor(Math.random() * this.soupIds.length);
            const randomId = this.soupIds[randomIndex];

            console.log('随机选择的汤面ID:', randomId);

            // 获取该ID的汤面数据
            const soupData = await this.getSoupById(randomId);

            if (!soupData) {
                console.warn('获取随机汤面数据失败');
                return null;
            }

            return soupData;
        } catch (error) {
            console.error('获取随机汤面数据失败:', error);
            return null;
        }
    },

    /**
     * 获取汤面数据
     * @param {string} soupId 可选的汤面ID
     * @returns {Promise<Object>} 返回包含汤面数据的Promise
     */
    getSoupData: async function(soupId) {
        try {
            // 如果指定了soupId，则获取指定的汤面
            if (soupId) {
                return await this.getSoupById(soupId);
            }

            // 如果没有指定soupId，则获取随机汤面
            const randomSoup = await this.getRandomSoup();
            if (randomSoup) {
                return randomSoup;
            }

            throw new Error('无法获取有效的汤面数据');
        } catch (error) {
            console.error('获取汤面数据失败:', error);
            throw error;
        }
    },

    /**
     * 获取所有汤面ID
     * @returns {Promise<Array>} 返回包含所有汤面ID的Promise
     */
    getAllSoupIds: async function() {
        if (!this.isIdsLoaded) {
            await this.loadSoupIds();
        }
        return [...this.soupIds];
    },

    /**
     * 获取汤面总数
     * @returns {number} 汤面总数
     */
    getSoupCount: function () {
        return this.soupIds ? this.soupIds.length : 0;
    },

    /**
     * 刷新汤面ID列表（从服务器重新加载）
     * @returns {Promise<Array>} 返回包含新汤面ID的Promise
     */
    refreshSoupIds: function() {
        // 如果已经在加载中，返回现有的Promise
        if (this._isLoading && this._loadingPromise) {
            return this._loadingPromise;
        }

        // 如果今天已经加载过数据，且数据不为空，则不需要重新加载
        if (!this._needReload() && this.soupIds && this.soupIds.length > 0) {
            console.log('今天已经加载过汤面数据，不需要重新加载');
            return Promise.resolve(this.soupIds);
        }

        console.log('刷新汤面ID列表');
        this.isIdsLoaded = false;
        return this.loadSoupIds();
    }
};

module.exports = soupService;