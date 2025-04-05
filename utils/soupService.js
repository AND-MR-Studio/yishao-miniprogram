/**
 * 汤面数据服务类
 * 负责处理汤面数据的加载、获取等操作
 */
const soupService = {
    // 已查看的汤面ID缓存
    viewedSoupIds: [],

    // 已回答的汤面ID缓存
    answeredSoupIds: [],

    // 汤面数据库 - 模拟多个汤面
    soups: [
        {
            soupId: 'default',
            title: '《找到你了》',
            contentLines: [
                '哒..哒...哒....',
                '咚咚咚',
                '哗啦哗啦',
                '哒…哒…哒…"我找到你了哦…"'
            ]
        },
        {
            soupId: 'soup001',
            title: '《最后是自己》',
            contentLines: [
                '一开始是动物，',
                '然后是同类的尸体，',
                '接着是同类，',
                '最后是自己。'
            ]
        },
        {
            soupId: 'soup002',
            title: '《绿牙》',
            contentLines: [
                '红色男子清晨起来刷牙，',
                '发现自己牙齿是绿色的，',
                '他吓疯了过去。'
            ]
        }
    ],

    // 默认汤面索引
    defaultSoupIndex: 0,

    // 当前使用的汤面索引
    currentSoupIndex: 0,

    /**
     * 获取默认汤面数据
     * @returns {Object} 默认汤面数据
     */
    getDefaultSoup: function () {
        return this.soups[this.defaultSoupIndex];
    },

    /**
     * 获取下一个汤面，优先获取未回答的，其次获取未查看的，最后循环所有汤面
     * @returns {Object} 汤面数据
     */
    getNextSoup: function () {
        // 存储所有未回答的汤面索引
        const unansweredIndices = [];
        // 存储所有未查看的汤面索引
        const unviewedIndices = [];
        // 所有汤面索引
        const allIndices = [];

        // 遍历所有汤面，分类
        for (let i = 0; i < this.soups.length; i++) {
            const soup = this.soups[i];
            allIndices.push(i);

            if (!this.answeredSoupIds.includes(soup.soupId)) {
                unansweredIndices.push(i);

                if (!this.viewedSoupIds.includes(soup.soupId)) {
                    unviewedIndices.push(i);
                }
            }
        }

        // 优先选择未回答的汤面
        if (unansweredIndices.length > 0) {
            const nextUnanswerIndex = unansweredIndices[(this.currentSoupIndex + 1) % unansweredIndices.length];
            this.currentSoupIndex = nextUnanswerIndex;
            return this.soups[nextUnanswerIndex];
        }

        // 如果所有汤面都已回答，但要求循环显示，则从所有汤面中选择下一个
        const nextIndex = (this.currentSoupIndex + 1) % this.soups.length;
        this.currentSoupIndex = nextIndex;
        return this.soups[nextIndex];
    },

    /**
     * 标记汤面已查看
     * @param {String} soupId 汤面ID
     */
    markSoupAsViewed: function (soupId) {
        if (soupId && !this.viewedSoupIds.includes(soupId)) {
            this.viewedSoupIds.push(soupId);
            return true;
        }
        return false;
    },

    /**
     * 标记汤面已回答
     * @param {String} soupId 汤面ID
     */
    markSoupAsAnswered: function (soupId) {
        if (soupId && !this.answeredSoupIds.includes(soupId)) {
            this.answeredSoupIds.push(soupId);
            // 同时也标记为已查看
            this.markSoupAsViewed(soupId);
            return true;
        }
        return false;
    },

    /**
     * 检查汤面是否已回答
     * @param {String} soupId 汤面ID
     * @returns {Boolean} 是否已回答
     */
    isSoupAnswered: function (soupId) {
        return this.answeredSoupIds.includes(soupId);
    },

    /**
     * 重置已查看状态
     */
    resetViewedSoups: function () {
        this.viewedSoupIds = [];
    },

    /**
     * 重置已回答状态
     */
    resetAnsweredSoups: function () {
        this.answeredSoupIds = [];
    },

    /**
     * 重置所有状态
     */
    resetAllStatus: function () {
        this.viewedSoupIds = [];
        this.answeredSoupIds = [];
    },

    /**
     * 更新默认汤面数据
     * @param {Object} soup 新的默认汤面数据
     * @returns {Boolean} 是否更新成功
     */
    updateDefaultSoup: function (soup) {
        if (soup && soup.title && Array.isArray(soup.contentLines)) {
            this.soups[this.defaultSoupIndex] = soup;
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
            // 取得下一个汤面
            const soupData = this.getNextSoup();

            // 停止下拉刷新
            wx.stopPullDownRefresh();

            // 调用成功回调
            if (typeof success === 'function') {
                success(soupData);
            }

            // 调用完成回调
            if (typeof complete === 'function') {
                complete();
            }
        }, 300); // 减少等待时间
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

        // 模拟网络请求
        setTimeout(() => {
            // 根据ID查找汤面
            const soupData = this.soups.find(soup => soup.soupId === soupId);

            // 如果找到指定ID的汤面，则返回；否则返回默认汤面
            const resultData = soupData || this.getDefaultSoup();

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
        }, 300);
    }
};

module.exports = soupService; 