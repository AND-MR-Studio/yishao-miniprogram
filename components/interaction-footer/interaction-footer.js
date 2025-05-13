/**
 * 交互底部组件
 * 包含点赞、收藏和感谢作者功能
 * 使用MobX管理状态，组件负责渲染状态和处理用户交互
 */
const { store } = require('../../stores/soupStore');
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
      // 创建MobX Store绑定 - 只绑定需要的字段，不绑定actions
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: ['soupId', 'isLiked', 'isFavorite', 'likeCount', 'favoriteCount', 'soupData']
      });
    },

    // 组件卸载
    detached() {
      // 清理MobX绑定
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
    }
  },

  methods: {
    /**
     * 处理收藏点击事件
     * 触发store中的action并处理结果提示
     */
    async handleFavoriteClick() {
      // 从soupData中获取soupId
      const soupId = this.data.soupData?.id || '';

      try {
        // 调用store的action并处理结果
        const result = await store.toggleFavorite(soupId);

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
     * 外部调用的收藏方法
     * 用于双击收藏等场景
     */
    toggleFavorite() {
      this.handleFavoriteClick();
    },

    /**
     * 处理点赞点击事件
     * 触发store中的action并处理结果提示
     */
    async handleLikeClick() {
      // 从soupData中获取soupId
      const soupId = this.data.soupData?.id || '';

      try {
        // 调用store的action并处理结果
        const result = await store.toggleLike(soupId);

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
    },

    /**
     * 外部调用的点赞方法
     * 用于其他场景触发点赞
     */
    toggleLike() {
      this.handleLikeClick();
    }
  }
});
