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
    error = null; // 错误信息

    // ===== 加载状态 =====
    soupLoading = false; // 汤面数据加载状态
    buttonLoading = false; // UI按钮加载状态

    // ===== UI状态 =====
    blurAmount = 0; // 模糊程度

    rootStore = null;    constructor(rootStore) {
        this.rootStore = rootStore;        makeAutoObservable(this, {
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
    }    /**
     * 统一的汤面数据获取方法 - 异步流程
     * 如果提供soupId则获取指定汤面，否则获取随机汤面
     * @param {string} soupId 汤面ID字符串，为空时获取随机汤面
     * @returns {Promise<Object>} 汤面数据
     */
    * fetchSoup(soupId) {
        // 防止重复请求同一个soupId
        if (soupId && this._fetchingId === soupId) return this.soupData;

        try {
            // 清除之前的错误状态
            this.error = null;
            // 设置加载状态
            this.soupLoading = true;

            let soupData = null;

            if (soupId) {
                // 设置当前正在获取的ID
                this._fetchingId = soupId;
                
                // 获取指定ID的汤面数据
                soupData = yield soupService.getSoup(soupId);
                
                // 如果获取失败，抛出错误
                if (!soupData) {
                    throw new Error(`获取汤面数据失败: ${soupId}`);
                }
            } else {
                // 没有指定ID，获取随机汤面
                soupData = yield soupService.getRandomSoup();
                
                if (!soupData) {
                    throw new Error("获取随机汤面数据失败");
                }
            }

            // 更新汤面数据
            this.soupData = soupData;

            return soupData;
        } catch (error) {
            console.error("获取汤面数据失败:", error);
            this.error = error.message; // UI 只关心 error 是否为空
        } finally {
            // 重置加载状态和请求标志
            this.soupLoading = false;
            this._fetchingId = null;
            // 重置模糊效果
            this.resetBlurAmount();
        }
    }/**
     * 获取随机汤面数据 - Store层专注状态管理
     * 调用 Service 层获取随机汤面数据，然后更新本地状态
     * @returns {Promise<Object>} 随机汤面数据
     */
    * getRandomSoup() {
        try {
            // 清除之前的错误状态
            this.error = null;
            
            // 调用 Service 层获取随机汤面
            const randomSoup = yield soupService.getRandomSoup();
            if (randomSoup && randomSoup.id) {
                // 使用 fetchSoup 统一处理数据获取和状态更新
                return yield this.fetchSoup(randomSoup.id);
            }
            return null;
        } catch (error) {
            console.error("获取随机汤面失败:", error);
            this.error = error.message; // UI 只关心 error 是否为空
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

    // computed 属性 - 获取聊天页面 URL
    get chatPageUrl() {
        return this.soupData?.chatPageUrl || '';
    }

    // computed 属性 - 检查是否可以开始喝汤
    get canStartChat() {
        return this.soupData?.id && this.chatPageUrl && !this.soupLoading;
    }
}

// 导出类
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
    SoupStoreClass: SoupStore,
};
