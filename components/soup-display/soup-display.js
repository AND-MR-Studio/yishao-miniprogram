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
    'typeSpeed'(typeSpeed) {
      if (this.typeAnimator) {
        this.typeAnimator.updateSpeed(typeSpeed);
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
    loading: false,
    // 固定使用发光效果
    typeEffect: 'glow'
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 添加防止循环调用的标记
      this._isLoadingData = false;
      
      this._initTypeAnimator();
      
      // 只有当父组件没有传入soupId时，组件才自动加载数据
      // 如果父组件传入了soupId，等待父组件通过setCurrentSoup方法设置数据
      if (!this.properties.soupId) {
        this.loadSoupData();
      }
      
      // 如果是静态模式且已有汤面数据，直接显示完整内容
      if (this.data.staticMode && this.data.currentSoup) {
        this._showCompleteContent();
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
        // 固定使用发光效果
        typeEffect: 'glow',
        onAnimationStart: () => this.triggerEvent('animationStart'),
        onAnimationComplete: () => this.triggerEvent('animationComplete')
      });
    },

    /**
     * 从后台加载汤面数据
     */
    loadSoupData() {
      // 防止重复加载
      if (this._isLoadingData) {
        console.log('正在加载中，忽略重复调用');
        return;
      }
      
      this._isLoadingData = true;
      console.log('开始加载汤面数据');
      this.setData({ loading: true });
      this.triggerEvent('loadStart');

      // 获取目标汤面ID，优先使用properties中的soupId
      let targetSoupId = this.properties.soupId || this.data.soupId || '';
      console.log('目标汤面ID:', targetSoupId);
      
      // 如果没有指定soupId，则使用下一个soupId
      if (!targetSoupId) {
        targetSoupId = this._getNextSoupId();
        console.log('未指定ID，使用下一个ID:', targetSoupId);
      }

      // 如果还是没有targetSoupId，先刷新数据
      if (!targetSoupId && !soupService.isDataLoaded) {
        console.log('无可用ID且数据未加载，先刷新数据');
        soupService.refreshSoups(() => {
          this._loadSoupWithId(targetSoupId || soupService.soups[0]?.soupId);
        });
        return;
      }

      this._loadSoupWithId(targetSoupId);
    },

    /**
     * 使用指定ID加载汤面
     * @private
     */
    _loadSoupWithId(soupId) {
      console.log('加载指定ID的汤面:', soupId);
      soupService.getSoupData({
        soupId: soupId,
        success: (soupData) => {
          console.log('加载汤面成功:', soupData);
          if (!soupData) {
            console.warn('获取到的汤面数据为空');
            this.setData({ loading: false });
            this._isLoadingData = false;
            return;
          }

          this.setData({
            currentSoup: soupData,
            loading: false,
            soupId: soupData.soupId || ''
          });

          this.triggerEvent('loadSuccess', { soupData });

          if (this.data.staticMode) {
            this._showCompleteContent();
          } else if (this.data.autoPlay) {
            this.resetAnimation();
            this.startAnimation();
          }
          
          // 重置加载标记
          setTimeout(() => {
            this._isLoadingData = false;
          }, 100);
        },
        fail: (error) => {
          console.error('加载汤面失败:', error);
          // 加载失败时使用第一个汤面
          const defaultSoup = soupService.soups[0];
          if (defaultSoup) {
            this.setData({ 
              currentSoup: defaultSoup,
              soupId: defaultSoup.soupId || '',
              loading: false 
            });
          } else {
            this.setData({ loading: false });
          }
          this.triggerEvent('loadFail', { error });
          this._isLoadingData = false;
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
      const currentId = this.properties.soupId || this.data.soupId || '';
      console.log('获取下一个汤面，当前ID:', currentId);
      
      // 如果数据未加载，先返回空
      if (!soupService.isDataLoaded) {
        console.log('数据未加载，返回空ID');
        return '';
      }
      
      // 使用 soupService 的 getNextSoupId 方法获取下一个汤面ID
      const nextId = soupService.getNextSoupId(currentId);
      console.log('获取到的下一个ID:', nextId);
      
      // 如果获取失败，返回第一个汤面ID
      if (!nextId) {
        const firstId = soupService.soups[0]?.soupId || '';
        console.log('获取失败，返回第一个ID:', firstId);
        return firstId;
      }
      
      return nextId;
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
     * 设置当前汤面 - 父组件通过这个方法传递数据
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