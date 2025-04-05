// components/soup-display/soup-display.js
const soupService = require('../../utils/soupService');
const typeAnimation = require('../../utils/typeAnimation');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 指定要显示的汤面ID，不指定则随机获取
    soupId: {
      type: String,
      value: ''
    },
    // 是否自动播放动画
    autoPlay: {
      type: Boolean,
      value: true
    },
    // 打字速度（毫秒/字）
    typeSpeed: {
      type: Number,
      value: 60
    },
    // 行间延迟（毫秒）
    lineDelay: {
      type: Number,
      value: 500
    },
    // 标点符号延迟倍数
    punctuationDelay: {
      type: Number,
      value: 2.5
    },
    // 静态模式(不显示动画，直接显示完整内容)
    staticMode: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 引用外部样式类
   */
  externalClasses: [],

  /**
   * 组件样式隔离
   */
  options: {
    styleIsolation: 'shared',
    addGlobalClass: true
  },

  /**
   * 数据监听器
   */
  observers: {
    'currentSoup'(currentSoup) {
      this._updateDisplayContent();
    },
    'typeSpeed, lineDelay, punctuationDelay'(typeSpeed, lineDelay, punctuationDelay) {
      if (this.typeAnimator) {
        this.typeAnimator.updateConfig({
          typeSpeed,
          lineDelay,
          punctuationDelay
        });
      }
    },
    'staticMode'(staticMode) {
      if (!this.data.currentSoup) return;
      
      if (staticMode) {
        this._showCompleteContent();
      } else if (this.data.autoPlay) {
        this.resetAnimation();
        this.startAnimation();
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentSoup: null,
    title: '',
    contentLines: [],
    // 动画相关数据
    displayLines: [],
    currentLineIndex: 0,
    lineAnimationComplete: false,
    animationComplete: false,
    isAnimating: false,
    loading: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this._initTypeAnimator();
      
      // 加载汤面数据
      this.loadSoupData();
      
      // 如果是静态模式，直接显示完整内容
      if (this.data.staticMode && this.data.currentSoup) {
        this._showCompleteContent();
      } else if (this.data.autoPlay) {
        this.startAnimation();
      }
    },

    detached() {
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
        this.typeAnimator = null;
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
    _initTypeAnimator() {
      this.typeAnimator = typeAnimation.createInstance(this, {
        typeSpeed: this.data.typeSpeed,
        lineDelay: this.data.lineDelay,
        punctuationDelay: this.data.punctuationDelay,
        onAnimationStart: () => this.triggerEvent('animationStart'),
        onAnimationComplete: () => this.triggerEvent('animationComplete')
      });
    },

    /**
     * 从后台加载汤面数据
     */
    loadSoupData() {
      this.setData({ loading: true });
      this.triggerEvent('loadStart');

      // 获取目标汤面ID
      let targetSoupId = this._getNextSoupId();

      soupService.getSoupData({
        soupId: targetSoupId,
        success: (soupData) => {
          this.setData({
            currentSoup: soupData,
            loading: false
          });

          this.triggerEvent('loadSuccess', { soupData });

          if (this.data.staticMode) {
            this._showCompleteContent();
          } else if (this.data.autoPlay) {
            this.resetAnimation();
            this.startAnimation();
          }
        },
        fail: (error) => {
          console.error('获取汤面数据失败:', error);
          // 加载失败时使用第一个汤面
          const defaultSoup = soupService.soups[0];
          this.setData({ 
            currentSoup: defaultSoup,
            loading: false 
          });
          this.triggerEvent('loadFail', { error });
        },
        complete: () => {
          this.triggerEvent('loadComplete');
        }
      });
    },

    /**
     * 获取下一个汤面ID
     * @private
     * @returns {String} 下一个汤面ID
     */
    _getNextSoupId() {
      const currentId = this.data.soupId;
      if (!currentId) return '';
      
      const currentIndex = soupService.getSoupIndex(currentId);
      // 如果是最后一个或找不到当前汤面，从第一个开始
      if (currentIndex === -1 || currentIndex === soupService.soups.length - 1) {
        return soupService.soups[0].soupId;
      }
      // 否则获取下一个汤面
      return soupService.soups[currentIndex + 1].soupId;
    },

    /**
     * 更新显示内容
     * @private
     */
    _updateDisplayContent() {
      const currentSoup = this.data.currentSoup;
      if (!currentSoup) {
        this.setData({
          currentSoup: soupService.soups[0]
        });
        return;
      }

      this.setData({
        title: currentSoup.title,
        contentLines: currentSoup.contentLines,
        soupId: currentSoup.soupId || ''
      });

      this.triggerEvent('contentChange', {
        soupId: this.data.soupId,
        title: this.data.title,
        contentLines: this.data.contentLines
      });
    },

    /**
     * 显示完整内容（静态模式）
     * @private
     */
    _showCompleteContent() {
      if (!this.data.title || !this.data.contentLines || !this.typeAnimator) return;
      
      wx.nextTick(() => {
        this.typeAnimator.showComplete({
          title: this.data.title,
          contentLines: this.data.contentLines
        });
      });
    },

    /**
     * 设置当前汤面
     * @param {Object} soup 汤面数据对象
     * @returns {boolean} 是否设置成功
     */
    setCurrentSoup(soup) {
      if (!soup?.title || !soup?.contentLines) return false;
      
      this.setData({ 
        loading: false,
        currentSoup: soup
      });
      
      if (this.data.staticMode) {
        this._showCompleteContent();
      } else if (this.data.autoPlay) {
        this.resetAnimation();
        this.startAnimation();
      }
      
      return true;
    },

    /**
     * 获取当前汤面数据
     * @returns {Object} 汤面数据对象
     */
    getSoupData() {
      return {
        soupId: this.data.soupId,
        title: this.data.title,
        contentLines: this.data.contentLines
      };
    },

    /**
     * 动画控制方法 - 开始动画
     */
    startAnimation() {
      if (this.data.isAnimating || this.data.staticMode || !this.typeAnimator) return;
      
      this.typeAnimator.start({
        title: this.data.title,
        contentLines: this.data.contentLines
      });
    },

    /**
     * 动画控制方法 - 暂停动画
     */
    pauseAnimation() {
      if (this.typeAnimator) {
        this.typeAnimator.pause();
        this.triggerEvent('animationPause');
      }
    },

    /**
     * 动画控制方法 - 重置动画
     */
    resetAnimation() {
      if (this.typeAnimator) {
        this.typeAnimator.reset();
        this.triggerEvent('animationReset');
      }
    }
  }
});