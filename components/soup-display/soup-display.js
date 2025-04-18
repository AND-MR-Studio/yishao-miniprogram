// components/soup-display/soup-display.js
const soupService = require('../../utils/soupService');
const typeAnimation = require('../../utils/typeAnimation');

Component({
  properties: {
    soupId: {
      type: String,
      value: ''
    },
    autoPlay: {
      type: Boolean,
      value: true
    },
    typeSpeed: {
      type: Number,
      value: 60
    },
    staticMode: {
      type: Boolean,
      value: false
    },
    isPeeking: {
      type: Boolean,
      value: false
    }
  },

  options: {
    styleIsolation: 'shared',
    addGlobalClass: true
  },

  observers: {
    'soupId'(newSoupId) {
      // 确保 newSoupId 不为 null 或 undefined
      newSoupId = newSoupId || '';

      if (newSoupId && newSoupId !== this.getCurrentSoupId()) {
        if (this._isAttached && !this._isLoading) {
          this.loadSoupData(newSoupId);
        }
      }
    },
    'staticMode'(staticMode) {
      if (!this.data.currentSoup) return;

      if (staticMode) {
        this.showCompleteContent();
      } else if (this.data.autoPlay) {
        this.resetAnimation();
        this.startAnimation();
      }
    }
  },

  data: {
    currentSoup: null,
    displayLines: [],
    isAnimating: false,
    loading: false
  },

  lifetimes: {
    attached() {
      this._isLoading = false;
      this._isAttached = true;
      this._initTypeAnimator();

      // 如果有初始汤面ID，加载数据
      const initialSoupId = this.properties.soupId;
      if (initialSoupId) {
        wx.nextTick(() => {
          if (this._isAttached && !this.data.currentSoup) {
            this.loadSoupData(initialSoupId);
          }
        });
      }
    },

    ready() {
      if (this.data.staticMode && this.data.currentSoup) {
        this.showCompleteContent();
      }
    },

    detached() {
      this._isAttached = false;
      if (this.typeAnimator) {
        this.typeAnimator.destroy();
        this.typeAnimator = null;
      }
    }
  },

  methods: {
    _initTypeAnimator() {
      this.typeAnimator = typeAnimation.createInstance(this, {
        typeSpeed: this.data.typeSpeed,
        onAnimationComplete: () => this.triggerEvent('animationComplete'),
        formatContent: (content) => this._formatSoupContent(content)
      });
    },

    _formatSoupContent(soup) {
      if (!soup) return [];

      const lines = [];
      if (soup.title) {
        lines.push(soup.title);
      }

      if (soup.contentLines && Array.isArray(soup.contentLines)) {
        lines.push(...soup.contentLines.map(line => String(line)));
      }
      else if (soup.content) {
        if (typeof soup.content === 'string') {
          lines.push(...soup.content.split(/\r?\n/));
        } else if (Array.isArray(soup.content)) {
          lines.push(...soup.content.map(line => String(line)));
        }
      }

      return lines;
    },

    /**
     * 获取当前汤面ID
     * @returns {string} 当前汤面ID
     */
    getCurrentSoupId() {
      // 从当前汤面数据中获取ID
      if (this.data.currentSoup) {
        return this.data.currentSoup.soupId || this.data.currentSoup.id || '';
      }
      // 如果没有当前汤面数据，使用属性中的soupId
      const propSoupId = this.properties.soupId;
      return (propSoupId === null || propSoupId === undefined) ? '' : propSoupId;
    },

    /**
     * 加载汤面数据
     * 根据指定的soupId加载汤面数据
     * @param {string} soupId 汤面ID，如果不指定则使用当前汤面ID或属性中的soupId
     */
    async loadSoupData(soupId) {
      if (!this._isAttached || this._isLoading) return;

      this._isLoading = true;
      this.setData({ loading: true });
      this.triggerEvent('loadStart');

      try {
        // 确保 targetSoupId 不为 null 或 undefined
        let targetSoupId = '';
        if (soupId) {
          targetSoupId = soupId;
        } else {
          targetSoupId = this.getCurrentSoupId() || '';
        }

        // 只在ID列表未加载时加载
        if (!soupService.isIdsLoaded) {
          await soupService.loadSoupIds();
        }

        // 获取汤面数据
        let soupData = null;
        if (targetSoupId) {
          soupData = await soupService.getSoupById(targetSoupId);
        }

        // 如果没有找到指定ID的汤面，获取随机汤面
        if (!soupData) {
          soupData = await soupService.getRandomSoup();
        }

        // 如果仍然没有数据，显示错误
        if (!soupData) {
          throw new Error('无法获取有效的汤面数据');
        }

        // 使用公开方法更新汤面数据
        this.updateSoupData(soupData, !this.data.autoPlay);
      } catch (error) {
        console.error('加载汤面失败:', error);
        this.setData({ loading: false });
        this.triggerEvent('loadFail', { error });
      } finally {
        this._isLoading = false;
        this.triggerEvent('loadComplete');
      }
    },

    /**
     * 显示完整内容，跳过打字机动画
     * 公开方法，可以从外部调用
     */
    showCompleteContent() {
      if (!this.data.currentSoup || !this.typeAnimator) return;
      this.typeAnimator.showComplete(this.data.currentSoup);
    },

    startAnimation() {
      if (this.data.isAnimating || this.data.staticMode || !this.typeAnimator) return;
      return this.typeAnimator.start(this.data.currentSoup);
    },

    pauseAnimation() {
      if (this.typeAnimator) {
        this.typeAnimator.pause();
      }
    },

    resetAnimation() {
      if (this.typeAnimator) {
        this.typeAnimator.reset();
      }
    },

    /**
     * 更新汤面数据
     * 公开方法，用于从外部直接更新汤面数据
     * @param {Object} soupData 汤面数据
     * @param {boolean} showComplete 是否显示完整内容，默认为true
     */
    updateSoupData(soupData, showComplete = true) {
      if (!soupData) return;

      this.setData({
        currentSoup: soupData,
        loading: false
      });

      this.triggerEvent('loadSuccess', { soupData });

      if (showComplete || this.data.staticMode) {
        this.showCompleteContent();
      } else if (this.data.autoPlay) {
        this.resetAnimation();
        this.startAnimation();
      }
    }
  }
});