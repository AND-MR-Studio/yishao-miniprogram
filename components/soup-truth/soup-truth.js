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
        console.log('soup-truth观察到soupId变化且未加载数据:', soupId);
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
    loading: false,
    isLoading: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      console.log('soup-truth组件已挂载');
      this.hasLoadedData = false; // 初始化加载标记
      
      // 只有当父组件没有传入soupId时，组件才自动加载数据
      if (!this.properties.soupId) {
        this.hasLoadedData = true; // 标记为已尝试加载
        this.loadSoupData();
      } else {
        console.log('soup-truth等待父组件设置数据');
      }
    },
    
    ready() {
      console.log('soup-truth组件已就绪，当前状态:', this.data);
      
      // 如果组件已挂载但未加载数据，尝试加载
      if (!this.data.title && !this.data.truth && this.properties.soupId) {
        console.log('ready时发现数据为空，重新加载:', this.properties.soupId);
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
      // 防止重复加载
      if (this.isLoading) {
        console.log('soup-truth已在加载中，忽略重复调用');
        return;
      }
      
      this.isLoading = true;
      console.log('soup-truth开始加载数据, soupId:', this.properties.soupId);
      this.setData({ loading: true });

      // 获取目标汤面ID，优先使用properties中的soupId
      let targetSoupId = this.properties.soupId || this.data.soupId || '';
      
      // 如果没有指定soupId，则使用第一个汤面ID
      if (!targetSoupId) {
        targetSoupId = soupService.soups[0]?.soupId || '';
        console.log('未指定soupId，使用默认ID:', targetSoupId);
      }
      
      if (!targetSoupId) {
        console.error('无法获取有效的soupId');
        this.setData({ loading: false });
        this.isLoading = false;
        return;
      }

      // 直接尝试获取汤面数据
      console.log('直接从soupService获取数据:', targetSoupId);
      const soupData = soupService.getSoupById(targetSoupId);
      
      if (soupData) {
        console.log('soup-truth直接获取数据成功:', soupData);
        this.setData({
          currentSoup: soupData,
          title: soupData.title || '未知标题',
          truth: soupData.truth || '汤底未知',
          loading: false,
          soupId: soupData.soupId || ''
        });
        this.isLoading = false;
        return;
      }
      
      // 如果直接获取失败，使用异步方法
      soupService.getSoupData({
        soupId: targetSoupId,
        success: (soupData) => {
          console.log('soup-truth异步加载成功:', soupData);
          if (!soupData) {
            console.error('soupData为空');
            this.setData({ loading: false });
            this.isLoading = false;
            return;
          }
          
          this.setData({
            currentSoup: soupData,
            title: soupData.title || '未知标题',
            truth: soupData.truth || '汤底未知',
            loading: false,
            soupId: soupData.soupId || ''
          });
          this.isLoading = false;
        },
        fail: (error) => {
          console.error('soup-truth加载失败:', error);
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
          this.isLoading = false;
        },
        complete: () => {
          // 确保loading关闭
          this.setData({ loading: false });
          this.isLoading = false;
        }
      });
    },

    /**
     * 设置当前汤面 - 父组件通过这个方法传递数据
     * @param {Object} soup 汤面数据对象
     * @returns {boolean} 是否设置成功
     */
    setCurrentSoup(soup) {
      if (!soup) {
        console.error('setCurrentSoup收到空数据');
        return false;
      }
      
      console.log('soup-truth收到setCurrentSoup调用，数据:', soup);
      
      // 标记为已加载数据，防止观察者再次触发加载
      this.hasLoadedData = true;
      
      // 直接设置数据，不使用nextTick
      this.setData({ 
        loading: false,
        currentSoup: soup,
        title: soup.title || '未知标题',
        truth: soup.truth || '汤底未知',
        soupId: soup.soupId || ''
      });
      
      console.log('soup-truth设置完成，当前数据:', this.data);
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