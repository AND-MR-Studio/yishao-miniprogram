// components/banner-swiper/banner-swiper.js
const { requestOpen, api } = require('../../config/api');

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
    // banner数据，默认为空数组
    banners: [],
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
    // 简单缓存
    bannerCache: {
      timestamp: 0 // 缓存时间戳
    },
    // 缓存有效期（毫秒）
    cacheExpire: 10 * 60 * 1000 // 10分钟
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
          banners: this.data.defaultBanners,
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
        const page = this.properties.page;
        const now = Date.now();

        // 如果缓存有效且不强制刷新，直接使用缓存
        if (!forceRefresh &&
            this.data.bannerCache[page] &&
            (now - this.data.bannerCache.timestamp < this.data.cacheExpire)) {
          this.setData({
            banners: this.data.bannerCache[page],
            loading: false
          });
          return;
        }

        // 从服务器获取banner数据
        const res = await requestOpen({
          url: `${api.asset.byType}banner?page=${page}`,
          method: 'GET'
        });

        if (res.success && res.data) {
          // 后端已经筛选和格式化了banner数据
          const banners = Array.isArray(res.data) ? res.data : [];

          // 后端已经处理了URL转换，无需在前端再次处理

          // 更新缓存
          const bannerCache = this.data.bannerCache;
          bannerCache[page] = banners;
          bannerCache.timestamp = now;

          this.setData({
            bannerCache: bannerCache,
            banners: banners.length > 0 ? banners : this.data.defaultBanners,
            loading: false
          });
        } else {
          console.error('获取banner数据失败:', res.error || '未知错误');
          // 使用默认数据
          this.setData({
            banners: this.data.defaultBanners,
            loading: false
          });
        }
      } catch (error) {
        console.error('获取banner数据出错:', error);

        // 如果请求失败但有缓存，返回缓存
        const page = this.properties.page;
        if (this.data.bannerCache[page]) {
          // 使用缓存的banner数据，后端已经处理了URL转换
          const cachedBanners = [...this.data.bannerCache[page]];

          this.setData({
            banners: cachedBanners,
            loading: false
          });
          return;
        }

        // 使用默认数据
        this.setData({
          banners: this.data.defaultBanners,
          loading: false
        });
      }
    },

    /**
     * 处理banner点击事件
     * @param {Object} e - 事件对象
     */
    handleBannerTap(e) {
      const index = e.currentTarget.dataset.index;
      const banner = this.data.banners[index];

      // 处理banner点击逻辑
      if (banner && banner.linkUrl) {
        if (banner.linkUrl.startsWith('/pages/')) {
          // 内部页面链接
          wx.navigateTo({
            url: banner.linkUrl,
            fail: (err) => {
              console.error('页面跳转失败:', err);
              wx.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
            }
          });
        } else if (banner.linkUrl.startsWith('http')) {
          // 外部网页链接
          wx.navigateTo({
            url: `/pages/webview/webview?url=${encodeURIComponent(banner.linkUrl)}`,
            fail: (err) => {
              console.error('打开网页失败:', err);
              wx.showToast({
                title: '打开网页失败',
                icon: 'none'
              });
            }
          });
        }
      }

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
        banner: this.data.banners[current]
      });
    },

    /**
     * 处理图片加载错误
     * @param {Object} e - 事件对象
     */
    handleImageError(e) {
      const index = e.currentTarget.dataset.index;

      // 创建一个新的数组，避免直接修改原数组
      const updatedBanners = [...this.data.banners];

      // 清空图片URL，这样会触发WXML中的条件，显示文字banner
      updatedBanners[index].imageUrl = '';

      // 更新数据
      this.setData({
        banners: updatedBanners
      });
    },

    /**
     * 处理图片加载成功
     */
    handleImageLoad() {
      // 图片加载成功，无需特殊处理
    },

    /**
     * 清除banner缓存
     */
    clearBannerCache() {
      this.setData({
        bannerCache: {
          timestamp: 0
        }
      });
    }
  }
})
