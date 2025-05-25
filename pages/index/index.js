/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理滑动交互、切换汤面、双击收藏
 * 使用MobX管理数据，页面只负责UI交互
 */
// ===== 导入依赖 =====
const {
    SWIPE_DIRECTION,
    createInteractionManager,
} = require("../../utils/interactionManager");
const {createStoreBindings} = require("mobx-miniprogram-bindings");
const {rootStore, soupStore, userStore} = require("../../stores/index");
const api = require("../../config/api");

Page({
    // ===== 页面数据 =====
    data: {
        // 交互相关 - 由interactionManager管理
        swiping: false, // 是否正在滑动中
        swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
        swipeStarted: false, // 是否开始滑动
        // blurAmount已移至soupStore中统一管理
    },

    // ===== 生命周期方法 =====
    /**
     * 页面加载时执行
     * 获取用户ID并加载汤面
     * @param {Object} options - 页面参数，可能包含soupId
     */
    async onLoad(options) {
        // 创建rootStore绑定 - 仅用于引导层状态管理
        this.rootStoreBindings = createStoreBindings(this, {
            store: rootStore,
            fields: ["showGuide"], // 移除过时的 userId, isLoggedIn, isFirstVisit
            actions: ["toggleGuide"]
        });

        // 创建userStore绑定 - 用于获取用户登录状态
        this.userStoreBindings = createStoreBindings(this, {
            store: userStore,
            fields: ["isLoggedIn"], // 只绑定登录状态，用于权限检查
            actions: ["syncUserInfo"]
        });

        // 创建soupStore绑定 - 汤面相关字段和方法
        this.soupStoreBindings = createStoreBindings(this, {
            store: soupStore,
            fields: ["soupLoading", "buttonLoading", "soupData", "blurAmount"],
            actions: ["toggleButtonLoading", "fetchSoup", "setBlurAmount", "resetBlurAmount"]
        });

        // 同步用户信息 - 确保获取最新的用户状态
        await this.syncUserInfo();

        try {
            // 统一数据获取路径：无论是否有soupId，都通过统一的fetchSoup方法获取数据
            if (options.soupId) {
                // 如果有指定的soupId，直接通过store获取
                await soupStore.fetchSoup(options.soupId);
            } else {
                // 获取随机汤面
                await soupStore.getRandomSoup();
            }

            // 检查数据有效性
            if (!soupStore.soupData) {
                console.error("加载汤面失败");
                this.showErrorToast("加载失败，请重试");
                return;
            }

            // 注意：不再需要调用viewSoup，已在fetchSoup中处理
        } catch (error) {
            console.error("加载汤面过程中发生错误:", error);
            this.showErrorToast("加载失败，请检查网络或稍后重试");
        } finally {
            // 初始化交互管理器
            this.initInteractionManager();
        }
    },

    /**
     * 页面显示时执行
     * 设置底部TabBar选中状态并同步用户ID
     */
    /**
     * 页面显示时执行
     * 设置底部TabBar选中状态并同步用户ID
     */
    onShow() {
        // 设置底部TabBar选中状态
        if (typeof this.getTabBar === "function" && this.getTabBar()) {
            this.getTabBar().setData({
                selected: 1, // 第二个tab是喝汤页面
            });
        }

        // 同步用户信息 - 调用 userStore 的方法，避免循环调用
        this.syncUserInfo();
    },

    /**
     * 页面卸载时执行
     * 清理资源
     */
    onUnload() {
        // 清理MobX绑定
        if (this.rootStoreBindings) {
            this.rootStoreBindings.destroyStoreBindings();
        }
        if (this.userStoreBindings) {
            this.userStoreBindings.destroyStoreBindings();
        }
        if (this.soupStoreBindings) {
            this.soupStoreBindings.destroyStoreBindings();
        }

        // 清理交互管理器
        if (this.interactionManager) {
            this.interactionManager.destroy();
            this.interactionManager = null;
        }
    },

    /**
     * 分享小程序给好友
     * 使用最新的微信小程序分享API
     * 只分享当前显示的soup-display组件内容
     * @returns {Object} 分享配置对象
     */
    onShareAppMessage() {
        // 获取当前汤面数据
        const shareSoup = soupStore.soupData;

        // 构建分享标题 - 使用汤面标题或默认标题
        const shareTitle = shareSoup?.title
            ? `这个海龟汤太难了：${shareSoup.title}`
            : "这个海龟汤太难了来帮帮我！";

        // 构建分享路径 - 确保带上soupId参数
        const sharePath = `/pages/index/index?soupId=${shareSoup?.id || ''}`;

        // 构建分享图片 - 优先使用汤面图片，其次使用默认图片
        // 注意：图片必须是网络图片，且必须是https协议
        const imageUrl = shareSoup?.image || this.selectComponent('#soupDisplay')?.data.coverUrl;

        return {
            title: shareTitle,
            path: sharePath,
            imageUrl: imageUrl,
            success: function (res) {
                // 分享成功的回调
                console.log('分享成功', res);

                // 可以在这里添加分享成功的统计或其他操作
                if (shareSoup?.id) {
                    // 记录分享事件 - 使用自定义方法记录分享
                    console.log('分享汤面:', shareSoup.id, shareSoup.title || '');
                    // 注意：wx.reportAnalytics已弃用，应使用其他统计方法
                }
            },
            fail: function (res) {
                // 分享失败的回调
                console.log('分享失败', res);
            }
        };
    },

    /**
     * 分享小程序到朋友圈
     * 使用最新的微信小程序分享朋友圈API
     * 只分享当前显示的soup-display组件内容
     * @returns {Object} 分享配置对象
     */
    onShareTimeline() {
        // 获取当前汤面数据
        const shareSoup = soupStore.soupData;

        // 构建分享标题 - 使用汤面标题或默认标题
        const shareTitle = shareSoup?.title
            ? `这个海龟汤太难了：${shareSoup.title}`
            : "这个海龟汤太难了来帮帮我！";

        // 构建查询参数 - 朋友圈分享使用query而不是path
        const query = `soupId=${shareSoup?.id || ''}`;

        // 构建分享图片 - 优先使用汤面图片，其次使用默认图片
        const imageUrl = shareSoup?.image || api.assets.remote.images.share;

        return {
            title: shareTitle,
            query: query,
            imageUrl: imageUrl
        };
    },

    /**
     * 开始喝汤按钮点击事件
     * 极简逻辑，只负责跳转到chat页面
     */
    async onStartSoup() {
        // 检查用户是否已登录 - 使用rootStore的isLoggedIn属性
        if (!this.data.isLoggedIn) {
            // 显示登录提示弹窗
            const loginPopup = this.selectComponent("#loginPopup");
            if (loginPopup) {
                loginPopup.show();
            }
            // 重置按钮加载状态
            this.toggleButtonLoading(false);
            return;
        }

        // 直接跳转到chat页面
        wx.navigateTo({
            url: `/pages/chat/chat?soupId=${soupStore.soupData?.id || ''}`,
            success: () => {
                // 跳转成功后重置按钮状态
                setTimeout(() => {
                    this.toggleButtonLoading(false);
                }, 500);
            },
            fail: () => {
                // 跳转失败立即重置按钮状态
                this.toggleButtonLoading(false);
                this.showErrorToast("跳转失败，请重试");
            }
        });
    },

    /**
     * 处理登录弹窗确认按钮点击事件
     */
    onLoginConfirm() {
        // 跳转到个人中心页面
        wx.switchTab({
            url: "/pages/mine/mine",
        });
    },

    /**
     * 处理登录弹窗取消按钮点击事件
     */
    onLoginCancel() {
        // 取消登录，不执行任何操作，弹窗会自动关闭
        console.log('用户取消登录');
    },

    /**
     * 处理导航栏首页按钮点击事件，刷新首页数据
     */
    onRefreshHome() {
        console.log('刷新首页数据');
        // 重新加载随机汤面
        this.switchSoup();
    },

    /**
     * 处理显示引导事件
     * 通过nav-bar组件转发的setting组件事件
     */
    onShowGuide() {
        // 调用rootStore的toggleGuide方法显示引导层
        rootStore.toggleGuide(true);
    },

    /**
     * 处理关闭引导事件
     * 引导层组件的关闭事件
     */
    onCloseGuide() {
        // 调用rootStore的toggleGuide方法隐藏引导层
        this.toggleGuide(false);
    },

    // ===== 汤面切换相关 =====
    /**
     * 切换汤面
     * 极简版本，只负责UI效果和调用store方法
     * 确保在切换过程中保持之前的内容并显示模糊效果
     * @returns {Promise<void>}
     */
    async switchSoup() {
        // 如果正在加载，不执行切换
        if (this.data.soupLoading) return;

        try {
            // 先应用模糊效果，确保在加载新数据前保持之前的内容
            // 直接使用store中的方法设置模糊效果
            this.setBlurAmount(3);

            // 使用MobX store中的getRandomSoup方法获取随机汤面
            // 该方法内部会调用fetchSoup加载完整数据，并自动处理模糊效果
            const soupData = await soupStore.getRandomSoup();

            if (!soupData) {
                this.showErrorToast("切换失败，请重试");
            }
        } catch (error) {
            console.error("切换汤面失败:", error);
            this.showErrorToast("切换失败，请重试");
            // 出错时也需要重置模糊效果
            this.resetBlurAmount();
        }
        // 注意：不需要finally块，因为fetchSoup方法内部已经处理了模糊效果的重置
    },

    // ===== 交互相关 =====
    /**
     * 处理soup-display组件的滑动事件
     * @param {Object} e 事件对象
     */
    handleSoupSwipe(e) {
        const {direction} = e.detail;

        // 等待一帧，确保滑动反馈动画先应用
        wx.nextTick(() => {
            this.switchSoup(direction);
        });
    },

    /**
     * 处理双击收藏事件
     * 检查登录状态，未登录时显示登录弹窗
     */
    async handleDoubleTap() {
        if (soupStore.soupData?.id) {
            // 检查用户是否已登录 - 使用rootStore的isLoggedIn属性
            if (!this.data.isLoggedIn) {
                // 显示登录提示弹窗
                const loginPopup = this.selectComponent("#loginPopup");
                if (loginPopup) {
                    loginPopup.show();
                }
                return;
            }

            // 用户已登录，调用store的方法
            await soupStore.toggleFavorite(soupStore.soupData.id);
        }
    },

    // ===== 辅助方法 =====
    /**
     * 显示错误提示
     * @param {string} message 错误信息
     */
    showErrorToast(message) {
        wx.showToast({
            title: message,
            icon: "none",
            duration: 2000,
        });
    },


    // ===== 交互管理器相关 =====
    /**
     * 初始化交互管理器
     * 创建交互管理器实例并设置回调函数
     */
    initInteractionManager() {
        // 创建交互管理器实例
        this.interactionManager = createInteractionManager({
            // 设置数据更新方法 - 直接传递页面的setData方法
            setData: this.setData.bind(this),
            // 设置模糊效果更新方法 - 使用store中的方法
            setBlurAmount: this.setBlurAmount.bind(this),
            // 回调函数 - 简化为直接调用页面方法
            onSwipeLeft: () => this.switchSoup("next"),
            onSwipeRight: () => this.switchSoup("previous"),
            onDoubleTap: this.handleDoubleTap.bind(this),
        });
    },

    /**
     * 触摸开始事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchStart(e) {
        this.interactionManager?.handleTouchStart(e, !this.data.soupLoading);
    },

    /**
     * 触摸移动事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchMove(e) {
        this.interactionManager?.handleTouchMove(e, !this.data.soupLoading);
    },

    /**
     * 触摸结束事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchEnd(e) {
        this.interactionManager?.handleTouchEnd(e, !this.data.soupLoading);
    },
});
