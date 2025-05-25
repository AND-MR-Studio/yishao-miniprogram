const {makeAutoObservable, flow} = require("mobx-miniprogram");
const soupService = require("../service/soupService");

/**
 * 汤面Store类 - 管理汤面数据和交互状态
 * 负责汤面数据的获取、更新和交互状态管理
 * 通过userStore获取用户信息和处理用户交互
 */
class SoupStore {
    // ===== 可观察状态 =====
    // 核心数据
    soupData = null; // 当前汤面数据

    // 汤面交互状态
    isLiked = false; // 是否已点赞
    isFavorite = false; // 是否已收藏
    likeCount = 0; // 点赞数量
    favoriteCount = 0; // 收藏数量
    viewCount = 0; // 阅读数量

    // 加载状态
    soupLoading = false; // 是否正在加载汤面数据
    buttonLoading = false; // 开始喝汤按钮的加载状态

    // UI状态
    blurAmount = 0; // 模糊程度（0-10px）

    // 防止重复请求的标志
    _fetchingId = null; // 当前正在获取数据的soupId

    rootStore = null;

    constructor(rootStore) {
        // 保存rootStore和userStore引用
        this.rootStore = rootStore;

        // 使用makeAutoObservable实现全自动响应式
        makeAutoObservable(this, {
            // 标记异步方法为flow
            toggleLike: flow,
            toggleFavorite: flow,
            fetchSoup: flow, // 将 fetchSoup 标记为 flow，因为它是 generator 函数

            // 普通方法，不需要flow
            // fetchSoup: false, // async 方法需要标记为普通方法
            toggleButtonLoading: false,

            // 标记为非观察属性
            _fetchingId: false,
            rootStore: false,
        });
    }

    // 获取用户ID的计算属性
    get userId() {
        return this.rootStore?.userStore?.userId || '';
    }

    // 获取登录状态的计算属性
    get isLoggedIn() {
        return this.rootStore?.userStore?.isLoggedIn || false;
    }

    /**
     * 统一的汤面数据获取方法 - 异步流程
     * 通过ID获取汤面数据，防止重复请求，自动处理交互状态
     * @param {string} soupId 汤面ID
     * @param {boolean} incrementViews 是否增加阅读数，默认为true
     * @returns {Promise<Object>} 汤面数据
     */
    * fetchSoup(soupId, incrementViews = true) {
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
            }

            // 更新汤面数据
            this.soupData = soupData;

            // 如果需要增加阅读数
            if (incrementViews) {
                const viewResult = yield soupService.viewSoup(soupId);
                this.viewCount = viewResult ? viewResult.views : (soupData.views || 0);
            } else {
                this.viewCount = soupData.views || 0;
            }

            // 直接从 userStore 获取用户交互状态，后端处理未登录情况
            this.isLiked = this.rootStore?.userStore.isLikedSoup(soupId);
            this.isFavorite = this.rootStore?.userStore.isFavoriteSoup(soupId);

            // 更新计数
            this.likeCount = soupData.likes || 0;
            this.favoriteCount = soupData.favorites || 0;

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
     * 切换点赞状态 - 直接调用 userStore 和 soupService，后端处理登录检查
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object>} 操作结果，包含成功状态和消息
     */
    * toggleLike(soupId) {
        // 参数校验
        if (!soupId) {
            return {success: false, message: "缺少汤面ID"};
        }

        try {
            // 直接内联获取当前状态并计算新状态
            const newStatus = !this.rootStore?.userStore.isLikedSoup(soupId);

            // 并行更新用户记录和汤面记录，使用 userStore 的便捷方法
            const [userResult, soupResult] = yield Promise.all([
                this.rootStore?.userStore.toggleLike(soupId),
                soupService.likeSoup(soupId, newStatus)
            ]);

            // 验证用户记录更新结果
            if (!userResult || !userResult.success) {
                return {success: false, message: userResult?.error || "点赞状态更新失败，请重试"};
            }

            // 验证汤面记录更新结果
            if (!soupResult || !soupResult.success) {
                return {success: false, message: "点赞状态更新失败，请重试"};
            }

            // 更新本地状态
            this.likeCount = soupResult.likes || this.likeCount;
            this.isLiked = newStatus;

            // 返回成功结果
            return {
                success: true,
                message: newStatus ? "点赞成功" : "已取消点赞",
                isLiked: this.isLiked,
                likeCount: this.likeCount
            };
        } catch (error) {
            console.error("点赞操作失败:", error);
            return {
                success: false,
                message: "操作失败: " + (error.message || "未知错误")
            };
        }
    }

    /**
     * 切换收藏状态 - 直接调用 userStore 和 soupService，后端处理登录检查
     * @param {string} soupId 汤面ID
     * @returns {Promise<Object>} 操作结果，包含成功状态和消息
     */
    * toggleFavorite(soupId) {
        // 参数校验
        if (!soupId) {
            return {success: false, message: "缺少汤面ID"};
        }

        try {
            // 直接内联获取当前状态并计算新状态
            const newStatus = !this.rootStore?.userStore.isFavoriteSoup(soupId);

            // 并行更新用户记录和汤面记录，使用 userStore 的便捷方法
            const [userResult, soupResult] = yield Promise.all([
                this.rootStore?.userStore.toggleFavorite(soupId),
                soupService.favoriteSoup(soupId, newStatus)
            ]);

            // 验证用户记录更新结果
            if (!userResult || !userResult.success) {
                return {success: false, message: userResult?.error || "收藏状态更新失败，请重试"};
            }

            // 验证汤面记录更新结果
            if (!soupResult || !soupResult.success) {
                return {success: false, message: "收藏状态更新失败，请重试"};
            }

            // 更新本地状态
            this.favoriteCount = soupResult.favorites || this.favoriteCount;
            this.isFavorite = newStatus;

            // 返回成功结果
            return {
                success: true,
                message: newStatus ? "收藏成功" : "已取消收藏",
                isFavorite: this.isFavorite,
                favoriteCount: this.favoriteCount
            };
        } catch (error) {
            console.error("收藏操作失败:", error);
            return {
                success: false,
                message: "操作失败: " + (error.message || "未知错误")
            };
        }
    }

    /**
     * 获取随机汤面数据
     * 直接调用soupService的getRandomSoup方法，然后使用fetchSoup加载完整数据
     * fetchSoup内部已经实现了并行请求优化，可以同时获取汤面数据和交互状态
     * @returns {Promise<Object>} 随机汤面数据
     */
    async getRandomSoup() {
        try {
            const randomSoup = await soupService.getRandomSoup();
            if (randomSoup && randomSoup.id) {
                // 使用fetchSoup加载完整数据
                // fetchSoup内部已经实现了并行请求优化
                return await this.fetchSoup(randomSoup.id);
            }
            return null;
        } catch (error) {
            console.error("获取随机汤面失败:", error);
            return null;
        }
    }

    /**
     * 获取随机汤面并返回汤面ID - 专门为ChatStore设计
     * 调用getRandomSoup方法，但只返回汤面ID
     * @returns {Promise<string>} 随机汤面ID
     */
    async fetchRandom() {
        try {
            const soupData = await this.getRandomSoup();
            return soupData ? soupData.id : null;
        } catch (error) {
            console.error("获取随机汤面ID失败:", error);
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
