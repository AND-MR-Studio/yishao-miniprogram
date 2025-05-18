const { makeAutoObservable, flow } = require("mobx-miniprogram");
const soupService = require("../service/soupService");
const userService = require("../service/userService");

// 页面状态常量 - 简化后只保留VIEWING状态
// const PAGE_STATE = {
//   VIEWING: "viewing", // 看汤状态
// };

// 创建汤面Store类 - 简化后只关注汤面数据和交互状态
class SoupStore {
  // ===== 可观察状态 =====
  // 当前页面状态
  // soupState = PAGE_STATE.VIEWING;

  // 核心数据
  soupData = null; // 当前汤面数据
  // userId从rootStore获取，不再在此存储

  // 汤面交互状态
  isLiked = false; // 是否已点赞
  isFavorite = false; // 是否已收藏
  likeCount = 0; // 点赞数量
  favoriteCount = 0; // 收藏数量
  viewCount = 0; // 阅读数量

  // 加载状态
  soupLoading = false; // 是否正在加载汤面数据
  buttonLoading = false; // 开始喝汤按钮的加载状态

  // 新用户引导相关状态
  isFirstVisit = false; // 是否首次访问
  showGuide = false; // 是否显示引导层

  // 防止重复请求的标志
  _fetchingId = null; // 当前正在获取数据的soupId

  // 引用rootStore
  rootStore = null;

  constructor(rootStore) {
    // 保存rootStore引用
    this.rootStore = rootStore;

    // 使用makeAutoObservable实现全自动响应式
    makeAutoObservable(this, {
      // 标记异步方法为flow
      fetchSoupDataAndStore: flow,
      initSoupAndStore: flow,
      toggleLike: flow,
      toggleFavorite: flow,
      getRandomSoup: false, // 普通异步方法，不需要flow
      checkFirstVisit: false, // 普通方法，不需要flow
      closeGuide: false, // 普通方法，不需要flow
      setButtonLoading: false, // 普通方法，不需要flow
      resetButtonLoading: false, // 普通方法，不需要flow

      // 标记为非观察属性
      _fetchingId: false,
      rootStore: false,
    });

    // 初始化时检查用户是否首次访问
    this.checkFirstVisit();
  }

  // 获取用户ID的计算属性
  get userId() {
    return this.rootStore.userId;
  }

  // ===== 计算属性 =====

  // ===== Action方法 =====

  /**
   * 初始化汤面数据
   * @param {Object} soupData 汤面数据对象
   */
  async initSoupWithData(soupData) {
    // 参数校验
    if (!soupData || !soupData.id) {
      console.error("初始化汤面数据失败: 无效的汤面数据");
      return;
    }

    // 设置基本数据 - userId只从rootStore获取，不再接受外部传入
    // 删除状态设置
    // this.soupState = PAGE_STATE.VIEWING;
    this.soupData = soupData;

    // 设置加载状态
    this.soupLoading = true;

    try {
      // 直接调用service的viewSoup方法增加阅读数
      const viewResult = await soupService.viewSoup(soupData.id);
      if (viewResult) {
        this.viewCount = viewResult.views || 0;
      } else {
        this.viewCount = soupData.views || 0;
      }

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
    } catch (error) {
      console.error("获取交互状态失败:", error);
    } finally {
      this.soupLoading = false;
    }
  }

  /**
   * 获取汤面数据 - 异步流程
   * 优化版本，防止重复请求
   * @param {string} soupId 汤面ID
   */
  *fetchSoupDataAndStore(soupId) {
    if (!soupId) return;
    console.info("[fetchSoupDataAndStore]获取汤面数据", soupId);
    // 防止重复请求同一个soupId
    if (this._fetchingId === soupId) {
      return;
    }

    // 设置当前正在获取的ID
    this._fetchingId = soupId;

    try {
      // 设置加载状态
      this.soupLoading = true;

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

      // 检查当前soupData.id是否仍然是请求的soupId
      if (this.soupData && this.soupData.id !== soupId) {
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
        if (randomSoup.id && (!this.soupData || randomSoup.id !== this.soupData.id)) {
          // 更新soupData
          this.soupData = randomSoup;

          // 重新获取汤面数据
          yield randomSoup;
        }
      }
    } catch (error) {
      console.error("获取汤面数据失败:", error);
    } finally {
      // 重置加载状态和请求标志
      this.soupLoading = false;
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
      this.soupLoading = true;

      // 并行获取汤面数据和用户交互状态
      const [isLiked, isFavorite] = yield Promise.all([
        // 如果有userId，获取点赞状态，否则返回false
        this.userId ? userService.isLikedSoup(soupId) : Promise.resolve(false),
        // 如果有userId，获取收藏状态，否则返回false
        this.userId
          ? userService.isFavoriteSoup(soupId)
          : Promise.resolve(false),
      ]);

      // 检查当前soupData.id是否仍然是请求的soupId
      if (this.soupData && this.soupData.id !== soupId) {
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

        if (randomSoup.id && (!this.soupData || randomSoup.id !== this.soupData.id)) {
          // 更新soupData
          this.soupData = randomSoup;

          // 重新获取汤面数据
          yield randomSoup;
        }
      }
    } catch (error) {
      console.error("获取汤面数据失败:", error);
    } finally {
      // 重置加载状态和请求标志
      this.soupLoading = false;
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
      // 检查用户是否已登录 - 使用rootStore的isLoggedIn属性
      if (!this.rootStore.isLoggedIn) {
        // 返回特定的错误码，表示需要登录
        return { success: false, message: "请先登录", needLogin: true };
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
   * 获取随机汤面数据
   * 直接调用soupService的getRandomSoup方法
   * @returns {Promise<Object>} 随机汤面数据
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
   * 通过ID获取汤面数据
   * 统一的汤面数据获取入口
   * @param {string|string[]} soupId 汤面ID或ID数组
   * @returns {Promise<Object|Array>} 汤面数据或数组
   */
  async fetchSoupById(soupId) {
    if (!soupId) {
      console.error("获取汤面数据失败: 缺少汤面ID");
      return null;
    }

    try {
      // 设置加载状态
      this.soupLoading = true;

      // 获取汤面数据
      const soupData = await soupService.getSoup(soupId);

      // 如果是单个ID请求，并且获取到了数据，更新当前显示的汤面
      if (!Array.isArray(soupId) && soupData && !Array.isArray(soupData)) {
        // 初始化汤面数据 - 不再传递userId参数
        await this.initSoupWithData(soupData);
      }

      return soupData;
    } catch (error) {
      console.error("获取汤面数据失败:", error);
      return null;
    } finally {
      this.soupLoading = false;
    }
  }



  /**
   * 检查用户是否首次访问
   * 使用wx.getStorageSync检查本地存储中是否有首次访问标记
   */
  checkFirstVisit() {
    try {
      // 从本地存储中获取首次访问标记
      const hasVisited = wx.getStorageSync('hasVisitedSoupPage');

      // 如果没有访问记录，则设置为首次访问
      if (!hasVisited) {
        this.isFirstVisit = true;
        this.showGuide = true;
        console.log('首次访问，显示引导层');
      } else {
        console.log('非首次访问，不显示引导层');
      }
    } catch (error) {
      console.error('检查首次访问状态失败:', error);
      // 出错时默认不显示引导
      this.isFirstVisit = false;
      this.showGuide = false;
    }
  }

  /**
   * 关闭引导层
   * 设置本地存储，标记用户已访问过
   */
  closeGuide() {
    // 设置本地存储，标记用户已访问过
    try {
      wx.setStorageSync('hasVisitedSoupPage', true);
      console.log('已保存访问记录');
    } catch (error) {
      console.error('保存访问记录失败:', error);
    }

    // 隐藏引导层
    this.showGuide = false;
  }

  /**
   * 设置按钮加载状态
   * 将按钮状态设置为加载中
   */
  setButtonLoading() {
    this.buttonLoading = true;

    // 设置一个超时，如果5秒后仍在加载，则自动重置
    if (this._buttonLoadingTimeout) {
      clearTimeout(this._buttonLoadingTimeout);
    }

    this._buttonLoadingTimeout = setTimeout(() => {
      this.resetButtonLoading();
    }, 5000);
  }

  /**
   * 重置按钮加载状态
   * 将按钮状态设置为非加载中
   */
  resetButtonLoading() {
    this.buttonLoading = false;

    // 清理超时计时器
    if (this._buttonLoadingTimeout) {
      clearTimeout(this._buttonLoadingTimeout);
      this._buttonLoadingTimeout = null;
    }
  }
}

// 导出类和创建实例的工厂函数
// 注意：不再直接创建单例实例，而是由rootStore创建
module.exports = {
  SoupStoreClass: SoupStore,
};
