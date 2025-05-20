/**
 * 海龟汤服务 - 前端调用封装
 * 提供符合RESTful规范的海龟汤数据操作
 * 遵循简洁设计原则，只提供必要的API接口
 *
 * 支持两种模式：
 * 1. 默认模式：只返回soupId（适合列表展示）
 * 2. 详情模式：返回完整汤面数据（适合快速滑动查看详情）
 *
 * 主要功能：
 * - 获取海龟汤（ID或完整数据）
 * - 批量获取海龟汤详情
 * - 创建海龟汤
 * - 批量删除海龟汤
 * - 获取相邻海龟汤（上一个或下一个）
 * - 获取随机海龟汤
 * - 管理收藏和点赞状态
 * - 增加汤面阅读数
 */
const { soupRequest, api } = require("../config/api");
const { get, post } = require("../utils/request");

const soupService = {
  /**
   * 获取海龟汤
   * @param {string} [soupId] 海龟汤ID或ID数组，如果不提供或为空数组则获取所有海龟汤
   * @returns {Promise<Object>} 海龟汤ID或完整数据
   */
  async getSoup(soupId) {
    try {
      // todo: 这里有个问题，soupId会传入soupdata
      // 原因是index onLoad处，随机获取的时候返回的是soupdata，而不是soupId
      // 得全盘梳理下soupid和soupdata的传递关系
      if (soupId && typeof soupId === "object") {
        return soupId;
      }

      // 获取单个海龟汤
      const response = await get("get_soup_by_id", {
        url: api.soup.get(soupId),
      });
      return response ? response : null;
    } catch (error) {
      console.error("获取海龟汤失败:", error);
      return null;
    }
  },

  /**
   * 创建新海龟汤
   * @param {Object} soupData 海龟汤数据
   * @param {string} soupData.title 标题
   * @param {string} soupData.content 汤面内容
   * @param {string} soupData.truth 汤底
   * @param {string[]} [soupData.tags] 海龟汤标签数组（可包含多个标签）
   * @returns {Promise<Object>} 创建的海龟汤数据
   */
  async createSoup(soupData) {
    if (!soupData) {
      return null;
    }

    try {
      // 使用新的创建接口
      const response = await post("create_soup", {
        url: api.soup.create,
        data: soupData,
      });

      return response || null;
    } catch (error) {
      console.error("创建海龟汤失败:", error);
      return null;
    }
  },

  /**
   * 获取随机海龟汤ID
   * @returns {Promise<string>} 随机海龟汤ID
   */
  async getRandomSoup() {
    try {
      // 直接使用随机海龟汤API
      const response = await get("soup", {
        url: api.soup.random,
      });
      // 根据新接口契约，直接返回soupId
      return response ? response : null;
    } catch (error) {
      console.error("获取随机海龟汤失败:", error);
      return null;
    }
  },

  /**
   * 点赞/取消点赞海龟汤
   * @param {string} soupId 海龟汤ID
   * @param {boolean} [isLike=true] 是否点赞，false表示取消点赞
   * @returns {Promise<Object>} 点赞结果，包含likes数量
   */
  async likeSoup(soupId, isLike = true) {
    if (!soupId) {
      return { success: false, message: "缺少汤面ID" };
    }
    try {
      // 直接使用API，不依赖this或soupService
      const url = isLike ? api.soup.like(soupId) : api.soup.unlike(soupId);
      const response = await post("soup_status", { url: url });

      // 确保返回格式正确
      if (response) {
        return {
          success: true,
          likes: response.likes || 0,
          message: isLike ? "点赞成功" : "取消点赞成功"
        };
      } else {
        return {
          success: false,
          message: "点赞操作失败，请重试"
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "点赞操作失败: " + (error.message || "未知错误")
      };
    }
  },

  /**
   * 收藏/取消收藏海龟汤
   * @param {string} soupId 海龟汤ID
   * @param {boolean} [isFavorite=true] 是否收藏，false表示取消收藏
   * @returns {Promise<Object>} 结果，包含favorites数量
   */
  async favoriteSoup(soupId, isFavorite = true) {
    if (!soupId) {
      return { success: false, message: "缺少汤面ID" };
    }
    try {
      // 直接使用API，不依赖this或soupService
      const url = isFavorite ? api.soup.favorite(soupId) : api.soup.unfavorite(soupId);
      const response = await post("soup_status", { url: url });

      // 确保返回格式正确
      if (response) {
        return {
          success: true,
          favorites: response.favorites || 0,
          message: isFavorite ? "收藏成功" : "取消收藏成功"
        };
      } else {
        return {
          success: false,
          message: "收藏操作失败，请重试"
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "收藏操作失败: " + (error.message || "未知错误")
      };
    }
  },

  /**
   * 增加汤面阅读数
   * @param {string} soupId 海龟汤ID
   * @returns {Promise<Object>} 结果，包含更新后的阅读数
   */
  async viewSoup(soupId) {
    if (!soupId) {
      return null;
    }
    // todo: 这里有个问题，soupId会传入soupdata
    // 得全盘梳理下soupid和soupdata的传递关系
    if (soupId && typeof soupId === "object" && !Array.isArray(soupId)) {
      soupId = soupId.id;
    }
    try {
      // 根据最新接口契约，使用 /:soupId/view 端点
      const response = await await post("soup_view", {
        url: api.soup.view(soupId),
      });
      return response ? response.views : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * 获取用户创建的海龟汤列表
   * @param {string} userId 用户ID
   * @returns {Promise<Array>} 用户创建的海龟汤列表
   */
  async getUserCreatedSoups(userId) {
    if (!userId) {
      return [];
    }

    try {
      const response = await get("user_created_soup", {
        url: api.user.createdSoup,
        data: { userId }
      });

      return response && Array.isArray(response) ? response : [];
    } catch (error) {
      console.error("获取用户创建的汤失败:", error);
      return [];
    }
  },
};

module.exports = soupService;
