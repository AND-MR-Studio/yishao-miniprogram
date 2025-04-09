// components/soup-truth/soup-truth.js
const soupService = require('../../utils/soupService');

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
    // 静态模式(直接显示完整内容)
    staticMode: {
      type: Boolean,
      value: true
    }
  },

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
    'soupId': function(soupId) {
      if (soupId) {
        this.loadSoupData();
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentSoup: null,
    title: '',
    truth: '',
    loading: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 只有当父组件没有传入soupId时，组件才自动加载数据
      if (!this.properties.soupId) {
        this.loadSoupData();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 从后台加载汤面数据
     */
    loadSoupData() {
      this.setData({ loading: true });
      this.triggerEvent('loadStart');

      // 获取目标汤面ID，优先使用properties中的soupId
      let targetSoupId = this.properties.soupId || this.data.soupId || '';
      
      // 如果没有指定soupId，则使用下一个soupId
      if (!targetSoupId) {
        targetSoupId = this._getNextSoupId();
      }

      soupService.getSoupData({
        soupId: targetSoupId,
        success: (soupData) => {
          this.setData({
            currentSoup: soupData,
            title: soupData.title,
            truth: soupData.truth || '汤底未知',
            loading: false,
            soupId: soupData.soupId || '' // 更新组件的soupId属性
          });

          this.triggerEvent('loadSuccess', { soupData });
        },
        fail: (error) => {
          // 加载失败时使用第一个汤面
          const defaultSoup = soupService.soups[0];
          this.setData({ 
            currentSoup: defaultSoup,
            title: defaultSoup.title,
            truth: defaultSoup.truth || '汤底未知',
            soupId: defaultSoup.soupId || '', // 更新组件的soupId属性
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
      const currentId = this.properties.soupId || this.data.soupId || '';
      
      // 使用 soupService 的 getNextSoupId 方法获取下一个汤面ID
      const nextId = soupService.getNextSoupId(currentId);
      
      // 如果获取失败或获取到的是当前ID，返回第一个汤面ID
      if (!nextId || nextId === currentId) {
        return soupService.soups[0]?.soupId || '';
      }
      
      return nextId;
    },

    /**
     * 设置当前汤面 - 父组件通过这个方法传递数据
     * @param {Object} soup 汤面数据对象
     * @returns {boolean} 是否设置成功
     */
    setCurrentSoup(soup) {
      if (!soup?.title) return false;
      
      this.setData({ 
        loading: false,
        currentSoup: soup,
        title: soup.title,
        truth: soup.truth || '汤底未知',
        soupId: soup.soupId || ''
      });
      
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
        truth: this.data.truth
      };
    }
  }
});