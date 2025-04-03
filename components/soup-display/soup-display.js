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
      value: 80  
    },
    // 内容打字速度（毫秒/字）
    contentTypeSpeed: {
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
    },
    // 自定义光标颜色
    cursorColor: {
      type: String,
      value: ''  // 空表示使用主题默认值
    }
  },

  /**
   * 数据监听器
   */
  observers: {
    'currentSoup': function(currentSoup) {
      this._updateDisplayContent();
    },
    'titleTypeSpeed, contentTypeSpeed, lineDelay, punctuationDelay': function(titleTypeSpeed, contentTypeSpeed, lineDelay, punctuationDelay) {
      if (this.typeAnimator) {
        const config = {};
        
        // 更新所有值
        config.titleTypeSpeed = titleTypeSpeed;
        config.contentTypeSpeed = contentTypeSpeed;
        config.lineDelay = lineDelay;
        config.punctuationDelay = punctuationDelay;
        
        this.typeAnimator.updateConfig(config);
      }
    },
    'staticMode': function(staticMode) {
      // 当staticMode变化时，更新动画状态
      if (staticMode && this.data.currentSoup) {
        this._showCompleteContent();
      } else if (this.data.autoPlay && this.data.currentSoup) {
        this.resetAnimation();
        this.startAnimation();
      }
    },
    'cursorColor': function(color) {
      if (color) {
        this.setData({
          _cursorStyle: `--cursor-color: ${color};`
        });
      } else {
        this.setData({
          _cursorStyle: ''
        });
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
    soupId: '',
    // 动画相关数据
    titleChars: [],
    titleAnimationComplete: false,
    displayLines: [],
    currentLineIndex: 0,
    lineAnimationComplete: false,
    animationComplete: false,
    isAnimating: false,
    loading: false,
    // 内部使用数据
    _cursorStyle: ''
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      // 初始化光标样式
      if (this.data.cursorColor) {
        this.setData({
          _cursorStyle: `--cursor-color: ${this.data.cursorColor};`
        });
      }
      
      this._initTypeAnimator();
      
      // 如果没有数据且不是静态模式，则加载默认数据
      if (!this.data.currentSoup && !this.data.staticMode) {
        this.setData({
          currentSoup: soupService.getDefaultSoup()
        });
      }
      
      // 如果是静态模式，直接显示完整内容
      if (this.data.staticMode) {
        this._showCompleteContent();
      } else if (this.data.autoPlay) {
        this.startAnimation();
      }
    },

    detached: function() {
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
    _initTypeAnimator: function() {
      this.typeAnimator = typeAnimation.createInstance(this, {
        titleTypeSpeed: this.data.titleTypeSpeed,
        contentTypeSpeed: this.data.contentTypeSpeed,
        lineDelay: this.data.lineDelay,
        punctuationDelay: this.data.punctuationDelay,
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
    loadSoupData: function() {
      if (this.data.useDefaultOnly) {
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

          if (this.data.staticMode) {
            this._showCompleteContent();
          } else if (this.data.autoPlay) {
            this.startAnimation();
          }
        },
        fail: (error) => {
          console.error('获取汤面数据失败:', error);
          // 加载失败时使用默认汤面
          this.setData({ 
            currentSoup: soupService.getDefaultSoup(),
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
     * 更新显示内容
     * @private
     */
    _updateDisplayContent: function() {
      const currentSoup = this.data.currentSoup;

      // 如果没有当前汤面数据，使用默认汤面
      if (!currentSoup) {
        // 使用默认汤面
        this.setData({
          currentSoup: soupService.getDefaultSoup()
        });
        return; // 触发currentSoup的observer会再次调用此方法
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
    _showCompleteContent: function() {
      if (!this.data.currentSoup) return;
      
      if (this.typeAnimator) {
        // 使用 nextTick 避免递归更新
        wx.nextTick(() => {
          this.typeAnimator.showComplete({
            title: this.data.title,
            contentLines: this.data.contentLines
          });
        });
      }
    },

    /**
     * 设置当前汤面
     * @param {Object} soup 汤面数据对象
     */
    setCurrentSoup: function(soup) {
      // 设置数据前先停止加载状态
      this.setData({ 
        loading: false,
        currentSoup: soup 
      }, () => {
        // 在数据更新完成后执行动画相关操作
        if (this.data.staticMode) {
          this._showCompleteContent();
        } else if (this.data.autoPlay) {
          this.resetAnimation();
          this.startAnimation();
        }
      });
      
      return true;
    },

    /**
     * 清除当前汤面，使用默认汤面
     */
    clearCurrentSoup: function() {
      this.setData({
        currentSoup: soupService.getDefaultSoup()
      });
      return true;
    },

    /**
     * 更新默认汤面
     * @param {Object} soup 默认汤面数据
     */
    updateDefaultSoup: function(soup) {
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
    getSoupData: function() {
      return {
        soupId: this.data.soupId,
        title: this.data.title,
        contentLines: this.data.contentLines
      };
    },

    /**
     * 获取当前动画配置
     * @returns {Object} 动画配置
     */
    getAnimationConfig: function() {
      return this.typeAnimator ? this.typeAnimator.getConfig() : null;
    },

    /**
     * 动画控制方法
     */
    startAnimation: function() {
      if (this.data.isAnimating || this.data.staticMode) return;
      
      if (this.typeAnimator) {
        this.typeAnimator.start({
          title: this.data.title,
          contentLines: this.data.contentLines
        });
      }
    },

    pauseAnimation: function() {
      if (this.typeAnimator) {
        this.typeAnimator.pause();
      }
      this.triggerEvent('animationPause');
    },

    resetAnimation: function() {
      if (this.typeAnimator) {
        this.typeAnimator.reset();
      }
      this.triggerEvent('animationReset');
    }
  }
});