/**
 * 汤面显示组件
 * 负责汤面内容的渲染
 */

// 不再需要引入服务

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
            displayContent: this._formatSoupContent(newVal),
            favoriteCount: newVal.favoriteCount || 0,
            likeCount: newVal.likeCount || 0,
            creatorId: newVal.creatorId || ''
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
    },
    // 收藏数量
    favoriteCount: {
      type: Number,
      value: 0
    },
    // 点赞数量
    likeCount: {
      type: Number,
      value: 0
    },
    // 是否处于喝汤状态
    isDrinking: {
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
    creatorId: ''  // 创作者ID
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
     * 处理收藏点击事件
     * 从交互底部组件传递上来的事件
     */
    onFavoriteClick() {
      // 触发收藏事件，由页面处理具体逻辑
      this.triggerEvent('favorite');
    }
  }
});