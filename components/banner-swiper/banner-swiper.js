// components/banner-swiper/banner-swiper.js
const api = require('../../utils/api');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 页面标识，用于获取特定页面的banner
    page: {
      type: String,
      value: 'mine'
    },
    // 是否自动播放
    autoplay: {
      type: Boolean,
      value: true
    },
    // 轮播间隔时间（毫秒）
    interval: {
      type: Number,
      value: 3000
    },
    // 动画持续时间（毫秒）
    duration: {
      type: Number,
      value: 500
    },
    // 是否显示指示点
    indicatorDots: {
      type: Boolean,
      value: true
    },
    // 是否循环播放
    circular: {
      type: Boolean,
      value: true
    },
    // 是否自动加载banner数据
    autoLoad: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    loading: true,
    // 默认banner数据，当后端数据加载失败时显示
    defaultBanners: [
      {
        id: 'default-1',
        title: '一勺推理社更新日志',
        subtitle: '一勺侦探，前来干饭…不对，探案！',
        imageUrl: '',
        linkUrl: '',
        bgColor: ''
      },
      {
        id: 'default-2',
        title: '侦探社社员招募中',
        subtitle: '加入我们，解锁更多谜题',
        imageUrl: '',
        linkUrl: '',
        bgColor: 'banner-purple'
      },
      {
        id: 'default-3',
        title: '挑战侦探排行榜',
        subtitle: '提升推理能力，成为顶尖侦探',
        imageUrl: '',
        linkUrl: '',
        bgColor: 'banner-mix'
      }
    ],
    // 当前显示的banner数据
    currentBanners: []
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 如果设置了自动加载，则加载banner数据
      if (this.properties.autoLoad) {
        this.loadBanners();
      } else {
        // 否则使用默认数据
        this.setData({
          currentBanners: this.data.defaultBanners,
          loading: false
        });
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 加载banner数据
     * @param {boolean} forceRefresh - 是否强制刷新
     * @returns {Promise<void>}
     */
    async loadBanners(forceRefresh = false) {
      try {
        this.setData({ loading: true });

        // 缓存键
        const cacheKey = `banners_${this.properties.page}`;

        // 如果不强制刷新，尝试从缓存获取
        if (!forceRefresh) {
          const cachedData = wx.getStorageSync(cacheKey);
          if (cachedData && cachedData.expireTime > Date.now()) {
            this.setData({
              currentBanners: cachedData.banners,
              loading: false
            });
            return;
          }
        }

        // 从后端获取banner数据
        const res = await this._requestBanners();

        if (res.success && res.data && Array.isArray(res.data)) {
          // 设置缓存，有效期1小时
          const cacheData = {
            banners: res.data,
            expireTime: Date.now() + 3600000 // 1小时后过期
          };
          wx.setStorageSync(cacheKey, cacheData);

          // 更新组件数据
          this.setData({
            currentBanners: res.data,
            loading: false
          });
        } else {
          console.error('获取banner数据失败:', res.error || '未知错误');
          // 使用默认数据
          this.setData({
            currentBanners: this.data.defaultBanners,
            loading: false
          });
        }
      } catch (error) {
        console.error('加载banner数据出错:', error);
        // 使用默认数据
        this.setData({
          currentBanners: this.data.defaultBanners,
          loading: false
        });
      }
    },

    /**
     * 请求banner数据
     * @returns {Promise<Object>} - 请求结果
     * @private
     */
    _requestBanners() {
      return new Promise((resolve, reject) => {
        wx.request({
          url: api.banner_url,
          method: 'GET',
          data: { page: this.properties.page },
          success: (res) => {
            resolve(res.data);
          },
          fail: (err) => {
            reject(err);
          }
        });
      });
    },

    /**
     * 处理banner点击事件
     * @param {Object} e - 事件对象
     */
    handleBannerTap(e) {
      const index = e.currentTarget.dataset.index;
      const banner = this.data.currentBanners[index];

      // 触发点击事件，传递banner数据
      this.triggerEvent('bannertap', { banner });
    },

    /**
     * 处理轮播切换事件
     * @param {Object} e - 事件对象
     */
    handleSwiperChange(e) {
      const { current } = e.detail;
      // 触发切换事件，传递当前索引和banner数据
      this.triggerEvent('bannerchange', {
        index: current,
        banner: this.data.currentBanners[current]
      });
    },

    /**
     * 处理图片加载错误
     * @param {Object} e - 事件对象
     */
    handleImageError(e) {
      const index = e.currentTarget.dataset.index;
      console.error('Banner图片加载失败:', this.data.currentBanners[index].imageUrl);

      // 创建一个新的数组，避免直接修改原数组
      const updatedBanners = [...this.data.currentBanners];

      // 清空图片URL，这样会触发WXML中的条件，显示文字banner
      updatedBanners[index].imageUrl = '';

      // 更新数据
      this.setData({
        currentBanners: updatedBanners
      });
    }
  }
})
