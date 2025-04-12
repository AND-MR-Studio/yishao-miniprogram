/**
 * 汤面数据服务类
 * 负责处理汤面数据的加载、获取等操作
 */
const soupService = {
    // 汤面数据缓存
    soups: [],  // 改为空数组，完全依赖服务器数据

    // 环境配置
    ENV: {
        DEV: 'development',
        PROD: 'production'
    },
    
    // 当前环境 - 默认为开发环境
    currentEnv: 'development',
    
    // API基础URL配置
    API_URLS: {
        development: 'http://localhost:8081/api/soups',
        production: 'http://71.137.1.230:8081/api/soups'
    },
    
    // 获取当前环境的API基础URL
    get API_BASE_URL() {
        return this.API_URLS[this.currentEnv];
    },
    
    /**
     * 切换环境
     * @param {string} env 环境名称 ('development' 或 'production')
     */
    switchEnvironment: function(env) {
        if (this.API_URLS[env]) {
            this.currentEnv = env;
            this.isDataLoaded = false; // 切换环境后需要重新加载数据
            return true;
        }
        return false;
    },

    // 是否已从服务器加载数据
    isDataLoaded: false,

    /**
     * 从服务器加载所有汤面数据 (Promise版本)
     * @returns {Promise<Array>} 返回包含汤面数据的Promise
     */
    loadSoupsAsync: function() {
        console.log('开始从服务器加载汤面数据');
        return new Promise((resolve) => {
            wx.request({
                url: `${this.API_BASE_URL}/list`,
                method: 'GET',
                success: (res) => {
                    console.log('服务器返回数据:', res.data);
                    if (res.statusCode === 200 && res.data && Array.isArray(res.data)) {
                        // 更新本地汤面数据
                        this.soups = res.data;
                        this.isDataLoaded = true;
                        console.log('更新本地数据成功，当前数据量:', this.soups.length);
                    }
                    resolve(this.soups);
                },
                fail: (err) => {
                    console.error('从服务器加载数据失败:', err);
                    resolve(this.soups);
                }
            });
        });
    },

    /**
     * 获取指定汤面的索引
     * @param {string} soupId 汤面ID
     * @returns {number} 汤面索引，未找到返回-1
     */
    getSoupIndex: function (soupId) {
        if (!soupId) return -1;
        return this.soups.findIndex(soup => soup.soupId === soupId);
    },

    /**
     * 获取下一个汤面的ID
     * @param {string} currentSoupId 当前汤面ID
     * @returns {string} 下一个汤面的ID
     */
    getNextSoupId: function (currentSoupId) {
        const currentIndex = this.getSoupIndex(currentSoupId);
        
        // 如果找不到当前汤面，返回第一个汤面的ID
        if (currentIndex === -1) {
            return this.soups[0]?.soupId;
        }
        
        // 如果是最后一个，返回第一个汤面的ID
        if (currentIndex === this.soups.length - 1) {
            return this.soups[0].soupId;
        }
        
        // 返回下一个汤面的ID
        return this.soups[currentIndex + 1].soupId;
    },

    /**
     * 根据ID获取指定的汤面
     * @param {string} soupId 汤面ID
     * @returns {Object|null} 汤面数据或null
     */
    getSoupById: function (soupId) {
        if (!soupId) return null;
        const soup = this.soups.find(soup => soup.soupId === soupId);
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

                let soupData;

                // 如果指定了soupId，则获取指定的汤面
                if (soupId) {
                    soupData = this.getSoupById(soupId);
                }

                // 如果没有指定soupId或找不到指定的汤面，则获取第一个
                if (!soupData && this.soups.length > 0) {
                    soupData = this.soups[0];
                }

                // 模拟网络延迟
                setTimeout(() => {
                    resolve(soupData);
                }, 300);
            } catch (error) {
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
        return this.soups.length;
    },

    /**
     * 刷新汤面数据（从服务器重新加载）(Promise版本)
     * @returns {Promise<Array>} 返回包含新汤面数据的Promise
     */
    refreshSoupsAsync: function() {
        console.log('刷新汤面数据');
        this.isDataLoaded = false;
        return this.loadSoupsAsync();
    }
};

module.exports = soupService;