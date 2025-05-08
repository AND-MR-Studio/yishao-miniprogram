const { makeAutoObservable, flow } = require('mobx-miniprogram');
const soupService = require('../utils/soupService');
const userService = require('../utils/userService');

// 页面状态常量 - 简化后只保留VIEWING状态
const PAGE_STATE = {
  VIEWING: 'viewing'  // 看汤状态
};

// 创建汤面Store - 简化后只关注汤面数据和交互状态
class SoupStore {
  // ===== 可观察状态 =====
  // 当前页面状态
  soupState = PAGE_STATE.VIEWING;

  // 核心数据
  soupId = '';      // 当前汤面ID
  userId = '';      // 当前用户ID

  // 汤面交互状态
  soupData = null;    // 当前汤面数据
  isLiked = false;    // 是否已点赞
  isFavorite = false; // 是否已收藏
  likeCount = 0;      // 点赞数量
  favoriteCount = 0;  // 收藏数量
  viewCount = 0;      // 阅读数量

  // 加载状态
  isLoading = false;  // 是否正在加载汤面数据

  constructor() {
    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      fetchSoupData: flow,
      toggleLike: flow,
      toggleFavorite: flow,

      // 标记updateInteractionStatus为action
      updateInteractionStatus: true
    });
  }

  // ===== 计算属性 =====
  // 判断当前是否为查看状态 - 保留此属性以兼容现有代码
  get isViewing() {
    return this.soupState === PAGE_STATE.VIEWING;
  }

  // ===== Action方法 =====

  // 初始化汤面数据
  initSoup(soupId, userId = '') {
    this.soupId = soupId;
    this.userId = userId || '';
    this.soupState = PAGE_STATE.VIEWING;

    // 获取汤面数据
    if (soupId) {
      this.fetchSoupData(soupId);
    }

    console.log('初始化汤面数据:', { soupId, userId });
  }

  // 更新状态 - 简化版本
  updateState(data) {
    // 记录旧的soupId
    const oldSoupId = this.soupId;

    // 更新状态
    if (data.soupState !== undefined) {
      this.soupState = data.soupState;
    }

    // 更新数据
    if (data.soupId !== undefined) {
      this.soupId = data.soupId;
    }
    if (data.userId !== undefined) {
      this.userId = data.userId;
    }

    // 如果soupId发生变化，获取新的汤面数据
    if (data.soupId !== undefined && data.soupId !== oldSoupId) {
      this.fetchSoupData(data.soupId);
    }
  }

  // 切换到新的汤面
  changeSoup(newSoupId) {
    if (newSoupId === this.soupId) return;

    // 更新soupId并获取新汤面的数据
    this.soupId = newSoupId;
    this.fetchSoupData(newSoupId);
  }

  // 获取汤面数据 - 异步流程
  *fetchSoupData(soupId) {
    if (!soupId) return;

    try {
      // 设置加载状态
      this.isLoading = true;
      console.log('开始获取汤面数据:', soupId);

      // 直接使用getSoup方法获取汤面数据
      const soupData = yield soupService.getSoup(soupId, true);

      if (soupData) {
        console.log('成功获取汤面数据:', soupId);
        // 更新汤面数据
        this.updateSoupData(soupData);
      } else {
        console.error('获取汤面数据失败: 未找到指定ID的汤面');

        // 如果失败，尝试获取随机汤面
        console.log('尝试获取随机汤面');
        const randomSoupId = yield soupService.getRandomSoup();

        if (randomSoupId) {
          console.log('获取随机汤面成功，ID:', randomSoupId);
          // 更新soupId
          this.soupId = randomSoupId;

          // 重新获取汤面数据
          yield this.fetchSoupData(randomSoupId);
        }
      }
    } catch (error) {
      console.error('获取汤面数据失败:', error);
    } finally {
      // 重置加载状态
      this.isLoading = false;
    }
  }

  /**
   * 更新汤面数据
   * 更新完整的汤面数据对象，包括内容和交互状态
   * @param {Object} soupData 汤面数据对象
   */
  updateSoupData(soupData) {
    if (!soupData) return;

    // 更新汤面数据对象
    this.soupData = soupData;

    // 同时更新交互状态
    this.updateInteractionStatus({
      isLiked: soupData.isLiked,
      isFavorite: soupData.isFavorite,
      likeCount: soupData.likeCount,
      favoriteCount: soupData.favoriteCount,
      viewCount: soupData.viewCount
    });
  }

  /**
   * 更新交互状态
   * 统一处理所有交互相关的状态更新
   * @param {Object} status 交互状态对象
   */
  updateInteractionStatus(status = {}) {
    console.log('更新交互状态，传入参数:', status);
    console.log('更新前状态:', {
      isLiked: this.isLiked,
      isFavorite: this.isFavorite,
      likeCount: this.likeCount,
      favoriteCount: this.favoriteCount,
      viewCount: this.viewCount
    });

    // 更新点赞状态
    if (status.isLiked !== undefined) {
      this.isLiked = status.isLiked;
    }

    // 更新收藏状态
    if (status.isFavorite !== undefined) {
      this.isFavorite = status.isFavorite;
    }

    // 更新计数
    if (status.likeCount !== undefined && status.likeCount >= 0) {
      this.likeCount = status.likeCount;
    }

    if (status.favoriteCount !== undefined && status.favoriteCount >= 0) {
      this.favoriteCount = status.favoriteCount;
    }

    if (status.viewCount !== undefined && status.viewCount >= 0) {
      this.viewCount = status.viewCount;
    }

    console.log('更新后状态:', {
      isLiked: this.isLiked,
      isFavorite: this.isFavorite,
      likeCount: this.likeCount,
      favoriteCount: this.favoriteCount,
      viewCount: this.viewCount
    });
  }

  /**
   * 更新阅读数
   * @param {number} viewCount 阅读数
   */
  updateViewCount(viewCount) {
    this.updateInteractionStatus({ viewCount });
  }

  /**
   * 更新点赞状态
   * @param {boolean} isLiked 是否已点赞
   * @param {number} likeCount 点赞数量
   */
  updateLikeStatus(isLiked, likeCount) {
    this.updateInteractionStatus({ isLiked, likeCount });
  }

  /**
   * 更新收藏状态
   * @param {boolean} isFavorite 是否已收藏
   * @param {number} favoriteCount 收藏数量
   */
  updateFavoriteStatus(isFavorite, favoriteCount) {
    this.updateInteractionStatus({ isFavorite, favoriteCount });
  }

  /**
   * 切换点赞状态
   * @param {string} soupId 海龟汤ID
   * @returns {Promise<Object>} 操作结果，包含成功状态和消息
   */
  *toggleLike(soupId) {
    if (!soupId) {
      return { success: false, message: '缺少汤面ID' };
    }

    try {
      // 获取当前状态的反向值
      const newLikeStatus = !this.isLiked;
      console.log('切换点赞状态:', { currentStatus: this.isLiked, newStatus: newLikeStatus });

      // 先更新用户记录
      const userResult = yield userService.updateLikedSoup(soupId, newLikeStatus);
      console.log('用户点赞状态更新结果:', userResult);

      if (userResult && userResult.success) {
        // 再调用汤面API
        const likeResult = yield soupService.likeSoup(soupId, newLikeStatus);
        console.log('汤面点赞API结果:', likeResult);

        if (likeResult) {
          // 确保likeCount字段存在
          const newLikeCount = likeResult.likeCount !== undefined
            ? likeResult.likeCount
            : (likeResult.count !== undefined ? likeResult.count : 0);

          // 更新状态
          this.updateInteractionStatus({
            isLiked: newLikeStatus,
            likeCount: newLikeCount
          });

          return {
            success: true,
            message: newLikeStatus ? '点赞成功' : '已取消点赞',
            isLiked: newLikeStatus,
            likeCount: newLikeCount
          };
        }
      }

      return {
        success: false,
        message: '操作失败，请重试'
      };
    } catch (error) {
      console.error('点赞操作失败:', error);
      return {
        success: false,
        message: '操作失败: ' + (error.message || '未知错误')
      };
    }
  }

  /**
   * 切换收藏状态
   * @param {string} soupId 海龟汤ID
   * @returns {Promise<Object>} 操作结果，包含成功状态和消息
   */
  *toggleFavorite(soupId) {
    if (!soupId) {
      return { success: false, message: '缺少汤面ID' };
    }

    try {
      // 获取当前状态的反向值
      const newFavoriteStatus = !this.isFavorite;
      console.log('切换收藏状态:', { currentStatus: this.isFavorite, newStatus: newFavoriteStatus });

      // 先更新用户记录
      const userResult = yield userService.updateFavoriteSoup(soupId, newFavoriteStatus);
      console.log('用户收藏状态更新结果:', userResult);

      if (userResult && userResult.success) {
        // 再调用汤面API
        const favoriteResult = yield soupService.favoriteSoup(soupId, newFavoriteStatus);
        console.log('汤面收藏API结果:', favoriteResult);

        if (favoriteResult) {
          // 确保favoriteCount字段存在
          const newFavoriteCount = favoriteResult.favoriteCount !== undefined
            ? favoriteResult.favoriteCount
            : (favoriteResult.count !== undefined ? favoriteResult.count : 0);

          // 更新状态
          this.updateInteractionStatus({
            isFavorite: newFavoriteStatus,
            favoriteCount: newFavoriteCount
          });

          return {
            success: true,
            message: newFavoriteStatus ? '收藏成功' : '已取消收藏',
            isFavorite: newFavoriteStatus,
            favoriteCount: newFavoriteCount
          };
        }
      }

      return {
        success: false,
        message: '操作失败，请重试'
      };
    } catch (error) {
      console.error('收藏操作失败:', error);
      return {
        success: false,
        message: '操作失败: ' + (error.message || '未知错误')
      };
    }
  }
}

// 创建单例实例
const store = new SoupStore();

module.exports = {
  store,
  PAGE_STATE
};
