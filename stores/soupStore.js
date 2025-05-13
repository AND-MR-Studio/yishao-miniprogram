const { makeAutoObservable, flow } = require("mobx-miniprogram");
const soupService = require("../service/soupService");
const userService = require("../service/userService");

// 页面状态常量 - 简化后只保留VIEWING状态
// const PAGE_STATE = {
//   VIEWING: "viewing", // 看汤状态
// };

// 创建汤面Store - 简化后只关注汤面数据和交互状态
class SoupStore {
  // ===== 可观察状态 =====
  // 当前页面状态
  // soupState = PAGE_STATE.VIEWING;

  // 核心数据
  soupId = ""; // 当前汤面ID
  userId = ""; // 当前用户ID

  // 汤面交互状态
  soupData = null; // 当前汤面数据
  isLiked = false; // 是否已点赞
  isFavorite = false; // 是否已收藏
  likeCount = 0; // 点赞数量
  favoriteCount = 0; // 收藏数量
  viewCount = 0; // 阅读数量

  // 加载状态
  isLoading = false; // 是否正在加载汤面数据

  // 防止重复请求的标志
  _fetchingId = null; // 当前正在获取数据的soupId

  constructor() {
    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      fetchSoupData: flow,
      toggleLike: flow,
      toggleFavorite: flow,
      syncUserId: flow,
      getRandomSoup: false, // 普通异步方法，不需要flow
      getAdjacentSoup: false, // 普通异步方法，不需要flow
      viewSoup: false, // 普通异步方法，不需要flow

      // 标记为非观察属性
      _fetchingId: false,
    });
  }

  // ===== 计算属性 =====

  // ===== Action方法 =====

  /**
   * 初始化汤面数据
   * @param {Object} soupData 汤面数据对象
   * @param {string} userId 用户ID
   */
  async initSoupWithData(soupData, userId = "") {
    // 参数校验
    if (!soupData || !soupData.id) {
      console.error("初始化汤面数据失败: 无效的汤面数据");
      return;
    }
    
    // 设置基本数据
    this.soupId = soupData.id;
    this.userId = userId || "";
    // 删除状态设置
    // this.soupState = PAGE_STATE.VIEWING;
    this.soupData = soupData;
    
    // 设置加载状态
    this.isLoading = true;
    
    try {
      // 只有在用户已登录的情况下获取交互状态
      if (this.userId) {
        // 并行获取用户交互状态
        const [isLiked, isFavorite] = await Promise.all([
          userService.isLikedSoup(soupData.id),
          userService.isFavoriteSoup(soupData.id)
        ]);
        
        // 更新交互状态
        this.isLiked = isLiked;
        this.isFavorite = isFavorite;
      } else {
        // 用户未登录，默认未点赞和未收藏
        this.isLiked = false;
        this.isFavorite = false;
      }
      
      // 更新计数
      this.likeCount = soupData.likes || 0;
      this.favoriteCount = soupData.favorites || 0;
      this.viewCount = soupData.views || 0;
    } catch (error) {
      console.error("获取交互状态失败:", error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 获取汤面数据 - 异步流程
   * 优化版本，防止重复请求
   * @param {string} soupId 汤面ID
   */
  *fetchSoupDataAndStore(soupId) {
    if (!soupId) return;
    console.info("[fetchSoupDataAndStore]获取汤面数据", JSON.stringify(soupData));
    // 防止重复请求同一个soupId
    if (this._fetchingId === soupId) {
      return;
    }

    // 设置当前正在获取的ID
    this._fetchingId = soupId;

    try {
      // 设置加载状态
      this.isLoading = true;

      // 并行获取汤面数据和用户交互状态
      const [soupData, isLiked, isFavorite] = yield Promise.all([
        // 获取汤面数据
        soupService.getSoup(soupId),
        // 如果有userId，获取点赞状态，否则返回false
        this.userId ? userService.isLikedSoup(soupId) : Promise.resolve(false),
        // 如果有userId，获取收藏状态，否则返回false
        this.userId
          ? userService.isFavoriteSoup(soupId)
          : Promise.resolve(false),
      ]);

      // 检查当前soupId是否仍然是请求的soupId
      if (this.soupId !== soupId) {
        return;
      }

      if (soupData) {
        // 更新汤面数据和交互状态
        this.soupData = soupData;

        // 更新交互状态
        this.isLiked = isLiked;
        this.isFavorite = isFavorite;
        this.likeCount = soupData.likes || 0;
        this.favoriteCount = soupData.favorites || 0;
        this.viewCount = soupData.views || 0;
      } else {
        // 如果失败，尝试获取随机汤面
        const randomSoup = yield soupService.getRandomSoup();
        console.info("[fetchSoupDataAndStore]获取随机汤面", JSON.stringify(randomSoup));
        if (randomSoup.id && randomSoup.id !== this.soupId) {
          // 更新soupId
          this.soupId = randomSoup.id;

          // 重新获取汤面数据
          yield randomSoup;
        }
      }
    } catch (error) {
      console.error("获取汤面数据失败:", error);
    } finally {
      // 重置加载状态和请求标志
      this.isLoading = false;
      this._fetchingId = null;
    }
  }

  /**
   * 获取汤面数据 - 异步流程
   * 优化版本，防止重复请求
   * @param {Object} soupData 汤面ID
   */
  *initSoupAndStore(soupData) {
    if (!soupData) return;
    console.info("[initSoupAndStore]获取汤面数据", JSON.stringify(soupData));
    let soupId = soupData.id;
    // 防止重复请求同一个soupId
    if (this._fetchingId === soupId) {
      return;
    }

    // 设置当前正在获取的ID
    this._fetchingId = soupId;

    try {
      // 设置加载状态
      this.isLoading = true;

      // 并行获取汤面数据和用户交互状态
      const [isLiked, isFavorite] = yield Promise.all([
        // 如果有userId，获取点赞状态，否则返回false
        this.userId ? userService.isLikedSoup(soupId) : Promise.resolve(false),
        // 如果有userId，获取收藏状态，否则返回false
        this.userId
          ? userService.isFavoriteSoup(soupId)
          : Promise.resolve(false),
      ]);

      // 检查当前soupId是否仍然是请求的soupId
      if (this.soupId !== soupId) {
        return;
      }

      if (soupData) {
        // 更新汤面数据和交互状态
        this.soupData = soupData;
        // 更新交互状态
        this.isLiked = isLiked;
        this.isFavorite = isFavorite;
        this.likeCount = soupData.likes || 0;
        this.favoriteCount = soupData.favorites || 0;
        this.viewCount = soupData.views || 0;
      } else {
        // 如果失败，尝试获取随机汤面
        const randomSoup = yield soupService.getRandomSoup();
        console.info("[initSoupAndStore]获取随机汤面", JSON.stringify(randomSoup));

        if (randomSoup.id && randomSoup.id !== this.soupId) {
          // 更新soupId
          this.soupId = randomSoup.id;

          // 重新获取汤面数据
          yield randomSoup;
        }
      }
    } catch (error) {
      console.error("获取汤面数据失败:", error);
    } finally {
      // 重置加载状态和请求标志
      this.isLoading = false;
      this._fetchingId = null;
    }
  }

  /**
   * 执行通用的交互操作
   * @param {string} soupId 汤面ID
   * @param {Function} userUpdateMethod 用户数据更新方法
   * @param {Function} soupUpdateMethod 汤面数据更新方法
   * @param {boolean} newStatus 新的状态值
   * @param {Function} processResult 处理结果的回调函数
   * @returns {Promise<Object>} 操作结果，包含成功状态和消息
   * @private
   */
  *_executeInteraction(
    soupId,
    userUpdateMethod,
    soupUpdateMethod,
    newStatus,
    processResult
  ) {
    try {
      if (!soupId) {
        return { success: false, message: "缺少汤面ID" };
      }
      // 检查用户是否已登录
      if (!userService.checkLoginStatus(false)) {
        return { success: false, message: "请先登录" };
      }
      // 更新用户记录
      const userResult = yield userUpdateMethod(soupId, newStatus);

      if (userResult && userResult.success) {
        // 更新汤面记录
        const result = yield soupUpdateMethod(soupId, newStatus);

        // 验证结果
        if (!result) {
          return { success: false, message: "操作失败，请重试" };
        }

        // 处理结果并返回
        return processResult(result);
      }

      return { success: false, message: "操作失败，请重试" };
    } catch (error) {
      console.error("交互操作失败:", error);
      return {
        success: false,
        message: "操作失败: " + (error.message || "未知错误"),
      };
    }
  }

  /**
   * 切换点赞状态
   * @param {string} soupId 海龟汤ID
   * @returns {Promise<Object>} 操作结果，包含成功状态和消息
   */
  *toggleLike(soupId) {
    // 确定新状态
    const newStatus = !this.isLiked;
    // 执行交互操作
    return yield this._executeInteraction(
      soupId,
      userService.updateLikedSoup,
      soupService.likeSoup,
      newStatus,
      (result) => {
        // 失败情况
        if (!result || !result.success || result.likes == undefined) {
          return { success: false, message: "点赞状态更新失败，请重试" };
        }
        this.likeCount = result.likes;
        this.isLiked = newStatus;

        // 返回成功结果
        return {
          success: true,
          message: newStatus ? "点赞成功" : "已取消点赞",
          isLiked: this.isLiked,
          likeCount: this.likeCount,
        };
      }
    );
  }

  /**
   * 切换收藏状态
   * @param {string} soupId 海龟汤ID
   * @returns {Promise<Object>} 操作结果，包含成功状态和消息
   */
  *toggleFavorite(soupId) {
    // 确定新状态
    const newStatus = !this.isFavorite;

    // 执行交互操作
    return yield this._executeInteraction(
      soupId,
      userService.updateFavoriteSoup,
      soupService.favoriteSoup,
      newStatus,
      (result) => {
        if (!result || !result.success || result.favorites == undefined) {
          return { success: false, message: "收藏状态更新失败，请重试" };
        }
        // 更新状态
        this.favoriteCount = result.favorites;
        this.isFavorite = newStatus;
        // 返回成功结果
        return {
          success: true,
          message: newStatus ? "收藏成功" : "已取消收藏",
          isFavorite: this.isFavorite,
          favoriteCount: this.favoriteCount,
        };
      }
    );
  }

  /**
   * 同步用户ID
   * 从userService获取最新的userId并更新到store中
   * 在页面显示时调用，确保用户登录状态变化时数据同步
   * @returns {Promise<void>}
   */
  *syncUserId() {
    try {
      // 获取最新的用户ID
      const userId = yield userService.getUserId();

      // 如果userId发生变化，更新store中的userId
      if (userId !== this.userId) {
        this.userId = userId || "";

        // 如果有soupId，重新获取汤面数据（包括点赞、收藏状态）
        if (this.soupId) {
          yield this.fetchSoupDataAndStore(this.soupId);
        }
      }
    } catch (error) {
      console.error("同步用户ID失败:", error);
    }
  }

  /**
   * 获取随机汤面ID
   * 直接调用soupService的getRandomSoup方法
   * @returns {Promise<string>} 随机汤面ID
   */
  async getRandomSoup() {
    try {
      return await soupService.getRandomSoup();
    } catch (error) {
      console.error("获取随机汤面失败:", error);
      return null;
    }
  }

  /**
   * 增加汤面阅读数
   * 直接调用soupService的viewSoup方法
   * @param {string} soupId 汤面ID
   * @returns {Promise<Object>} 结果，包含更新后的阅读数
   */
  async viewSoup(soupId) {
    if (!soupId) return null;

    try {
      const result = await soupService.viewSoup(soupId);

      // 如果当前显示的就是这个汤面，更新阅读数
      if (result && this.soupId === soupId) {
        this.viewCount = result.views || 0;
      }

      return result;
    } catch (error) {
      console.error("增加阅读数失败:", error);
      return null;
    }
  }
}

// 创建单例实例
const store = new SoupStore();

module.exports = {
  store,
};
