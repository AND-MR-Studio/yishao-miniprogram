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
    soupId: '',
    displayLines: [],
    currentLineIndex: 0,
    isAnimating: false,
    loading: false
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
        onAnimationComplete: () => this.triggerEvent('animationComplete'),
        formatContent: (content) => this._formatSoupContent(content)
      });
    },

    /**
     * 格式化汤面内容，确保标题正确显示
     * @private
     * @param {Object} soup 汤面数据对象
     * @returns {Array} 格式化后的文本行数组
     */
    _formatSoupContent(soup) {
      if (!soup) return [];
      
      const lines = [];
      
      // 添加标题作为第一行
      if (soup.title) {
        lines.push(soup.title);
      }
      
      // 首先尝试使用contentLines字段（主要内容）
      if (soup.contentLines && Array.isArray(soup.contentLines)) {
        lines.push(...soup.contentLines.map(line => String(line)));
      }
      // 如果没有contentLines，再尝试使用content字段
      else if (soup.content) {
        if (typeof soup.content === 'string') {
          // 字符串按换行符分割
          const contentLines = soup.content.split(/\r?\n/);
          lines.push(...contentLines);
        } else if (Array.isArray(soup.content)) {
          // 数组直接合并
          lines.push(...soup.content.map(line => String(line)));
        }
      }
      
      return lines;
    },

    /**
     * 从后台加载汤面数据
     * @returns {Promise} 数据加载的Promise
     */
    async loadSoupData() {
      // 防止重复加载
      if (this._isLoadingData) {
        console.log('正在加载中，忽略重复调用');
        return Promise.resolve();
      }
      
      this._isLoadingData = true;
      this.setData({ loading: true });
      this.triggerEvent('loadStart');

      try {
        // 获取目标汤面ID，优先使用properties中的soupId
        let targetSoupId = this.properties.soupId || this.data.soupId || '';
        
        // 如果没有指定soupId，则使用下一个soupId
        if (!targetSoupId) {
          targetSoupId = this._getNextSoupId();
        }

        // 如果还是没有targetSoupId，先刷新数据
        if (!targetSoupId && !soupService.isDataLoaded) {
          await soupService.refreshSoupsAsync();
          targetSoupId = targetSoupId || soupService.soups[0]?.soupId;
        }

        return await this._loadSoupWithId(targetSoupId);
      } catch (error) {
        console.error('加载汤面数据过程中出错:', error);
        this.setData({ loading: false });
        this._isLoadingData = false;
        this.triggerEvent('loadFail', { error });
        return Promise.reject(error);
      }
    },

    /**
     * 使用指定ID加载汤面
     * @private
     * @param {string} soupId 汤面ID
     * @returns {Promise} 加载完成的Promise
     */
    async _loadSoupWithId(soupId) {
      try {
        const soupData = await soupService.getSoupDataAsync(soupId);
        
        if (!soupData) {
          this.setData({ loading: false });
          this._isLoadingData = false;
          this.triggerEvent('loadFail', { error: '获取到的汤面数据为空' });
          return null;
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
          await this.startAnimation();
        }
        
        return soupData;
      } catch (error) {
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
        return null;
      } finally {
        this.triggerEvent('loadComplete');
        
        // 重置加载标记
        setTimeout(() => {
          this._isLoadingData = false;
        }, 100);
      }
    },

    /**
     * 获取下一个汤面ID
     * @private
     * @returns {String} 下一个汤面ID
     */
    _getNextSoupId() {
      const currentId = this.properties.soupId || this.data.soupId || '';
      
      // 如果数据未加载，先返回空
      if (!soupService.isDataLoaded) {
        return '';
      }
      
      // 使用 soupService 的 getNextSoupId 方法获取下一个汤面ID
      const nextId = soupService.getNextSoupId(currentId);
      
      // 如果获取失败，返回第一个汤面ID
      if (!nextId) {
        return soupService.soups[0]?.soupId || '';
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

      // 只更新soupId，其他内容由打字机自动处理
      this.setData({
        soupId: currentSoup.soupId || ''
      });

      // 触发内容变化事件
      this.triggerEvent('contentChange', {
        soupId: this.data.soupId,
        soupData: currentSoup
      });
    },

    /**
     * 显示完整内容（静态模式）
     * @private
     */
    _showCompleteContent() {
      if (!this.data.currentSoup || !this.typeAnimator) return;
      
      wx.nextTick(() => {
        // 直接传入整个汤面对象
        this.typeAnimator.showComplete(this.data.currentSoup);
      });
    },

    /**
     * 设置当前汤面 - 父组件通过这个方法传递数据
     * @param {Object} soup 汤面数据对象
     * @returns {boolean} 是否设置成功
     */
    setCurrentSoup(soup) {
      if (!soup) return false;
      
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
      return this.data.currentSoup;
    },

    /**
     * 动画控制方法 - 开始动画
     * @returns {Promise} 动画完成后解析的Promise
     */
    async startAnimation() {
      if (this.data.isAnimating || this.data.staticMode || !this.typeAnimator) {
        return Promise.resolve();
      }
      
      // 直接传入整个汤面对象
      return this.typeAnimator.start(this.data.currentSoup);
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