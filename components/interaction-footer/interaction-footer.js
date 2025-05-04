/**
 * 交互底部组件
 * 包含点赞、收藏和感谢作者功能
 */
const userService = require('../../utils/userService');
const soupService = require('../../utils/soupService');
const eventUtils = require('../../utils/eventUtils');

Component({
  properties: {
    // 是否已收藏
    isFavorite: {
      type: Boolean,
      value: false
    },
    // 收藏数量
    favoriteCount: {
      type: Number,
      value: 0
    },
    // 是否已点赞
    isLiked: {
      type: Boolean,
      value: false
    },
    // 点赞数量
    likeCount: {
      type: Number,
      value: 0
    },
    // 创作者ID
    creatorId: {
      type: String,
      value: ''
    },
    // 是否处于喝汤状态
    isDrinking: {
      type: Boolean,
      value: false
    },
    // 汤面ID
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

  methods: {
    /**
     * 处理收藏点击事件
     */
    async handleFavoriteClick() {
      const soupId = this.properties.soupId || '';
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
        // 获取当前收藏状态的反向值
        const newFavoriteStatus = !this.properties.isFavorite;

        // 调用用户服务更新收藏状态
        const result = await userService.updateFavoriteSoup(soupId, newFavoriteStatus);

        if (result && result.success) {
          // 如果是收藏，增加收藏数
          if (newFavoriteStatus) {
            // 调用收藏API，获取更新后的收藏数
            const favoriteResult = await soupService.favoriteSoup(soupId);
            const newFavoriteCount = favoriteResult ? favoriteResult.favoriteCount : 0;

            // 更新组件状态
            this.setData({
              isFavorite: newFavoriteStatus,
              favoriteCount: newFavoriteCount
            });

            // 显示收藏成功提示
            wx.showToast({
              title: '收藏成功',
              icon: 'none',
              duration: 1500
            });
          } else {
            // 如果是取消收藏，调用取消收藏API减少收藏数
            const unfavoriteResult = await soupService.unfavoriteSoup(soupId);
            const newFavoriteCount = unfavoriteResult ? unfavoriteResult.favoriteCount : 0;

            // 更新组件状态
            this.setData({
              isFavorite: newFavoriteStatus,
              favoriteCount: newFavoriteCount
            });

            // 显示取消收藏提示
            wx.showToast({
              title: '已取消收藏',
              icon: 'none',
              duration: 1500
            });
          }

          // 使用eventCenter发送统一的用户交互状态变更事件
          eventUtils.emitEvent('userInteractionChange', {
            soupId: soupId,
            isFavorite: newFavoriteStatus,
            favoriteCount: this.data.favoriteCount
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
     */
    async handleLikeClick() {
      const soupId = this.properties.soupId || '';
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
        // 获取当前点赞状态的反向值
        const newLikeStatus = !this.properties.isLiked;

        // 调用用户服务更新点赞状态
        const result = await userService.updateLikedSoup(soupId, newLikeStatus);

        if (result && result.success) {
          // 如果是点赞，增加点赞数
          if (newLikeStatus) {
            // 调用点赞API，获取更新后的点赞数
            const likeResult = await soupService.likeSoup(soupId, true);
            const newLikeCount = likeResult ? likeResult.likeCount : 0;

            // 更新组件状态
            this.setData({
              isLiked: newLikeStatus,
              likeCount: newLikeCount
            });

            // 显示点赞成功提示
            wx.showToast({
              title: '点赞成功',
              icon: 'none',
              duration: 1500
            });
          } else {
            // 如果是取消点赞，调用取消点赞API减少点赞数
            const unlikeResult = await soupService.likeSoup(soupId, false);
            const newLikeCount = unlikeResult ? unlikeResult.likeCount : 0;

            // 更新组件状态
            this.setData({
              isLiked: newLikeStatus,
              likeCount: newLikeCount
            });

            // 显示取消点赞提示
            wx.showToast({
              title: '已取消点赞',
              icon: 'none',
              duration: 1500
            });
          }

          // 使用eventUtils发送统一的用户交互状态变更事件
          eventUtils.emitEvent('userInteractionChange', {
            soupId: soupId,
            isLiked: newLikeStatus,
            likeCount: this.data.likeCount
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
