// components/soup-display/soup-display.js
const soupService = require('../../utils/soupService');
const typeAnimation = require('../../utils/typeAnimation');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 强制使用默认汤面(忽略后台数据)
    useDefaultOnly: {
      type: Boolean,
      value: false
    },
    // 是否自动播放动画
    autoPlay: {
      type: Boolean,
      value: true
    },
    // 标题打字速度（毫秒/字）
    titleTypeSpeed: {
      type: Number,
      value: 150
    },
    // 内容打字速度（毫秒/字）
    contentTypeSpeed: {
      type: Number,
      value: 100
    },
    // 行间延迟（毫秒）
    lineDelay: {
      type: Number,
      value: 800
    },
    // 自动加载数据（组件初始化时自动从后台加载数据）
    autoLoad: {
      type: Boolean,
      value: true
    },
    // 静态模式(不显示动画，直接显示完整内容)
    staticMode: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 数据监听器
   */
  observers: {
    'currentSoup': function (currentSoup) {
      // 当currentSoup变化时，更新显示内容
      this._updateDisplayContent();
    },
    'titleTypeSpeed, contentTypeSpeed, lineDelay': function (titleTypeSpeed, contentTypeSpeed, lineDelay) {
      // 当动画相关属性变化时，更新动画配置
      if (this.typeAnimator) {
        this.typeAnimator.updateConfig({
          titleTypeSpeed,
          contentTypeSpeed,
          lineDelay
        });
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 当前汤面数据
    currentSoup: null,
    // 显示内容
    title: '',
    contentLines: [],
    soupId: '',
    // 动画相关数据
    titleChars: [],
    titleAnimationComplete: false,
    displayLines: [],
    currentLineIndex: 0,
    lineAnimationComplete: false,
    animationComplete: false,
    isAnimating: false,
    // 加载状态
    loading: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function () {
      // 初始化打字机动画工具
      this._initTypeAnimator();

      // 自动加载数据或使用默认汤面
      if (this.data.autoLoad && !this.data.useDefaultOnly) {
        this.loadSoupData();
      } else {
        this._updateDisplayContent();
      }
    },

    detached: function () {
      // 组件销毁时清除动画资源
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化打字机动画工具
     * @private
     */
    _initTypeAnimator: function () {
      this.typeAnimator = typeAnimation.createInstance(this, {
        titleTypeSpeed: this.data.titleTypeSpeed,
        contentTypeSpeed: this.data.contentTypeSpeed,
        lineDelay: this.data.lineDelay,
        onAnimationStart: () => {
          this.triggerEvent('animationStart');
        },
        onAnimationComplete: () => {
          this.triggerEvent('animationComplete');
        }
      });
    },

    /**
     * 从后台加载汤面数据
     */
    loadSoupData: function () {
      if (this.data.useDefaultOnly) {
        // 使用默认汤面
        this.setData({
          currentSoup: soupService.getDefaultSoup()
        });
        return;
      }

      this.setData({ loading: true });
      this.triggerEvent('loadStart');

      soupService.getSoupData({
        success: (soupData) => {
          this.setData({
            currentSoup: soupData,
            loading: false
          });

          this.triggerEvent('loadSuccess', { soupData });

          if (this.data.autoPlay) {
            this.startAnimation();
          }
        },
        fail: (error) => {
          console.error('获取汤面数据失败:', error);
          this.setData({ loading: false });
          this.triggerEvent('loadFail', { error });
        },
        complete: () => {
          this.triggerEvent('loadComplete');
        }
      });
    },

    /**
     * 更新显示内容
     * @private
     */
    _updateDisplayContent: function () {
      const currentSoup = this.data.currentSoup;

      // 处理null情况
      if (!currentSoup) {
        const defaultSoup = soupService.getDefaultSoup();
        this.setData({
          currentSoup: soupService.getDefaultSoup()
        });
        return; // 触发currentSoup的observer会再次调用此方法
      }

      // 更新显示内容
      this.setData({
        title: currentSoup.title,
        contentLines: currentSoup.contentLines,
        soupId: currentSoup.soupId || ''
      });

      // 初始化标题字符并处理动画
      this._splitTitleChars(this.data.title);
      if (this.data.isAnimating) {
        this.resetAnimation();
        this.startAnimation();
      }

      // 触发内容变更事件
      this.triggerEvent('contentChange', {
        soupId: this.data.soupId,
        title: this.data.title,
        contentLines: this.data.contentLines
      });
    },

    /**
     * 设置当前汤面
     * @param {Object} soup 汤面数据对象
     */
    setCurrentSoup: function (soup) {
      this.setData({ currentSoup: soup });
      return true;
    },

    /**
     * 清除当前汤面，使用默认汤面
     */
    clearCurrentSoup: function () {
      this.setData({
        currentSoup: soupService.getDefaultSoup()
      });
      return true;
    },

    /**
     * 更新默认汤面
     * @param {Object} soup 默认汤面数据
     */
    updateDefaultSoup: function (soup) {
      const updated = soupService.updateDefaultSoup(soup);
      if (updated && !this.data.currentSoup) {
        this.clearCurrentSoup();
      }
      return updated;
    },

    /**
     * 获取当前汤面数据
     * @returns {Object} 汤面数据对象
     */
    getSoupData: function () {
      return {
        soupId: this.data.soupId,
        title: this.data.title,
        contentLines: this.data.contentLines
      };
    },

    /**
     * 拆分标题为字符数组
     * @param {String} title 标题文本
     * @private
     */
    _splitTitleChars: function (title) {
      const chars = title.split('').map(char => ({ char, show: false }));
      this.setData({ titleChars: chars });
    },

    /**
     * 动画控制方法
     */
    startAnimation: function () {
      if (this.data.isAnimating) return;
      if (this.typeAnimator) {
        this.typeAnimator.start({
          title: this.data.title,
          contentLines: this.data.contentLines
        });
      }
    },

    pauseAnimation: function () {
      if (this.typeAnimator) {
        this.typeAnimator.pause();
      }
      this.triggerEvent('animationPause');
    },

    resetAnimation: function () {
      if (this.typeAnimator) {
        this.typeAnimator.reset();
      }
      this.triggerEvent('animationReset');
    }
  }
});