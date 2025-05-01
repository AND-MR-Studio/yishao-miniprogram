/**
 * 交互底部组件
 * 包含点赞、收藏和感谢作者功能
 */
Component({
  properties: {
    // 是否已收藏
    isFavorite: {
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
    // 创作者ID
    creatorId: {
      type: String,
      value: ''
    },
    // 是否处于偷看模式
    isPeeking: {
      type: Boolean,
      value: false
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
    // 组件内部数据
  },

  methods: {
    /**
     * 处理收藏点击事件
     */
    handleFavoriteClick() {
      // 触发收藏事件，由父组件处理具体逻辑
      this.triggerEvent('favorite');
    }
  }
});
