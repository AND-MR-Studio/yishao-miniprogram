/**
 * 汤面数据服务类
 * 负责处理汤面数据的加载、获取等操作
 */
const soupService = {
    // 汤面数据库 - 模拟多个汤面
    soups: [
        {
            soupId: 'default_001',
            title: '《找到你了》',
            contentLines: [
                '哒..哒...哒....',
                '咚咚咚',
                '哗啦哗啦',
                '哒…哒…哒…"我找到你了哦…"'
            ]
        },
        {
            soupId: 'default_002',
            title: '《最后是自己》',
            contentLines: [
                '一开始是动物，',
                '然后是同类的尸体，',
                '接着是同类，',
                '最后是自己。'
            ]
        },
        {
            soupId: 'default_003',
            title: '《绿牙》',
            contentLines: [
                '红色男子清晨起来刷牙，',
                '发现自己牙齿是绿色的，',
                '他吓疯了过去。'
            ]
        }
    ],

    /**
     * 获取指定汤面的索引
     * @param {string} soupId 汤面ID
     * @returns {number} 汤面索引，未找到返回-1
     */
    getSoupIndex: function(soupId) {
        return this.soups.findIndex(soup => soup.soupId === soupId);
    },

    /**
     * 获取下一个汤面的ID
     * @param {string} currentSoupId 当前汤面ID
     * @returns {string} 下一个汤面的ID
     */
    getNextSoupId: function(currentSoupId) {
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
    getSoupById: function(soupId) {
        return this.soups.find(soup => soup.soupId === soupId) || null;
    },

    /**
     * 获取汤面数据（模拟异步请求）
     * @param {Object} options 配置选项
     * @param {string} options.soupId 指定要获取的汤面ID
     * @param {Function} options.success 成功回调
     * @param {Function} options.complete 完成回调
     */
    getSoupData: function (options = {}) {
        const { soupId, success, complete } = options;

        // 模拟网络请求
        setTimeout(() => {
            let soupData;
            
            // 如果指定了soupId，则获取指定的汤面
            if (soupId) {
                soupData = this.getSoupById(soupId);
            }
            
            // 如果没有指定soupId或找不到指定的汤面，则获取第一个
            if (!soupData) {
                soupData = this.soups[0];
            }

            // 调用成功回调
            if (typeof success === 'function') {
                success(soupData);
            }

            // 调用完成回调
            if (typeof complete === 'function') {
                complete();
            }
        }, 300);
    }
};

module.exports = soupService;