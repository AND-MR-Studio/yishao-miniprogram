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
      if (newSoupId && newSoupId !== this.data.currentSoupId) {
        this.data.currentSoupId = newSoupId;
        if (this._isAttached && !this._isLoading) {
          this.loadSoupData();
        }
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

  data: {
    currentSoup: null,
    currentSoupId: '',
    displayLines: [],
    isAnimating: false,
    loading: false
  },

  lifetimes: {
    attached() {
      this._isLoading = false;
      this._isAttached = true;
      this._initTypeAnimator();

      const initialSoupId = this.properties.soupId;
      if (initialSoupId) {
        this.data.currentSoupId = initialSoupId;
      }

      wx.nextTick(() => {
        if (!this.data.currentSoup && this._isAttached) {
          this.loadSoupData();
        }
      });
    },

    ready() {
      if (this.data.staticMode && this.data.currentSoup) {
        this._showCompleteContent();
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

    async loadSoupData() {
      if (!this._isAttached || this._isLoading) return;

      this._isLoading = true;
      this.setData({ loading: true });
      this.triggerEvent('loadStart');

      try {
        let targetSoupId = this.data.currentSoupId || this.properties.soupId || '';

        // 只在ID列表未加载时加载，不再每次都刷新
        if (!soupService.isIdsLoaded) {
          await soupService.loadSoupIds();
        }

        // 使用异步方法获取汤面数据
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

        this.setData({
          currentSoup: soupData,
          currentSoupId: soupData.soupId || soupData.id || '',
          loading: false
        });

        this.triggerEvent('loadSuccess', { soupData });

        if (this.data.staticMode) {
          this._showCompleteContent();
        } else if (this.data.autoPlay) {
          this.resetAnimation();
          this.startAnimation();
        }
      } catch (error) {
        console.error('加载汤面失败:', error);
        this.setData({ loading: false });
        this.triggerEvent('loadFail', { error });
      } finally {
        this._isLoading = false;
        this.triggerEvent('loadComplete');
      }
    },

    _showCompleteContent() {
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
    }
  }
});