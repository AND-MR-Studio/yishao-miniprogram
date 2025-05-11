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
   * @param {string|string[]|null} [soupId] 海龟汤ID或ID数组，如果不提供或为空数组则获取所有海龟汤
   * @param {boolean} [detail=false] 是否返回完整详情，默认false只返回ID
   * @returns {Promise<string|string[]|Object|Object[]>} 海龟汤ID或完整数据
   */
  async getSoup(soupId, detail = false) {
    try {
      // 如果没有提供参数或提供了空数组，获取所有海龟汤
      if (!soupId || (Array.isArray(soupId) && soupId.length === 0)) {
        const response = await soupRequest({
          url: `${api.soup.base}${detail ? "?detail=true" : ""}`,
          method: "GET",
        });
        return response.success ? response.data : [];
      }

      // 如果是非空数组，获取多个海龟汤
      if (Array.isArray(soupId)) {
        // 使用逗号分隔的ID列表进行查询
        const response = await soupRequest({
          url: `${api.soup.base}?id=${soupId.join(",")}${
            detail ? "&detail=true" : ""
          }`,
          method: "GET",
        });
        return response.success ? response.data : [];
      }

      // 如果是单个ID，获取单个海龟汤
      const response = await soupRequest({
        url: `${api.soup.base}${soupId}${detail ? "?detail=true" : ""}`,
        method: "GET",
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error("获取海龟汤失败:", error);
      return Array.isArray(soupId) ? [] : null;
    }
  },

  /**
   * 获取以soupId为键的海龟汤对象
   * 这种格式可以直接通过 soupMap[soupId].title 这样的方式访问属性
   *
   * @param {string|string[]|null} [soupId] 海龟汤ID或ID数组，如果不提供则获取所有海龟汤
   * @returns {Promise<Object>} 以soupId为键的海龟汤对象映射
   *
   * @example
   * // 获取所有汤面的映射
   * const soupMap = await soupService.getSoupMap();
   * // 访问特定汤面的属性
   * const title = soupMap['local_001'].title;
   * const truth = soupMap['local_001'].truth;
   */
  async getSoupMap(soupId) {
    try {
      let url = api.soup.map;

      // 如果提供了ID参数，添加到查询字符串
      if (soupId) {
        if (Array.isArray(soupId)) {
          url += `?id=${soupId.join(",")}`;
        } else {
          url += `?id=${soupId}`;
        }
      }

      const response = await soupRequest({
        url: url,
        method: "GET",
      });

      return response.success ? response.data : {};
    } catch (error) {
      return {};
    }
  },

  /**
   * 创建新海龟汤
   * @param {Object} soupData 海龟汤数据
   * @param {string} soupData.title 标题
   * @param {string} soupData.content 汤面内容
   * @param {string} soupData.truth 汤底
   * @param {number} [soupData.soupType] 海龟汤类型，0表示预制汤，1表示DIY汤
   * @param {string[]} [soupData.tags] 海龟汤标签数组（可包含多个标签）
   * @returns {Promise<Object>} 创建的海龟汤数据
   */
  async createSoup(soupData) {
    if (!soupData) {
      return null;
    }

    try {
      const response = await soupRequest({
        url: api.soup.base,
        method: "POST",
        data: soupData,
      });
      return response.success ? response.data : null;
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
      return response.success ? response.data : null;
    } catch (error) {
      console.error("获取随机海龟汤失败:", error);
      return null;
    }
  },

  /**
   * 批量删除海龟汤
   * @param {string[]} soupIds 海龟汤ID数组
   * @returns {Promise<Object>} 删除结果
   */
  async deleteSoups(soupIds) {
    if (!Array.isArray(soupIds) || soupIds.length === 0) {
      console.error("批量删除海龟汤失败: 无效的ID数组");
      return null;
    }

    try {
      const response = await soupRequest({
        url: `${api.soup.base}?ids=${soupIds.join(",")}`,
        method: "DELETE",
      });
      return response.success ? response.data : null;
    } catch (error) {
      console.error("批量删除海龟汤失败:", error);
      return null;
    }
  },

  /**
   * 通用方法：更新汤面交互状态（点赞/收藏）
   * @param {string} soupId 海龟汤ID
   * @param {string} type 交互类型（'like'/'favorite'）
   * @returns {Promise<Object>} 交互结果
   */
  async updateInteractionStatus(soupId, type) {
    if (!soupId) {
      return null;
    }

    try {
      // 根据交互类型确定API和参数
      let url;
      switch (type) {
        case "like":
          url = api.soup.like(soupId);
          break;
        case "favorite":
          url = api.soup.favorite(soupId);
          break;
        case "unlike":
          url = api.soup.unlike(soupId);
          break;
        case "unfavorite":
          url = api.soup.unfavorite(soupId);
          break;
        default:
          return Promise.reject("不支持的交互类型");
      }

      // 调用API
      const response = await post("soup_status", { url: url });
      return response;
    } catch (error) {
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
    type = isLike ? "like" : "unlike";
    return this.updateInteractionStatus(soupId, type);
  },

  /**
   * 收藏/取消收藏海龟汤
   * @param {string} soupId 海龟汤ID
   * @param {boolean} [isFavorite=true] 是否收藏，false表示取消收藏
   * @returns {Promise<Object>} 结果，包含favorites数量
   */
  async favoriteSoup(soupId, isFavorite = true) {
    type = isFavorite ? "favorite" : "unfavorite";
    return this.updateInteractionStatus(soupId, type);
  },

  /**
   * 获取相邻的海龟汤ID（上一个或下一个）
   * @param {string} soupId 当前海龟汤ID
   * @param {boolean} isNext 是否获取下一个，false表示获取上一个
   * @returns {Promise<string>} 相邻的海龟汤ID
   *
   * @example
   * // 获取下一个海龟汤ID
   * const nextSoupId = await soupService.getAdjacentSoup(soupId, true);
   *
   * // 获取上一个海龟汤ID
   * const prevSoupId = await soupService.getAdjacentSoup(soupId, false);
   */
  async getAdjacentSoup(soupId, isNext = true) {
    if (!soupId) {
      return null;
    }

    try {
      // 根据最新接口契约，直接调用相应的API
      const url = isNext
        ? `${api.soup.base}${soupId}/next`
        : `${api.soup.base}${soupId}/prev`;

      const response = await soupRequest({
        url: url,
        method: "GET",
      });

      // 直接返回soupId
      return response.success ? response.data : null;
    } catch (error) {
      return null;
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
};

module.exports = soupService;
