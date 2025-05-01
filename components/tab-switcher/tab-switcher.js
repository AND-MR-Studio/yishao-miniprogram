// components/tab-switcher/tab-switcher.js
const soupService = require('../../utils/soupService');
const userService = require('../../utils/userService');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前激活的标签
    activeTab: {
      type: String,
      value: '荒诞'
    },
    // 未解决的预制汤数量
    unsolvedCount: {
      type: Number,
      value: 0
    },
    // 是否处于喝汤状态
    isDrinking: {
      type: Boolean,
      value: false
    },
    // 是否禁用标签切换
    disabled: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    jellyAnimating: false, // 是否正在执行果冻动画
    isLoading: false, // 是否正在加载数据
    // 标签列表
    tabs: ['荒诞', '搞笑', '惊悚', '变格']
  },

  /**
   * 组件的方法列表
   */
  lifetimes: {
    attached() {
      // 组件挂载后获取未解决的汤数量
      this.getUnsolvedSoupCount();
    }
  },

  methods: {
    /**
     * 标签点击事件
     * @param {Object} e 事件对象
     */
    handleTabTap(e) {
      // 如果组件被禁用或正在加载，不处理点击
      if (this.properties.disabled || this.data.isLoading) {
        return;
      }

      const tab = e.currentTarget.dataset.tab;

      // 如果点击的是当前激活的标签，不处理
      if (tab === this.properties.activeTab) {
        return;
      }

      // 开始果冻动画
      this.setData({
        jellyAnimating: true
        // 移除isLoading: true，避免禁用点击
      });

      // 监听动画结束并重置状态
      setTimeout(() => {
        this.setData({
          jellyAnimating: false
        });
      }, 600); // 与动画持续时间一致

      // 触发标签切换事件，通知父组件
      this.triggerEvent('tabchange', { tab });
    },

    /**
     * 设置加载状态
     * @param {Boolean} loading 是否加载中
     */
    setLoading(loading) {
      this.setData({ isLoading: loading });
    },

    /**
     * 获取未解决的数量
     * 暂时固定显示为5
     */
    async getUnsolvedSoupCount() {
      try {
        // 检查用户是否已登录
        if (!userService.checkLoginStatus()) {
          return;
        }

        // 暂时固定显示未解决数量为5
        this.setData({
          unsolvedCount: 5
        });

        /*
        // 原始获取未解决数量的代码，暂时注释
        // 获取用户ID
        const userId = await userService.getUserId();
        if (!userId) {
          return;
        }

        // 获取未解决的预制汤数量
        const result = await soupService.getUnsolvedSoupCount(userId);
        if (result && typeof result.count === 'number') {
          this.setData({
            unsolvedCount: result.count
          });
        }
        */
      } catch (error) {
        console.error('获取未解决汤数量失败:', error);
        // 失败时不显示错误提示，保持数量为0
      }
    }
  }
})
