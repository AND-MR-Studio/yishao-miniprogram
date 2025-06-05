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
const {createStoreBindings} = require("mobx-miniprogram-bindings");
const {soupStore, userStore, settingStore} = require("../../stores/index");
const api = require("../../config/api");

Page({
    // ===== 页面数据 =====
    data: {        // 交互相关 - 由统一手势管理器管理
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
     */    async onLoad(options) {
        // 创建settingStore绑定 - 用于引导层状态管理
        this.settingStoreBindings = createStoreBindings(this, {
            store: settingStore,
            fields: ["showGuide"], // 引导层显示状态
            actions: ["toggleGuide"] // 引导层控制方法
        });

        // 创建userStore绑定 - 用于获取用户登录状态
        this.userStoreBindings = createStoreBindings(this, {
            store: userStore,
            fields: ["isLoggedIn", "shouldShowLoginPopup"], // 只绑定登录状态，用于权限检查
            actions: ["syncUserInfo"]
        });

        // 创建soupStore绑定 - 汤面相关字段和方法
        this.soupStoreBindings = createStoreBindings(this, {
            store: soupStore,
            fields: ["soupLoading", "buttonLoading", "soupData", "blurAmount", "chatPageUrl", "canStartChat", "error"],
            actions: ["toggleButtonLoading", "fetchSoup", "setBlurAmount", "resetBlurAmount"]
        });// 显示引导层 - 直接使用store方法，因为app.js不是页面
         
         settingStore.toggleGuide(true);

         // 初始化手势管理器
         this.initInteractionManager();

         await soupStore.fetchSoup(options.soupId);
         if (soupStore.error) {
             this.showErrorToast('加载失败，请重试');
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
        }        // 清理手势管理器
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
     * 使用后端返回的 chatPageUrl 进行跳转
     */
    async onStartChat() {
            this.toggleButtonLoading(true);

        // 直接使用 store 中的 chatPageUrl 跳转
        wx.navigateTo({
            url: this.data.chatPageUrl,
            success: () => {
                setTimeout(() => {
                    this.toggleButtonLoading(false);
                }, 500);
            },
            fail: () => {
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

    /**    /**
     * 处理导航栏首页按钮点击事件，刷新首页数据
     */
    onRefreshHome() {
        console.log('刷新首页数据');
        // 重新加载随机汤面
        this.switchSoup();
    },

    // ===== 汤面切换相关 =====
    /**
     * 切换汤面
     * 极简版本，只负责UI效果和调用store方法
     * 确保在切换过程中保持之前的内容并显示模糊效果
     */
    async switchSoup() {
        // 如果正在加载，不执行切换
        if (this.data.soupLoading) return;

        // 先应用模糊效果，确保在加载新数据前保持之前的内容
        this.setBlurAmount(3);

        // 使用MobX store中的getRandomSoup方法获取随机汤面
        await soupStore.getRandomSoup();
        
        // 检查是否有错误
        if (this.data.error) {
            this.showErrorToast("切换失败，请重试");
        }
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
    },    /**
     * 处理双击点赞事件
     * 检查登录状态，未登录时显示登录弹窗
     */
    async handleDoubleTapLike() {
        if (soupStore.soupData?.id) {
            // 检查用户是否已登录 - 使用userStore的isLoggedIn属性
            if (!this.data.isLoggedIn) {
                // 显示登录提示弹窗
                const loginPopup = this.selectComponent("#loginPopup");
                if (loginPopup) {
                    loginPopup.show();
                }
                return;
            }

            // 用户已登录，调用 userStore 的点赞方法
            try {
                const result = await userStore.toggleLike(soupStore.soupData.id);
                
                // 显示操作反馈
                if (result && result.success) {
                    wx.showToast({
                        title: result.message,
                        icon: 'none',
                        duration: 1500
                    });

                    // 触发震动反馈
                    if (wx.vibrateShort) {
                        wx.vibrateShort();
                    }
                }
            } catch (error) {
                console.error('双击点赞失败:', error);
            }
        }
    },

    /**
     * 处理长按收藏事件
     * 检查登录状态，未登录时显示登录弹窗
     */
    async handleLongPressFavorite() {
        if (soupStore.soupData?.id) {
            // 检查用户是否已登录 - 使用userStore的isLoggedIn属性
            if (!this.data.isLoggedIn) {
                // 显示登录提示弹窗
                const loginPopup = this.selectComponent("#loginPopup");
                if (loginPopup) {
                    loginPopup.show();
                }
                return;
            }

            // 用户已登录，调用 userStore 的收藏方法
            try {
                const result = await userStore.toggleFavorite(soupStore.soupData.id);
                
                // 显示操作反馈
                if (result && result.success) {
                    wx.showToast({
                        title: result.message,
                        icon: 'none',
                        duration: 1500
                    });

                    // 触发震动反馈
                    if (wx.vibrateShort) {
                        wx.vibrateShort();
                    }
                }
            } catch (error) {
                console.error('长按收藏失败:', error);
            }
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
        });    },    // ===== 指南相关事件处理 =====
    /**
     * 显示指南层
     * 通过settingStore统一管理指南状态
     */
    onShowGuide() {
        settingStore.toggleGuide(true);
    },

    /**
     * 关闭指南层
     * 通过settingStore统一管理指南状态
     */
    onCloseGuide() {
        settingStore.toggleGuide(false);
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
            onLongPressStart: this.handleLongPressFavorite.bind(this),        });
    },
    /**
     * 触摸开始事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchStart(e) {
        this.gestureManager?.handleTouchStart(e, { canInteract: !this.data.soupLoading });
    },

    /**
     * 触摸移动事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchMove(e) {
        this.gestureManager?.handleTouchMove(e, { canInteract: !this.data.soupLoading });
    },

    /**
     * 触摸结束事件处理
     * @param {Object} e 触摸事件对象
     */
    handleTouchEnd(e) {
        this.gestureManager?.handleTouchEnd(e, { canInteract: !this.data.soupLoading });
    },

    /**
     * 检查是否可以进行交互
     * @returns {boolean} 是否可以交互
     */
    canInteract() {
        return !this.data.soupLoading;
    },
});
