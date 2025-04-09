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
     * 从服务器加载所有汤面数据
     * @param {Function} callback 加载完成后的回调函数
     */
    loadSoupsFromServer: function(callback) {
        console.log('开始从服务器加载汤面数据');
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
                
                if (typeof callback === 'function') {
                    callback(this.soups);
                }
            },
            fail: (err) => {
                console.error('从服务器加载数据失败:', err);
                if (typeof callback === 'function') {
                    callback(this.soups);
                }
            }
        });
    },

    /**
     * 获取指定汤面的索引
     * @param {string} soupId 汤面ID
     * @returns {number} 汤面索引，未找到返回-1
     */
    getSoupIndex: function (soupId) {
        if (!soupId) return -1;
        const index = this.soups.findIndex(soup => soup.soupId === soupId);
        console.log('获取汤面索引:', { soupId, index, totalSoups: this.soups.length });
        return index;
    },

    /**
     * 获取下一个汤面的ID
     * @param {string} currentSoupId 当前汤面ID
     * @returns {string} 下一个汤面的ID
     */
    getNextSoupId: function (currentSoupId) {
        console.log('获取下一个汤面:', { currentSoupId, totalSoups: this.soups.length });
        const currentIndex = this.getSoupIndex(currentSoupId);
        
        // 如果找不到当前汤面，返回第一个汤面的ID
        if (currentIndex === -1) {
            console.log('未找到当前汤面，返回第一个汤面');
            return this.soups[0]?.soupId;
        }
        
        // 如果是最后一个，返回第一个汤面的ID
        if (currentIndex === this.soups.length - 1) {
            console.log('当前是最后一个汤面，返回第一个汤面');
            return this.soups[0].soupId;
        }
        
        // 返回下一个汤面的ID
        console.log('返回下一个汤面:', this.soups[currentIndex + 1].soupId);
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
        console.log('获取指定汤面:', { soupId, found: !!soup });
        return soup || null;
    },

    /**
     * 获取汤面数据
     * @param {Object} options 配置选项
     */
    getSoupData: function (options = {}) {
        const { soupId, success, fail, complete } = options;
        console.log('获取汤面数据:', { soupId, isDataLoaded: this.isDataLoaded });

        // 如果还没有从服务器加载数据，先加载
        if (!this.isDataLoaded) {
            this.loadSoupsFromServer((soups) => {
                this._processSoupData(soupId, success, fail, complete);
            });
        } else {
            this._processSoupData(soupId, success, fail, complete);
        }
    },

    /**
     * 处理汤面数据请求
     * @private
     */
    _processSoupData: function(soupId, success, fail, complete) {
        setTimeout(() => {
            try {
                let soupData;

                // 如果指定了soupId，则获取指定的汤面
                if (soupId) {
                    soupData = this.getSoupById(soupId);
                }

                // 如果没有指定soupId或找不到指定的汤面，则获取第一个
                if (!soupData && this.soups.length > 0) {
                    soupData = this.soups[0];
                }

                // 调用成功回调
                if (typeof success === 'function') {
                    success(soupData);
                }
            } catch (error) {
                if (typeof fail === 'function') {
                    fail(error);
                }
            } finally {
                // 调用完成回调
                if (typeof complete === 'function') {
                    complete();
                }
            }
        }, 300);
    },

    /**
     * 获取所有汤面数据
     * @param {Function} callback 回调函数，接收汤面数据列表
     */
    getAllSoups: function (callback) {
        if (!this.isDataLoaded) {
            this.loadSoupsFromServer(callback);
        } else if (typeof callback === 'function') {
            callback([...this.soups]);
        }
        return [...this.soups];
    },

    /**
     * 获取汤面总数
     * @returns {number} 汤面总数
     */
    getSoupCount: function () {
        return this.soups.length;
    },

    /**
     * 刷新汤面数据（从服务器重新加载）
     * @param {Function} callback 刷新完成后的回调函数
     */
    refreshSoups: function(callback) {
        console.log('刷新汤面数据');
        this.isDataLoaded = false;
        this.loadSoupsFromServer(callback);
    }
};

module.exports = soupService;