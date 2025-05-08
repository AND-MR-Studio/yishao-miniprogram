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

  // 防止重复请求的标志
  _fetchingId = null; // 当前正在获取数据的soupId

  constructor() {
    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      fetchSoupData: flow,
      toggleLike: flow,
      toggleFavorite: flow,

      // 标记为非观察属性
      _fetchingId: false
    });
  }

  // ===== 计算属性 =====
  // 判断当前是否为查看状态 - 保留此属性以兼容现有代码
  get isViewing() {
    return this.soupState === PAGE_STATE.VIEWING;
  }

  // ===== Action方法 =====

  /**
   * 初始化汤面数据
   * 简化版本，只设置ID和用户ID，然后获取数据
   * @param {string} soupId 汤面ID
   * @param {string} userId 用户ID
   */
  initSoup(soupId, userId = '') {
    if (!soupId) return;

    console.log('初始化汤面数据:', { soupId, userId });

    // 设置基本数据
    this.soupId = soupId;
    this.userId = userId || '';
    this.soupState = PAGE_STATE.VIEWING;

    // 获取汤面数据
    this.fetchSoupData(soupId);
  }

  /**
   * 更新状态
   * 简化版本，只更新必要的状态
   * @param {Object} data 要更新的数据
   */
  updateState(data = {}) {
    // 更新状态
    if (data.soupState !== undefined) {
      this.soupState = data.soupState;
    }

    // 更新用户ID
    if (data.userId !== undefined) {
      this.userId = data.userId;
    }

    // 更新汤面ID并获取数据
    if (data.soupId !== undefined && data.soupId !== this.soupId) {
      this.soupId = data.soupId;
      this.fetchSoupData(data.soupId);
    }
  }

  /**
   * 获取汤面数据 - 异步流程
   * 优化版本，防止重复请求
   * @param {string} soupId 汤面ID
   */
  *fetchSoupData(soupId) {
    if (!soupId) return;

    // 防止重复请求同一个soupId
    if (this._fetchingId === soupId) {
      console.log('已有相同ID的请求正在进行中，跳过:', soupId);
      return;
    }

    // 设置当前正在获取的ID
    this._fetchingId = soupId;

    try {
      // 设置加载状态
      this.isLoading = true;
      console.log('开始获取汤面数据:', soupId);

      // 并行获取汤面数据和用户交互状态
      const [soupData, isLiked, isFavorite] = yield Promise.all([
        // 获取汤面数据
        soupService.getSoup(soupId, true),
        // 如果有userId，获取点赞状态，否则返回false
        this.userId ? userService.isLikedSoup(soupId) : Promise.resolve(false),
        // 如果有userId，获取收藏状态，否则返回false
        this.userId ? userService.isFavoriteSoup(soupId) : Promise.resolve(false)
      ]);

      // 检查当前soupId是否仍然是请求的soupId
      if (this.soupId !== soupId) {
        console.log('soupId已变更，丢弃过时的响应:', soupId);
        return;
      }

      if (soupData) {
        console.log('成功获取汤面数据:', soupId);

        // 更新汤面数据和交互状态
        this.soupData = soupData;

        // 更新交互状态
        this.isLiked = isLiked;
        this.isFavorite = isFavorite;
        this.likeCount = soupData.likeCount || 0;
        this.favoriteCount = soupData.favoriteCount || 0;
        this.viewCount = soupData.viewCount || 0;

        console.log('汤面数据包含交互状态:', {
          soupId,
          isLiked,
          isFavorite,
          likeCount: this.likeCount,
          favoriteCount: this.favoriteCount,
          viewCount: this.viewCount
        });
      } else {
        console.error('获取汤面数据失败: 未找到指定ID的汤面');

        // 如果失败，尝试获取随机汤面
        console.log('尝试获取随机汤面');
        const randomSoupId = yield soupService.getRandomSoup();

        if (randomSoupId && randomSoupId !== this.soupId) {
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
      // 重置加载状态和请求标志
      this.isLoading = false;
      this._fetchingId = null;
    }
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

          // 直接更新状态
          this.isLiked = newLikeStatus;
          this.likeCount = newLikeCount;

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

          // 直接更新状态
          this.isFavorite = newFavoriteStatus;
          this.favoriteCount = newFavoriteCount;

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
