// components/banner-swiper/banner-swiper.js
const {assets } = require('../../config/assets');

Component({  /**
   * 组件的属性列表
   */
  properties: {
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
    }
  },

  /**
   * 组件的初始数据
   */  data: {
    loading: true,    // banner数据数组
    banners: [],
    // 默认banner数据，当后端数据加载失败时显示
    defaultBanners: [
      {
        id: 'default-1',
        title: '一勺推理社更新日志',
        subtitle: '一勺侦探，前来干饭…不对，探案！',
        imageUrl: '',
        bgColor: ''
      },
      {
        id: 'default-2',
        title: '侦探社社员招募中',
        subtitle: '加入我们，解锁更多谜题',
        imageUrl: '',
        bgColor: 'banner-purple'
      },
      {
        id: 'default-3',
        title: '挑战侦探排行榜',
        subtitle: '提升推理能力，成为顶尖侦探',
        imageUrl: '',
        bgColor: 'banner-mix'
      }
    ],
  },
  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.loadBanners();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 加载banner数据
     * @returns {Promise<void>}
     */    loadBanners() {
      try {
        this.setData({ loading: true });
          // 构造banner数据数组
        const banners = Array.from({ length: 3 }, (_, index) => ({
          id: index.toString(),
          imageUrl: assets.remote.banner.get(`${index}.jpg`)
        }));

        this.setData({
          banners,
          loading: false
        });
      } catch (error) {
        console.error('加载banner失败:', error);
        this.setData({
          banners: this.data.defaultBanners,
          loading: false
        });
      }
    },    /**
     * 处理banner点击事件
     * @param {Object} e - 事件对象
     */
    handleBannerTap(e) {
      const index = e.currentTarget.dataset.index;
      const banner = this.data.banners[index];
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
    },    /**
     * 处理图片加载错误
     * @param {Object} e - 事件对象
     */
    handleImageError(e) {
      console.error('Banner image load failed:', e);
      // 直接使用默认的文字banner内容
      this.setData({
        banners: this.data.defaultBanners
      });
    },

    /**
     * 处理图片加载成功
     */
    handleImageLoad() {
      // 图片加载成功，无需特殊处理
    }
  }
})
