/**
 * 交互底部组件
 * 包含点赞、收藏和感谢作者功能
 * 使用MobX管理状态，组件负责渲染状态和处理用户交互
 */
const { rootStore } = require('../../stores/index');
const { createStoreBindings } = require('mobx-miniprogram-bindings');

Component({
  properties: {
    // 不再需要单独的soupId属性，直接从MobX的soupData中获取
  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  data: {
    // 组件内部数据 - 通过MobX绑定自动更新
    isLiked: false,
    isFavorite: false,
    likeCount: 0,
    favoriteCount: 0
  },

  lifetimes: {
    // 组件初始化
    attached() {
      // 绑定 soupStore - 汤面数据和统计
      this.soupStoreBindings = createStoreBindings(this, {
        store: rootStore.soupStore,
        fields: ['soupData', 'likeCount', 'favoriteCount']
      });
      // 绑定 userStore - 使用 computed 属性获取交互状态
      this.userStoreBindings = createStoreBindings(this, {
        store: rootStore.userStore,
        fields: ['isFavorite', 'isLiked']
      });

      // 创建rootStore绑定 - 获取登录状态
      this.rootStoreBindings = createStoreBindings(this, {
        store: rootStore,
        fields: ['isLoggedIn']
      });
    },

    // 组件卸载
    detached() {
      // 清理MobX绑定
      if (this.soupStoreBindings) {
        this.soupStoreBindings.destroyStoreBindings();
      }
      if (this.userStoreBindings) {
        this.userStoreBindings.destroyStoreBindings();
      }
      if (this.rootStoreBindings) {
        this.rootStoreBindings.destroyStoreBindings();
      }
    }
  },

  methods: {
    /**
     * 处理收藏点击事件
     * 检查登录状态，未登录时显示登录弹窗
     * 触发store中的action并处理结果提示
     */
    async handleFavoriteClick() {
      // 从soupData中获取soupId
      const soupId = this.data.soupData?.id || '';

      // 检查用户是否已登录 - 使用rootStore的isLoggedIn属性
      if (!this.data.isLoggedIn) {
        // 触发父页面的登录弹窗
        this.triggerEvent('showLogin');
        return;
      }

      try {
        // 直接调用 userStore 的便捷方法
        const result = await rootStore.userStore.toggleFavorite(soupId);

        // 只显示成功操作的提示
        if (result && result.success) {
          wx.showToast({
            title: result.message,
            icon: 'none',
            duration: 1500
          });
        }
      } catch (error) {
        console.error('收藏操作失败:', error);
      }
    },

    /**
     * 处理点赞点击事件
     * 检查登录状态，未登录时显示登录弹窗
     * 触发store中的action并处理结果提示
     */
    async handleLikeClick() {
      // 从soupData中获取soupId
      const soupId = this.data.soupData?.id || '';

      // 检查用户是否已登录 - 使用rootStore的isLoggedIn属性
      if (!this.data.isLoggedIn) {
        // 触发父页面的登录弹窗
        this.triggerEvent('showLogin');
        return;
      }

      try {
        // 直接调用 userStore 的便捷方法
        const result = await rootStore.userStore.toggleLike(soupId);

        // 只显示成功操作的提示
        if (result && result.success) {
          wx.showToast({
            title: result.message,
            icon: 'none',
            duration: 1500
          });
        }
      } catch (error) {
        console.error('点赞操作失败:', error);
      }
    }
  }
});
