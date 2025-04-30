/**
 * 汤面显示组件
 * 负责汤面内容的渲染
 */

// 引入服务
const userService = require('../../utils/userService');
const soupService = require('../../utils/soupService');

Component({
  properties: {
    // 汤面数据对象，由页面传入
    soupData: {
      type: Object,
      value: null,
      observer: function(newVal) {
        if (newVal && this._isAttached) {
          // 更新当前汤面数据
          this.setData({
            currentSoup: newVal,
            displayContent: this._formatSoupContent(newVal)
          });
        }
      }
    },
    // 是否加载中
    loading: {
      type: Boolean,
      value: false
    },
    // 是否已收藏
    isFavorite: {
      type: Boolean,
      value: false
    },
    // 是否处于偷看模式
    isPeeking: {
      type: Boolean,
      value: false
    }
  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  data: {
    currentSoup: null,  // 当前汤面数据
    displayContent: '',  // 显示的文本内容
    activeTab: 'preset',   // 当前激活的标签: 'preset', 'diy'，默认显示预制汤
    unsolvedCount: 0    // 未解决的预制汤数量
  },

  lifetimes: {
    // 组件初始化
    attached() {
      this._isAttached = true;
      if (this.data.currentSoup) {
        this.setData({
          displayContent: this._formatSoupContent(this.data.currentSoup)
        });
      }

      // 获取未解决的预制汤数量
      this._fetchUnsolvedCount();

      // 初始化时默认加载预制汤
      wx.nextTick(() => {
        // 使用nextTick确保组件完全初始化后再加载数据
        if (this.data.activeTab === 'preset') {
          this._loadSoupByType('preset');
        }
      });
    },

    // 组件卸载
    detached() {
      this._isAttached = false;
    }
  },

  methods: {
    /**
     * 格式化汤面内容为显示文本
     * @param {Object} soup 汤面数据
     * @returns {String} 格式化后的文本
     * @private
     */
    _formatSoupContent(soup) {
      if (!soup) return '';

      let content = '';

      // 只添加内容，标题单独显示
      if (soup.contentLines && Array.isArray(soup.contentLines)) {
        content = soup.contentLines.join('\n');
      }

      return content;
    },

    /**
     * 获取当前汤面ID
     * @returns {string} 当前汤面ID
     */
    getCurrentSoupId() {
      if (this.data.currentSoup) {
        return this.data.currentSoup.soupId || '';
      }
      return '';
    },

    /**
     * 切换标签
     * @param {Object} e 事件对象
     */
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      if (tab === this.data.activeTab) return;

      this.setData({ activeTab: tab });

      // 触发标签切换事件，通知父组件
      this.triggerEvent('tabchange', { tab });

      // 根据标签类型加载对应的汤
      this._loadSoupByType(tab);
    },

    /**
     * 根据类型加载汤
     * @param {string} tabType 标签类型
     * @private
     */
    async _loadSoupByType(tabType) {
      try {
        let soupType;

        // 根据标签类型确定汤类型
        switch (tabType) {
          case 'preset':
            soupType = 0; // 预制汤
            break;
          case 'diy':
            soupType = 1; // DIY汤
            break;
          default:
            soupType = 0; // 默认为预制汤
            break;
        }

        // 通知父组件开始加载
        this.triggerEvent('loading', { loading: true });

        // 获取对应类型的汤
        let soups = await soupService.getSoupList({ type: soupType });

        // 如果有汤数据，随机选择一个
        if (soups && soups.length > 0) {
          const randomIndex = Math.floor(Math.random() * soups.length);
          const randomSoup = soups[randomIndex];

          // 通知父组件更新汤数据
          this.triggerEvent('soupchange', { soup: randomSoup });
        } else {
          wx.showToast({
            title: '没有找到相关汤',
            icon: 'none'
          });
        }

        // 通知父组件加载完成
        this.triggerEvent('loading', { loading: false });
      } catch (error) {
        console.error('加载汤数据失败:', error);
        // 通知父组件加载失败
        this.triggerEvent('loading', { loading: false });

        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      }
    },

    /**
     * 获取未解决的预制汤数量
     * @private
     */
    async _fetchUnsolvedCount() {
      try {
        // 检查用户是否登录
        if (!userService.checkLoginStatus(false)) {
          return;
        }

        // 获取用户信息
        const userInfo = await userService.getFormattedUserInfo(false);
        if (!userInfo) {
          return;
        }

        // 获取未解决数量
        const unsolvedCount = userInfo.unsolvedCount || 0;

        this.setData({ unsolvedCount });
      } catch (error) {
        console.error('获取未解决汤数量失败:', error);
      }
    }
  }
});