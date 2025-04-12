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
      // 只有当soupId有值且组件未加载数据时才触发加载
      if (soupId && !this.data.title && !this.data.truth && !this.hasLoadedData) {
        this.hasLoadedData = true; // 标记为已尝试加载
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
      this.hasLoadedData = false; // 初始化加载标记
      this._isLoading = false;
      
      // 只有当父组件没有传入soupId时，组件才自动加载数据
      if (!this.properties.soupId) {
        this.hasLoadedData = true; // 标记为已尝试加载
        this.loadSoupData();
      }
    },
    
    ready() {
      // 如果组件已挂载但未加载数据，尝试加载
      if (!this.data.title && !this.data.truth && this.properties.soupId) {
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
     * @returns {Promise} 加载完成的Promise
     */
    async loadSoupData() {
      // 防止重复加载
      if (this._isLoading) {
        return;
      }
      
      this._isLoading = true;
      this.setData({ loading: true });

      try {
        // 获取目标汤面ID，优先使用properties中的soupId
        let targetSoupId = this.properties.soupId || this.data.soupId || '';
        
        // 如果没有指定soupId，则使用第一个汤面ID
        if (!targetSoupId) {
          targetSoupId = soupService.soups[0]?.soupId || '';
        }
        
        if (!targetSoupId) {
          throw new Error('无法获取有效的soupId');
        }

        // 尝试直接获取汤面数据
        let soupData = soupService.getSoupById(targetSoupId);
        
        // 如果直接获取失败，使用异步方法
        if (!soupData) {
          soupData = await soupService.getSoupDataAsync(targetSoupId);
        }
        
        if (!soupData) {
          throw new Error('获取汤面数据失败');
        }
        
        this.setData({
          currentSoup: soupData,
          title: soupData.title || '未知标题',
          truth: soupData.truth || '汤底未知',
          loading: false,
          soupId: soupData.soupId || ''
        });
        
        return soupData;
      } catch (error) {
        // 加载失败时使用第一个汤面
        const defaultSoup = soupService.soups[0];
        if (defaultSoup) {
          this.setData({ 
            currentSoup: defaultSoup,
            title: defaultSoup.title || '未知标题',
            truth: defaultSoup.truth || '汤底未知',
            soupId: defaultSoup.soupId || '',
            loading: false 
          });
        } else {
          // 实在没有数据，显示默认信息
          this.setData({
            title: '未知标题',
            truth: '汤底未知',
            loading: false
          });
        }
        return null;
      } finally {
        this.setData({ loading: false });
        this._isLoading = false;
      }
    },

    /**
     * 设置当前汤面 - 父组件通过这个方法传递数据
     * @param {Object} soup 汤面数据对象
     * @returns {boolean} 是否设置成功
     */
    setCurrentSoup(soup) {
      if (!soup) {
        return false;
      }
      
      // 标记为已加载数据，防止观察者再次触发加载
      this.hasLoadedData = true;
      
      this.setData({ 
        loading: false,
        currentSoup: soup,
        title: soup.title || '未知标题',
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