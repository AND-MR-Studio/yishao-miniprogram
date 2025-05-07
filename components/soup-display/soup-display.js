/**
 * 汤面显示组件
 * 负责汤面内容的渲染
 * 不包含交互逻辑，交互由父页面控制
 */

// 引入服务
const soupService = require('../../utils/soupService');
// 引入MobX store
const { store } = require('../../stores/soupStore');

Component({
  properties: {
    // 汤面ID，可选，如果提供则组件自行获取数据
    // 注意：优先使用soupData属性传递完整数据，而不是依赖此属性
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

    // 页面状态：viewing, drinking, truth
    pageState: {
      type: String,
      value: 'viewing'
    },

  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  data: {
    creatorId: ''  // 创作者ID
  },

  lifetimes: {
    // 组件初始化
    attached() {
      this._isAttached = true;
    },

    // 组件卸载
    detached() {
      this._isAttached = false;
    }
  },

  methods: {
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

      // 直接更新MobX store
      store.updateFavoriteStatus(isFavorite, favoriteCount);
    },

    /**
     * 处理点赞状态变更事件
     * 从交互底部组件传递上来的事件
     */
    onLikeChange(e) {
      const { isLiked, likeCount } = e.detail;

      // 更新组件状态
      this.setData({
        likeCount: likeCount
      });

      // 直接更新MobX store
      store.updateLikeStatus(isLiked, likeCount);
    },

    /**
     * 设置偷看状态
     * 由父页面调用，用于控制偷看功能
     * @param {boolean} isPeeking 是否处于偷看状态
     */
    setPeekingStatus(isPeeking) {
      this.triggerEvent(isPeeking ? 'longPressStart' : 'longPressEnd');
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

    // 移除incrementSoupViewCount方法，完全由页面统一管理

    /**
     * 更新汤面显示
     */
    updateSoupDisplay(soupData) {
      // 更新汤面数据
      this.setData({
        favoriteCount: soupData.favoriteCount || 0,
        likeCount: soupData.likeCount || 0,
        creatorId: soupData.creatorId || ''
      });

      // 增加汤面阅读数不再在组件内处理，由页面统一管理
    },

    /**
     * 获取汤面数据
     * 使用新的getSoupMap方法，以soupId为键获取汤面数据
     *
     * 注意：此方法仅在组件内部使用，当soupId属性变更时自动调用
     * 页面应优先使用soupData属性传递完整数据，而不是依赖此方法
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
