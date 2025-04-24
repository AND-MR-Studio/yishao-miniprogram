/**
 * 汤面显示组件
 * 负责汤面内容的渲染和动画效果
 */
const typeAnimation = require('../../utils/typeAnimation');

Component({
  properties: {
    // 汤面数据对象，由页面传入
    soupData: {
      type: Object,
      value: null,
      observer: function(newVal) {
        if (newVal && this._isAttached) {
          // 更新当前汤面数据
          this.setData({ currentSoup: newVal });

          // 始终显示完整内容，不使用打字机动画
          this.showCompleteContent();
        }
      }
    },
    // 打字机速度
    typeSpeed: {
      type: Number,
      value: 60
    },
    // 静态模式（跳过动画） - 保留属性但在首页始终使用静态模式
    staticMode: {
      type: Boolean,
      value: true
    },
    // 偷看功能已移除，准备重构
    // 是否加载中
    loading: {
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
    displayLines: [],   // 显示的文本行
    isAnimating: false  // 是否正在播放动画
  },

  lifetimes: {
    // 组件初始化
    attached() {
      this._isAttached = true;
      this._initTypeAnimator();
    },

    // 组件就绪
    ready() {
      if (this.data.currentSoup) {
        this.showCompleteContent();
      }
    },

    // 组件卸载
    detached() {
      this._isAttached = false;
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
        this.typeAnimator = null;
      }
    }
  },

  methods: {
    /**
     * 初始化打字机动画器
     * @private
     */
    _initTypeAnimator() {
      this.typeAnimator = typeAnimation.createInstance(this, {
        typeSpeed: this.data.typeSpeed,
        formatContent: (content) => this._formatSoupContent(content)
      });
    },

    /**
     * 格式化汤面内容为行数组
     * @param {Object} soup 汤面数据
     * @returns {Array} 格式化后的行数组
     * @private
     */
    _formatSoupContent(soup) {
      if (!soup) return [];

      const lines = [];
      // 添加标题作为第一行
      if (soup.title) {
        lines.push(soup.title);
      }

      // 后端已统一格式，直接使用contentLines
      if (soup.contentLines && Array.isArray(soup.contentLines)) {
        lines.push(...soup.contentLines.map(line => String(line)));
      }

      return lines;
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
     * 显示完整内容，跳过打字机动画
     * 公开方法，可以从外部调用
     */
    showCompleteContent() {
      if (!this.data.currentSoup || !this.typeAnimator) return;
      this.typeAnimator.showComplete(this.data.currentSoup);
    },

    /**
     * 开始动画 - 在首页不再使用，但保留方法供其他页面使用
     * @returns {Promise} 动画完成的Promise
     */
    startAnimation() {
      // 在首页不再使用打字机动画
      return Promise.resolve();
    },

    /**
     * 暂停动画
     */
    pauseAnimation() {
      if (this.typeAnimator) {
        this.typeAnimator.pause();
        this.triggerEvent('animationPause');
      }
    },

    /**
     * 重置动画
     */
    resetAnimation() {
      if (this.typeAnimator) {
        this.typeAnimator.reset();
        this.triggerEvent('animationReset');
      }
    }
  }
});