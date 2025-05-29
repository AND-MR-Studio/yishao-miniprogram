/**
 * 汤面API接口实现
 * 负责封装所有与汤面API相关的接口调用
 * 实现接口层设计，与服务层解耦
 */
const { get, post } = require('../utils/request');
const urlConfig = require('../config/url-config');

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
      return await get('get_soup_by_id', {
        url: urlConfig.soupUrl.get(id)
      });
    } catch (error) {
      console.error('获取汤面失败:', error);
      return null;
    }
  },

  /**
   * 获取随机汤面
   * @returns {Promise<Object>} 随机汤面数据
   */
  getRandomSoup: async () => {
    try {
      return await get('get_random_soup', {
        url: urlConfig.soupUrl.random()
      });
    } catch (error) {
      console.error('获取随机汤面失败:', error);
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
      return await post('create_soup', {
        url: urlConfig.soupUrl.create(),
        data: soupData
      });
    } catch (error) {
      console.error('创建汤面失败:', error);
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
      return await post('like_soup', {
        url: urlConfig.soupUrl.like(id)
      });
    } catch (error) {
      console.error('点赞汤面失败:', error);
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
      return await post('unlike_soup', {
        url: urlConfig.soupUrl.unlike(id)
      });
    } catch (error) {
      console.error('取消点赞汤面失败:', error);
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
      return await post('favorite_soup', {
        url: urlConfig.soupUrl.favorite(id)
      });
    } catch (error) {
      console.error('收藏汤面失败:', error);
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
      return await post('unfavorite_soup', {
        url: urlConfig.soupUrl.unfavorite(id)
      });
    } catch (error) {
      console.error('取消收藏汤面失败:', error);
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
      return await post('view_soup', {
        url: urlConfig.soupUrl.view(id)
      });
    } catch (error) {
      console.error('增加汤面浏览量失败:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = soupApiImpl;