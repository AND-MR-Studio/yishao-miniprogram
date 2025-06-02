/**
 * 汤面API接口实现
 * 负责封装所有与汤面API相关的接口调用
 * 实现接口层设计，与服务层解耦
 */
const { get, post } = require('../utils/request');
const { getFullUrl } = require('../utils/urlUtils');
const SOUP = "soup"

/**
 * 汤面API接口实现类
 * 提供所有汤面相关的API调用方法
 */
const soupApiImpl = {
  /**
   * 获取指定ID的汤面
   * @param {string} id - 汤面ID
   * @returns {Promise<Object>} 汤面数据
   */
  getSoup: async (id) => {
    try {
      return await get({
        url: getFullUrl(SOUP, `/get/${id}`)
      });
    } catch (error) {
      console.error(`[${SOUP}] 获取汤面失败:`, error);
      return null;
    }
  },

  /**
   * 获取随机汤面
   * @returns {Promise<Object>} 随机汤面数据
   */
  getRandomSoup: async () => {
    try {
      return await get({
        url: getFullUrl(SOUP, '/random')
      });
    } catch (error) {
      console.error(`[${SOUP}] 获取随机汤面失败:`, error);
      return null;
    }
  },

  /**
   * 创建新汤面
   * @param {Object} soupData - 汤面数据
   * @returns {Promise<Object>} 创建结果
   */
  createSoup: async (soupData) => {
    try {
      return await post({
        url: getFullUrl(SOUP, '/create'),
        data: soupData
      });
    } catch (error) {
      console.error(`[${SOUP}] 创建汤面失败:`, error);
      return null;
    }
  },

  /**
   * 点赞汤面
   * @param {string} id - 汤面ID
   * @returns {Promise<Object>} 操作结果
   */
  likeSoup: async (id) => {
    try {
      return await post({
        url: getFullUrl(SOUP, `/like/${id}`)
      });
    } catch (error) {
      console.error(`[${SOUP}] 点赞汤面失败:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 取消点赞汤面
   * @param {string} id - 汤面ID
   * @returns {Promise<Object>} 操作结果
   */
  unlikeSoup: async (id) => {
    try {
      return await post({
        url: getFullUrl(SOUP, `/unlike/${id}`)
      });
    } catch (error) {
      console.error(`[${SOUP}] 取消点赞汤面失败:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 收藏汤面
   * @param {string} id - 汤面ID
   * @returns {Promise<Object>} 操作结果
   */
  favoriteSoup: async (id) => {
    try {
      return await post({
        url: getFullUrl(SOUP, `/favor/${id}`)
      });
    } catch (error) {
      console.error(`[${SOUP}] 收藏汤面失败:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 取消收藏汤面
   * @param {string} id - 汤面ID
   * @returns {Promise<Object>} 操作结果
   */
  unfavoriteSoup: async (id) => {
    try {
      return await post({
        url: getFullUrl(SOUP, `/unfavor/${id}`)
      });
    } catch (error) {
      console.error(`[${SOUP}] 取消收藏汤面失败:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 增加汤面浏览量
   * @param {string} id - 汤面ID
   * @returns {Promise<Object>} 操作结果
   */
  viewSoup: async (id) => {
    try {
      return await post({
        url: getFullUrl(SOUP, `/view/${id}`)
      });
    } catch (error) {
      console.error(`[${SOUP}] 增加汤面浏览量失败:`, error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = soupApiImpl;