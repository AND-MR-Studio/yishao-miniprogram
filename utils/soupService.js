/**
 * 汤面数据服务类
 * 负责处理汤面数据的加载、获取等操作
 */
const { soupRequest } = require('./api');

const soupService = {
    // 汤面数据缓存
    soups: [],  // 改为空数组，完全依赖服务器数据

    // 是否已从服务器加载数据
    isDataLoaded: false,
    
    // 加载状态标志
    _isLoading: false,
    
    // 加载Promise缓存
    _loadingPromise: null,

    /**
     * 从服务器加载所有汤面数据 (Promise版本)
     * @returns {Promise<Array>} 返回包含汤面数据的Promise
     */
    loadSoupsAsync: function() {
        // 如果已经在加载中，返回现有的Promise
        if (this._isLoading && this._loadingPromise) {
            return this._loadingPromise;
        }
        
        // 标记为加载中
        this._isLoading = true;
        console.log('开始从服务器加载汤面数据');
        
        // 创建加载Promise
        this._loadingPromise = new Promise((resolve) => {
            soupRequest({
                url: '/list',
                method: 'GET'
            }).then(data => {
                if (Array.isArray(data)) {
                    console.log('服务器返回数据:', data);
                    // 更新本地汤面数据，确保每个数据都有id字段
                    this.soups = data.map(soup => ({
                        ...soup,
                        id: soup.id || soup._id || soup.soupId // 兼容不同的ID字段
                    }));
                    this.isDataLoaded = true;
                    console.log('更新本地数据成功，当前数据量:', this.soups.length);
                    if (this.soups.length > 0) {
                        console.log('数据示例:', this.soups[0]);
                    }
                } else {
                    console.warn('服务器返回非预期数据格式');
                }
                resolve(this.soups);
            }).catch(err => {
                console.error('从服务器加载数据失败:', err);
                resolve(this.soups);
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
        if (!soupId || !this.soups || !this.soups.length) {
            console.log('无效的参数或数据:', { soupId, hasData: !!this.soups, dataLength: this.soups?.length });
            return -1;
        }
        // 尝试多种ID字段匹配
        const index = this.soups.findIndex(soup => 
            soup.id === soupId || 
            soup._id === soupId || 
            soup.soupId === soupId
        );
        console.log('查找汤面索引:', { soupId, index });
        return index;
    },

    /**
     * 获取下一个汤面的ID
     * @param {string} currentSoupId 当前汤面ID
     * @returns {string} 下一个汤面的ID
     */
    getNextSoupId: function (currentSoupId) {
        // 如果数据未加载或为空，返回空
        if (!this.isDataLoaded || !this.soups || !this.soups.length) {
            console.log('数据未加载或为空');
            return '';
        }
        
        // 如果没有当前ID，返回第一个
        if (!currentSoupId) {
            console.log('没有当前ID，返回第一个');
            return this.soups[0].id;
        }
        
        const currentIndex = this.getSoupIndex(currentSoupId);
        console.log('当前索引:', currentIndex, '当前ID:', currentSoupId);
        
        // 如果找不到当前汤面，返回第一个汤面的ID
        if (currentIndex === -1) {
            console.log('找不到当前汤面，返回第一个');
            return this.soups[0].id;
        }
        
        // 如果是最后一个，返回第一个汤面的ID
        if (currentIndex === this.soups.length - 1) {
            console.log('是最后一个，返回第一个');
            return this.soups[0].id;
        }
        
        // 返回下一个汤面的ID
        const nextId = this.soups[currentIndex + 1].id;
        console.log('返回下一个:', nextId);
        return nextId;
    },

    /**
     * 根据ID获取指定的汤面
     * @param {string} soupId 汤面ID
     * @returns {Object|null} 汤面数据或null
     */
    getSoupById: function (soupId) {
        if (!soupId || !this.soups || !this.soups.length) return null;
        // 尝试多种ID字段匹配
        const soup = this.soups.find(soup => 
            soup.id === soupId || 
            soup._id === soupId || 
            soup.soupId === soupId
        );
        return soup || null;
    },

    /**
     * 获取汤面数据 (Promise版本)
     * @param {string} soupId 可选的汤面ID
     * @returns {Promise<Object>} 返回包含汤面数据的Promise
     */
    getSoupDataAsync: function(soupId) {
        return new Promise(async (resolve, reject) => {
            try {
                // 如果还没有从服务器加载数据，先加载
                if (!this.isDataLoaded) {
                    await this.loadSoupsAsync();
                }

                // 检查数据是否成功加载
                if (!this.soups || !this.soups.length) {
                    reject(new Error('汤面数据为空，无法获取'));
                    return;
                }

                let soupData;

                // 如果指定了soupId，则获取指定的汤面
                if (soupId) {
                    soupData = this.getSoupById(soupId);
                }

                // 如果没有指定soupId或找不到指定的汤面，则获取第一个
                if (!soupData && this.soups.length > 0) {
                    soupData = this.soups[0];
                }

                if (!soupData) {
                    reject(new Error('无法获取有效的汤面数据'));
                    return;
                }

                resolve(soupData);
            } catch (error) {
                console.error('获取汤面数据失败:', error);
                reject(error);
            }
        });
    },

    /**
     * 获取所有汤面数据 (Promise版本)
     * @returns {Promise<Array>} 返回包含所有汤面数据的Promise
     */
    getAllSoupsAsync: function() {
        return new Promise(async (resolve) => {
            if (!this.isDataLoaded) {
                await this.loadSoupsAsync();
            }
            resolve([...this.soups]);
        });
    },

    /**
     * 获取汤面总数
     * @returns {number} 汤面总数
     */
    getSoupCount: function () {
        return this.soups ? this.soups.length : 0;
    },

    /**
     * 刷新汤面数据（从服务器重新加载）(Promise版本)
     * @returns {Promise<Array>} 返回包含新汤面数据的Promise
     */
    refreshSoupsAsync: function() {
        // 如果已经在加载中，返回现有的Promise
        if (this._isLoading && this._loadingPromise) {
            return this._loadingPromise;
        }
        
        console.log('刷新汤面数据');
        this.isDataLoaded = false;
        return this.loadSoupsAsync();
    }
};

module.exports = soupService;