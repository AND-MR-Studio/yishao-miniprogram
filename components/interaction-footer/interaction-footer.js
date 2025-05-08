/**
 * 交互底部组件
 * 包含点赞、收藏和感谢作者功能
 * 使用MobX管理状态，不再需要通过属性传递交互状态
 */
const userService = require('../../utils/userService');
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
      // 创建MobX Store绑定 - 只绑定需要的字段，不绑定actions
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: ['soupId', 'isLiked', 'isFavorite', 'likeCount', 'favoriteCount', 'soupData']
      });

      // 将store保存为组件属性，以便在方法中直接调用
      this.store = store;

      console.log('组件初始化，绑定MobX状态:', {
        soupId: this.data.soupId,
        isLiked: this.data.isLiked,
        isFavorite: this.data.isFavorite,
        likeCount: this.data.likeCount,
        favoriteCount: this.data.favoriteCount,
        soupData: this.data.soupData
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
      const soupId = this.data.soupId || this.properties.soupId || '';
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
        // 调用store中的toggleFavorite方法
        // 注意：MobX的flow方法需要使用generator语法，所以这里不能使用await
        const result = await new Promise((resolve) => {
          this.store.toggleFavorite(soupId).then(res => resolve(res));
        });
        console.log('收藏操作结果:', result);

        // 显示操作结果提示
        wx.showToast({
          title: result.message,
          icon: result.success ? 'none' : 'error',
          duration: 1500
        });
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
      const soupId = this.data.soupId || this.properties.soupId || '';
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
        // 调用store中的toggleLike方法
        // 注意：MobX的flow方法需要使用generator语法，所以这里不能使用await
        const result = await new Promise((resolve) => {
          this.store.toggleLike(soupId).then(res => resolve(res));
        });
        console.log('点赞操作结果:', result);

        // 显示操作结果提示
        wx.showToast({
          title: result.message,
          icon: result.success ? 'none' : 'error',
          duration: 1500
        });
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
