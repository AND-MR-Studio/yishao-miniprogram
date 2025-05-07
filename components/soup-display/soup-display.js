/**
 * 汤面显示组件
 * 负责汤面内容的渲染
 */

// 引入交互管理器
const { createInteractionManager, SWIPE_DIRECTION } = require('../../utils/interactionManager');
// 引入服务
const soupService = require('../../utils/soupService');
const userService = require('../../utils/userService');

Component({
  properties: {
    // 汤面ID，可选，如果提供则组件自行获取数据
    soupId: {
      type: String,
      value: '',
      observer: function(newVal) {
        if (newVal && !this.data.soupData && this._isAttached) {
          this.fetchSoupData(newVal);
        }
      }
    },
    // 汤面数据对象，可选，优先级高于soupId
    soupData: {
      type: Object,
      value: null,
      observer: function(newVal) {
        if (newVal && this._isAttached) {
          this.updateSoupDisplay(newVal);
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
    // 是否已点赞
    isLiked: {
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
    // 阅读数量
    viewCount: {
      type: Number,
      value: 0
    },
    // 是否处于喝汤状态
    isDrinking: {
      type: Boolean,
      value: false
    },
    // 模糊程度（0-10px）
    blurAmount: {
      type: Number,
      value: 0
    },
    // 是否启用呼吸模糊效果
    breathingBlur: {
      type: Boolean,
      value: false
    },
    // 滑动方向反馈
    swipeFeedback: {
      type: Boolean,
      value: false
    },
    // 滑动方向
    swipeDirection: {
      type: String,
      value: 'none'
    },
    // 页面状态：viewing, drinking, truth
    pageState: {
      type: String,
      value: 'viewing'
    }
  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  data: {
    displayContent: '',  // 显示的文本内容
    creatorId: ''  // 创作者ID
  },

  lifetimes: {
    // 组件初始化
    attached() {
      this._isAttached = true;
      if (this.properties.soupData) {
        this.setData({
          displayContent: this._formatSoupContent(this.properties.soupData)
        });
      }

      // 初始化交互管理器
      this.initInteractionManager();
    },

    // 组件卸载
    detached() {
      this._isAttached = false;

      // 销毁交互管理器
      if (this.interactionManager) {
        this.interactionManager.destroy();
        this.interactionManager = null;
      }
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
      // 直接从properties中获取soupId
      if (this.properties.soupId) {
        return this.properties.soupId;
      }
      // 如果没有soupId但有soupData，则从soupData中获取
      if (this.properties.soupData) {
        return this.properties.soupData.soupId || '';
      }
      return '';
    },

    /**
     * 处理收藏状态变更事件
     * 从交互底部组件传递上来的事件
     */
    onFavoriteChange(e) {
      const { isFavorite, favoriteCount } = e.detail;

      // 更新组件状态
      this.setData({
        isFavorite: isFavorite,
        favoriteCount: favoriteCount
      });

      // 不再向上传递事件，由eventCenter统一处理
    },

    /**
     * 处理点赞状态变更事件
     * 从交互底部组件传递上来的事件
     */
    onLikeChange(e) {
      const { likeCount } = e.detail;

      // 更新组件状态
      this.setData({
        likeCount: likeCount
      });

      // 不再向上传递事件，由eventCenter统一处理
    },

    /**
     * 初始化交互管理器
     */
    initInteractionManager() {
      this.interactionManager = createInteractionManager({
        setData: this.setData.bind(this),
        onSwipeLeft: this.handleSwipeLeft.bind(this),
        onSwipeRight: this.handleSwipeRight.bind(this),
        onDoubleTap: this.handleDoubleTap.bind(this),
        onLongPressStart: this.handleLongPressStart.bind(this),
        onLongPressEnd: this.handleLongPressEnd.bind(this),
        // 长按相关配置
        longPressDelay: 300, // 长按触发时间，默认300ms
        enablePeek: true // 启用偷看功能
      });
    },

    /**
     * 处理左滑事件
     */
    handleSwipeLeft() {
      if (this.canSwitchSoup()) {
        this.setData({
          swipeFeedback: true,
          swipeDirection: SWIPE_DIRECTION.LEFT
        });

        // 通知页面切换汤面
        this.triggerEvent('swipe', { direction: 'next' });
      }
    },

    /**
     * 处理右滑事件
     */
    handleSwipeRight() {
      if (this.canSwitchSoup()) {
        this.setData({
          swipeFeedback: true,
          swipeDirection: SWIPE_DIRECTION.RIGHT
        });

        // 通知页面切换汤面
        this.triggerEvent('swipe', { direction: 'previous' });
      }
    },

    /**
     * 处理双击事件
     */
    handleDoubleTap() {
      // 调用交互底部组件的收藏方法
      const interactionFooter = this.selectComponent('#interactionFooter');
      if (interactionFooter) {
        interactionFooter.toggleFavorite();
      }
    },

    /**
     * 处理长按开始事件
     */
    handleLongPressStart() {
      // 触发长按开始事件
      this.triggerEvent('longPressStart');
    },

    /**
     * 处理长按结束事件
     */
    handleLongPressEnd() {
      // 触发长按结束事件
      this.triggerEvent('longPressEnd');
    },

    /**
     * 检查是否可以切换汤面
     * @returns {boolean} 是否可以切换汤面
     */
    canSwitchSoup() {
      return this.properties.pageState === 'viewing' && !this.properties.loading;
    },

    /**
     * 触摸开始事件处理
     */
    touchStart(e) {
      const canInteract = this.canSwitchSoup();
      this.interactionManager?.handleTouchStart(e, canInteract);
    },

    /**
     * 触摸移动事件处理
     */
    touchMove(e) {
      const canInteract = this.canSwitchSoup();
      this.interactionManager?.handleTouchMove(e, canInteract);
    },

    /**
     * 触摸结束事件处理
     */
    touchEnd(e) {
      const canInteract = this.canSwitchSoup();
      this.interactionManager?.handleTouchEnd(e, canInteract);
    },

    // 移除incrementSoupViewCount方法，完全由页面统一管理

    /**
     * 更新汤面显示
     */
    updateSoupDisplay(soupData) {
      // 更新汤面数据
      this.setData({
        displayContent: this._formatSoupContent(soupData),
        favoriteCount: soupData.favoriteCount || 0,
        likeCount: soupData.likeCount || 0,
        viewCount: soupData.viewCount || 0,
        creatorId: soupData.creatorId || ''
      });

      // 增加汤面阅读数不再在组件内处理，由页面统一管理
    },

    /**
     * 获取汤面数据
     * 使用新的getSoupMap方法，以soupId为键获取汤面数据
     */
    async fetchSoupData(soupId) {
      if (!soupId) return;

      try {
        // 通知页面组件正在加载
        this.triggerEvent('loading', { loading: true });

        // 使用新的getSoupMap方法获取汤面数据
        const soupMap = await soupService.getSoupMap(soupId);

        if (soupMap && soupMap[soupId]) {
          // 直接使用soupId作为键获取完整的汤面数据
          this.updateSoupDisplay(soupMap[soupId]);
        } else {
          console.error('获取汤面数据失败: 未找到指定ID的汤面');
        }
      } catch (error) {
        console.error('获取汤面数据失败:', error);
      } finally {
        // 通知页面组件加载完成
        this.triggerEvent('loading', { loading: false });
      }
    }
  }
});
