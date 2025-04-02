/**
 * 汤面数据服务类
 * 负责处理汤面数据的加载、获取等操作
 */
const soupService = {
    // 默认汤面数据
    defaultSoup: {
        soupId: 'default',
        title: '《找到你了》',
        contentLines: [
            '哒..哒...哒....',
            '咚咚咚',
            '哒....哒...哒..',
            '哗啦哗啦',
            '哒..哒…哒….."我找到你了哦"'
        ]
    },
    
    /**
     * 获取默认汤面数据
     * @returns {Object} 默认汤面数据
     */
    getDefaultSoup: function() {
        return this.defaultSoup;
    },
    
    /**
     * 更新默认汤面数据
     * @param {Object} soup 新的默认汤面数据
     * @returns {Boolean} 是否更新成功
     */
    updateDefaultSoup: function(soup) {
        if (soup && soup.title && Array.isArray(soup.contentLines)) {
            this.defaultSoup = soup;
            return true;
        }
        return false;
    },
    
    /**
     * 获取汤面数据
     * @param {Object} options 配置选项
     * @param {Function} options.success 成功回调
     * @param {Function} options.fail 失败回调
     * @param {Function} options.complete 完成回调
     */
    getSoupData: function (options = {}) {
        const { success, fail, complete } = options;

        // 模拟网络请求
        setTimeout(() => {
            const soupData = null; // 模拟后台返回空数据，实际项目中应该从服务器获取

            // 停止下拉刷新
            wx.stopPullDownRefresh();

            // 如果获取到有效数据，则返回后台数据；否则返回默认汤面
            const resultData = soupData || this.defaultSoup;

            // 调用成功回调
            if (typeof success === 'function') {
                success(resultData);
            }

            // 调用完成回调
            if (typeof complete === 'function') {
                complete();
            }
        }, 1000);
    },

    /**
     * 获取指定ID的汤面数据
     * @param {Object} options 配置选项
     * @param {String} options.soupId 汤面ID
     * @param {Function} options.success 成功回调
     * @param {Function} options.fail 失败回调
     * @param {Function} options.complete 完成回调
     */
    getSoupById: function (options = {}) {
        const { soupId, success, fail, complete } = options;

        // 特殊处理 - 如果请求的就是默认汤面
        if (soupId === 'default') {
            const defaultSoup = this.defaultSoup;
            
            if (typeof success === 'function') {
                success(defaultSoup);
            }
            
            if (typeof complete === 'function') {
                complete();
            }
            
            return;
        }

        // TODO: 实际项目中根据soupId从服务端获取特定汤面
        // 模拟网络请求
        setTimeout(() => {
            // 模拟数据为null，表示未找到
            const soupData = null;

            // 如果找到指定ID的汤面，则返回；否则返回默认汤面
            const resultData = soupData || this.defaultSoup;

            // 调用回调
            if (soupData) {
                if (typeof success === 'function') {
                    success(resultData);
                }
            } else {
                if (typeof fail === 'function') {
                    fail('未找到ID为' + soupId + '的汤面', resultData);
                }
            }

            // 调用完成回调
            if (typeof complete === 'function') {
                complete();
            }
        }, 1000);
    }
};

module.exports = soupService; 