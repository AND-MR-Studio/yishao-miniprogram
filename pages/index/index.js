/**
 * 首页 - 海龟汤展示与交互
 * 负责展示汤面内容、处理滑动交互、切换汤面、双击收藏
 * 使用MobX管理数据，页面只负责UI交互
 */
// ===== 导入依赖 =====
const {
    SWIPE_DIRECTION,
    createGestureManager,
} = require("../../utils/gestureManager");
const { createStoreBindings } = require("mobx-miniprogram-bindings");
const { rootStore } = require("../../stores/index");

Page({
    // ===== 页面数据 =====
    data: {
        // 交互相关 - 由统一手势管理器管理
        swiping: false, // 是否正在滑动中
        swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
        swipeStarted: false, // 是否开始滑动
    },

    // ===== 生命周期方法 =====
    /**
     * 页面加载时执行
     * 获取用户ID并加载汤面
     * @param {Object} options - 页面参数，可能包含soupId
     */
        async onLoad(options) {
        // 创建settingStore绑定 - 用于引导层状态管理
        this.settingStoreBindings = createStoreBindings(this, {
            store: rootStore.settingStore,
            fields: ["showGuide"], // 引导层显示状态
            actions: ["toggleGuide"] // 引导层控制方法
        });
        // 创建userStore绑定 - 只用于同步用户信息
        this.userStoreBindings = createStoreBindings(this, {
            store: rootStore.userStore,
            fields: ["isLoggedIn"], // 添加登录状态字段
            actions: ["syncUserInfo"]
        });
        // 创建soupStore绑定 - 汤面相关字段和方法
        this.soupStoreBindings = createStoreBindings(this, {
            store: rootStore.soupStore,
            fields: [
                "soupLoading",
                "chatLoading",
                "soupData",
                "blurAmount",
                "chatPageUrl",
                // 添加computed属性用于UI响应式控制
                "isLoading"
            ],
            actions: ["toggleChatLoading", "fetchSoup", "setBlurAmount", "resetBlurAmount"]
        });
        // 显示引导层
        rootStore.settingStore.toggleGuide(true);
        
        // 初始化手势管理器
        this.initInteractionManager();

        // 获取汤面数据，添加错误处理
        try {
            await rootStore.soupStore.fetchSoup(options.soupId);
        } catch (error) {
            console.error('加载汤面数据失败:', error);
            wx.showToast({
                title: '加载失败，请重试',
                icon: 'none'
            });
        }

    },

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
        if (this.settingStoreBindings) {
            this.settingStoreBindings.destroyStoreBindings();
        }
        if (this.userStoreBindings) {
            this.userStoreBindings.destroyStoreBindings();
        }
        if (this.soupStoreBindings) {
            this.soupStoreBindings.destroyStoreBindings();
        }
        if (this.gestureManager) {
            this.gestureManager.destroy();
            this.gestureManager = null;
        }
    },

    /**
     * 分享小程序给好友
     * 使用最新的微信小程序分享API
     * 只分享当前显示的soup-display组件内容
     * @returns {Object} 分享配置对象
     */
    onShareAppMessage() {
        // 获取当前汤面数据 - 使用绑定的字段
        const shareSoup = this.data.soupData;

        // 构建分享标题 - 使用汤面标题或默认标题
        const shareTitle = shareSoup?.title
            ? `这个海龟汤太难了：${shareSoup.title}`
            : "这个海龟汤太难了来帮帮我！";

        // 构建分享路径 - 确保带上soupId参数
        const sharePath = `/pages/index/index?soupId=${shareSoup?.id || ''}`;

        // 构建分享图片 - 优先使用汤面图片，其次使用默认图片
        // 注意：图片必须是网络图片，且必须是https协议
        const imageUrl = shareSoup?.image;

        return {
            title: shareTitle,
            path: sharePath,
            imageUrl: imageUrl,
            success: function (res) {
                // 分享成功的回调
                console.log('分享成功', res);
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
        // 获取当前汤面数据 - 使用绑定的字段
        const shareSoup = this.data.soupData;

        // 构建分享标题 - 使用汤面标题或默认标题
        const shareTitle = shareSoup?.title
            ? `这个海龟汤太难了：${shareSoup.title}`
            : "这个海龟汤太难了来帮帮我！";

        // 构建查询参数 - 朋友圈分享使用query而不是path
        const query = `soupId=${shareSoup?.id || ''}`;

        // 构建分享图片 - 优先使用汤面图片，其次使用默认图片
        const imageUrl = shareSoup?.image;

        return {
            title: shareTitle,
            query: query,
            imageUrl: imageUrl
        };
    },

    /**
     * 开始喝汤按钮点击事件
     * 使用后端返回的 chatPageUrl 进行跳转
     */
    async onStartChat() {
        // 检查用户是否已登录
        if (!this.data.isLoggedIn) {
            // 显示登录提示弹窗
            const loginPopup = this.selectComponent("#loginPopup");
            if (loginPopup) {
                loginPopup.show();
            }
            return;
        }

        this.toggleChatLoading(true);

        // 直接使用 store 中的 chatPageUrl 跳转
        wx.navigateTo({
            url: this.data.chatPageUrl,
            success: () => {
                setTimeout(() => {
                    this.toggleChatLoading(false);
                }, 500);
            },
            fail: () => {
                this.toggleChatLoading(false);
                wx.showToast({
                    title: "跳转失败，请重试",
                    icon: "none"
                });
            }
        });
    },
    /**
     * 处理导航栏首页按钮点击事件，刷新首页数据
     */
    onRefreshHome() {
        console.log('刷新首页数据');
        // 重新加载随机汤面
        this.switchSoup();
    },

    // ===== 汤面切换相关 =====    
    // 
    /**
     * 切换汤面
     * 完全响应式版本，依赖MobX computed属性自动判断状态
     * UI自动根据store状态更新，无需手动检查
     */
    async switchSoup() {
        // 先应用模糊效果，确保在加载新数据前保持之前的内容
        this.setBlurAmount(3);

        // 使用MobX store中的getRandomSoup方法获取随机汤面
        try {
            await rootStore.soupStore.getRandomSoup();
        } catch (error) {
            console.error('切换汤面失败:', error);
            wx.showToast({
                title: '加载失败，请重试',
                icon: 'none'
            });
            // 注意：不需要在这里重置模糊效果，因为 soupStore.fetchSoup 的 finally 块会自动处理
        }
    },

    // ===== 交互相关 =====
    /**
     * 处理soup-display组件的滑动事件
     * @param {Object} e 事件对象
     */
    handleSoupSwipe(e) {
        const { direction } = e.detail;

        // 等待一帧，确保滑动反馈动画先应用
        wx.nextTick(() => {
            this.switchSoup(direction);
        });
    },
    /**
     * 处理双击点赞事件
     * 全自动响应，登录检查由userStore自动处理
     */
    async handleDoubleTapLike() {
        try {
            // 使用绑定字段获取soupData.id
            const result = await rootStore.userStore.toggleLike(this.data.soupData.id);

            // 显示操作反馈
            if (result && result.success) {
                wx.showToast({
                    title: result.message,
                    icon: 'none',
                    duration: 1500
                });

                // 触发震动反馈
                wx.vibrateShort();

            }
        } catch (error) {
            console.error('双击点赞失败:', error);
        }
    },
    /**
     * 处理长按收藏事件
     * 全自动响应，登录检查由userStore自动处理
     */
    async handleLongPressFavorite() {
        try {
            // 使用绑定字段获取soupData.id
            const result = await rootStore.userStore.toggleFavorite(this.data.soupData.id);

            // 显示操作反馈
            if (result && result.success) {
                wx.showToast({
                    title: result.message,
                    icon: 'none',
                    duration: 1500
                });

                // 触发震动反馈
                wx.vibrateShort();

            }
        } catch (error) {
            console.error('长按收藏失败:', error);
        }
    },

    // ===== 指南相关事件处理 =====
    /**
     * 显示指南层
     * 通过settingStore统一管理指南状态
     */
    onShowGuide() {
        // 使用绑定的action方法
        this.toggleGuide(true);
    },

    /**
     * 关闭指南层
     * 通过settingStore统一管理指南状态
     */
    onCloseGuide() {
        // 使用绑定的action方法
        this.toggleGuide(false);
    },

    // ===== 手势管理器相关 =====
    /**
     * 初始化手势管理器
     * 创建统一手势管理器实例并设置回调函数
     */
    initInteractionManager() {
        // 创建统一手势管理器实例
        this.gestureManager = createGestureManager({
            // 启用滑动功能
            enableSwipe: true,
            enableBlurEffect: true,
            enableBackgroundEffect: true,

            // 启用双击和长按功能
            enableDoubleTap: true,
            enableLongPress: true,

            // 设置数据更新方法
            setData: this.setData.bind(this),
            setBlurAmount: this.setBlurAmount.bind(this),

            // 滑动回调函数
            onSwipeLeft: () => this.switchSoup("next"),
            onSwipeRight: () => this.switchSoup("previous"),

            // 双击点赞回调函数
            onDoubleTap: this.handleDoubleTapLike.bind(this),

            // 长按收藏回调函数
            onLongPressStart: this.handleLongPressFavorite.bind(this),
        });
    },
    /**
     * 触摸开始事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchStart(e) {
        this.gestureManager?.handleTouchStart(e, { canInteract: !this.data.isLoading });
    },

    /**
     * 触摸移动事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchMove(e) {
        this.gestureManager?.handleTouchMove(e, { canInteract: !this.data.isLoading });
    },

    /**
     * 触摸结束事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchEnd(e) {
        this.gestureManager?.handleTouchEnd(e, { canInteract: !this.data.isLoading });    },
});
