const {makeAutoObservable, flow} = require("mobx-miniprogram");
const soupService = require("../service/soupService");

/**
 * 汤面Store类 - 专注汤面数据管理
 * 职责：汤面数据获取、显示状态管理
 * 交互操作交由后端统一处理，前端只负责状态展示
 */
class SoupStore {
    // ===== 核心数据 =====
    soupData = null; // 当前汤面数据

    // ===== 显示状态（从汤面数据中提取） =====
    // 移除冗余的交互状态，直接从soupData和userStore获取

    // ===== 加载状态 =====
    soupLoading = false; // 汤面数据加载状态
    buttonLoading = false; // UI按钮加载状态

    // ===== UI状态 =====
    blurAmount = 0; // 模糊程度

    rootStore = null;

    constructor(rootStore) {
        this.rootStore = rootStore;
        makeAutoObservable(this, {
            fetchSoup: flow,
            getRandomSoup: flow,

            // 简化配置，专注数据管理
            toggleButtonLoading: false,
            rootStore: false,
        });
    }// 获取汤面统计数据 - 直接从soupData获取
    get likeCount() {
        return this.soupData?.likes || 0;
    }

    get favoriteCount() {
        return this.soupData?.favorites || 0;
    }

    get viewCount() {
        return this.soupData?.views || 0;
    }

    /**
     * 统一的汤面数据获取方法 - 异步流程
     * 通过ID获取汤面数据，防止重复请求，自动处理交互状态
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object>} 汤面数据
     */
    * fetchSoup(soupId) {
        // 参数校验
        if (!soupId) return null;

        // 防止重复请求同一个soupId
        if (this._fetchingId === soupId) return this.soupData;

        // 设置当前正在获取的ID
        this._fetchingId = soupId;

        try {
            // 设置加载状态
            this.soupLoading = true;

            // 获取汤面数据
            let soupData = yield soupService.getSoup(soupId);

            // 如果获取失败，尝试获取随机汤面
            if (!soupData) {
                soupData = yield soupService.getRandomSoup();
                if (!soupData) {
                    throw new Error("获取汤面数据失败");
                }
                // 更新soupId为随机汤面的ID
                soupId = soupData.id;
            }            // 更新汤面数据
            this.soupData = soupData;

            return soupData;
        } catch (error) {
            console.error("获取汤面数据失败:", error);
            return null;
        } finally {
            // 重置加载状态和请求标志
            this.soupLoading = false;
            this._fetchingId = null;
            // 重置模糊效果
            this.resetBlurAmount();
        }
    }

    /**
     * 获取随机汤面数据 - Store层专注状态管理
     * 调用 Service 层获取随机汤面数据，然后更新本地状态
     * @returns {Promise<Object>} 随机汤面数据
     */
    * getRandomSoup() {
        try {
            // 调用 Service 层获取随机汤面
            const randomSoup = yield soupService.getRandomSoup();
            if (randomSoup && randomSoup.id) {
                // 使用 fetchSoup 统一处理数据获取和状态更新
                return yield this.fetchSoup(randomSoup.id);
            }
            return null;
        } catch (error) {
            console.error("获取随机汤面失败:", error);
            return null;
        }
    }


    /**
     * 统一的按钮加载状态控制方法
     * 使用MobX的action装饰器确保状态更新的响应式
     * @param {boolean} isLoading 是否设置为加载状态
     */
    toggleButtonLoading(isLoading) {
        this.buttonLoading = isLoading;

        // 如果设置为加载状态，设置自动超时保护
        if (isLoading) {
            // 清理之前的超时计时器
            if (this._buttonLoadingTimeout) {
                clearTimeout(this._buttonLoadingTimeout);
            }

            // 设置一个超时，如果5秒后仍在加载，则自动重置
            this._buttonLoadingTimeout = setTimeout(() => {
                this.toggleButtonLoading(false);
            }, 5000);
        } else {
            // 清理超时计时器
            if (this._buttonLoadingTimeout) {
                clearTimeout(this._buttonLoadingTimeout);
                this._buttonLoadingTimeout = null;
            }
        }
    }

    /**
     * 设置模糊效果
     * @param {number} amount 模糊程度（0-10px）
     */
    setBlurAmount(amount) {
        // 确保值在有效范围内
        this.blurAmount = Math.max(0, Math.min(10, amount));
    }

    /**
     * 重置模糊效果
     */
    resetBlurAmount() {
        this.blurAmount = 0;
    }
}

// 导出类
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
    SoupStoreClass: SoupStore,
};
