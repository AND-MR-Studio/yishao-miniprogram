/**
 * 汤面数据服务类
 * 负责处理汤面数据的加载、获取等操作
 */
const soupService = {
    // 汤面数据缓存
    soups: [
        // 默认汤面数据，将在首次加载时被服务器数据替换
        {
            soupId: 'default_001',
            title: '《找到你了》',
            contentLines: [
                '哒..哒...哒....',
                '咚咚咚',
                '哗啦哗啦',
                '哒…哒…哒…"我找到你了哦…"'
            ],
            truth: '这是一个关于寻找的故事'
        },
        {
            soupId: 'default_002',
            title: '《最后是自己》',
            contentLines: [
                '一开始是动物，',
                '然后是同类的尸体，',
                '接着是同类，',
                '最后是自己。'
            ],
            truth: '这是一个关于自我发现的故事'
        },
        {
            soupId: 'default_003',
            title: '《绿牙》',
            contentLines: [
                '红色男子清晨起来刷牙，',
                '发现自己牙齿是绿色的，',
                '他吓疯了过去。'
            ],
            truth: '这是一个关于恐惧的故事'
        }
    ],

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
        wx.request({
            url: `${this.API_BASE_URL}/list`,
            method: 'GET',
            success: (res) => {
                if (res.statusCode === 200 && res.data && res.data.length > 0) {
                    // 更新本地汤面数据
                    this.soups = res.data;
                    this.isDataLoaded = true;
                }
                
                if (typeof callback === 'function') {
                    callback(this.soups);
                }
            },
            fail: (err) => {
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
        return this.soups.findIndex(soup => soup.soupId === soupId);
    },

    /**
     * 获取下一个汤面的ID
     * @param {string} currentSoupId 当前汤面ID
     * @returns {string} 下一个汤面的ID
     */
    getNextSoupId: function (currentSoupId) {
        const currentIndex = this.getSoupIndex(currentSoupId);
        // 如果找不到当前汤面或是最后一个，返回第一个汤面的ID
        if (currentIndex === -1 || currentIndex === this.soups.length - 1) {
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
        return this.soups.find(soup => soup.soupId === soupId) || null;
    },

    /**
     * 获取汤面数据
     * @param {Object} options 配置选项
     * @param {string} options.soupId 指定要获取的汤面ID
     * @param {Function} options.success 成功回调
     * @param {Function} options.fail 失败回调
     * @param {Function} options.complete 完成回调
     */
    getSoupData: function (options = {}) {
        const { soupId, success, fail, complete } = options;

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
        this.isDataLoaded = false;
        this.loadSoupsFromServer(callback);
    }
};

module.exports = soupService;