/**
 * 交互底部组件
 * 包含点赞、收藏和感谢作者功能
 * 使用MobX管理状态，不再需要通过属性传递交互状态
 */
const userService = require('../../utils/userService');
const soupService = require('../../utils/soupService');
const { store } = require('../../stores/soupStore');
const { createStoreBindings } = require('mobx-miniprogram-bindings');

Component({
  properties: {
    // 是否处于喝汤状态
    isDrinking: {
      type: Boolean,
      value: false
    },
    // 汤面ID - 仅用于API调用，状态从MobX获取
    soupId: {
      type: String,
      value: ''
    }
  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  data: {
    // 组件内部数据
  },

  lifetimes: {
    // 组件初始化
    attached() {
      // 创建MobX Store绑定
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: ['soupId', 'isLiked', 'isFavorite', 'likeCount', 'favoriteCount'],
        actions: ['updateInteractionStatus']
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
     * 使用MobX store中的状态
     */
    async handleFavoriteClick() {
      // 从MobX store获取soupId
      const soupId = this.soupId || this.properties.soupId || '';
      if (!soupId.trim()) {
        console.error('收藏失败：缺少汤面ID');
        return;
      }

      // 检查用户是否已登录
      if (!userService.checkLoginStatus()) {
        // 显示登录提示
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 1500
        });
        return;
      }

      try {
        // 获取当前收藏状态的反向值 - 从MobX store获取
        const newFavoriteStatus = !this.isFavorite;

        // 调用用户服务更新收藏状态
        const result = await userService.updateFavoriteSoup(soupId, newFavoriteStatus);

        if (result && result.success) {
          // 调用收藏/取消收藏API
          const favoriteResult = await soupService.favoriteSoup(soupId, newFavoriteStatus);
          const newFavoriteCount = favoriteResult ? favoriteResult.favoriteCount : 0;

          // 直接更新MobX store状态 - 组件会自动响应变化
          store.updateFavoriteStatus(newFavoriteStatus, newFavoriteCount);

          // 显示操作成功提示
          wx.showToast({
            title: newFavoriteStatus ? '收藏成功' : '已取消收藏',
            icon: 'none',
            duration: 1500
          });
        }
      } catch (error) {
        console.error('收藏操作失败:', error);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none',
          duration: 2000
        });
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
     * 使用MobX store中的状态
     */
    async handleLikeClick() {
      // 从MobX store获取soupId
      const soupId = this.soupId || this.properties.soupId || '';
      if (!soupId.trim()) {
        console.error('点赞失败：缺少汤面ID');
        return;
      }

      // 检查用户是否已登录
      if (!userService.checkLoginStatus()) {
        // 显示登录提示
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 1500
        });
        return;
      }

      try {
        // 获取当前点赞状态的反向值 - 从MobX store获取
        const newLikeStatus = !this.isLiked;

        // 调用用户服务更新点赞状态
        const result = await userService.updateLikedSoup(soupId, newLikeStatus);

        if (result && result.success) {
          // 调用点赞/取消点赞API
          const likeResult = await soupService.likeSoup(soupId, newLikeStatus);
          const newLikeCount = likeResult ? likeResult.likeCount : 0;

          // 直接更新MobX store状态 - 组件会自动响应变化
          store.updateLikeStatus(newLikeStatus, newLikeCount);

          // 显示操作成功提示
          wx.showToast({
            title: newLikeStatus ? '点赞成功' : '已取消点赞',
            icon: 'none',
            duration: 1500
          });
        }
      } catch (error) {
        console.error('点赞操作失败:', error);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none',
          duration: 2000
        });
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
