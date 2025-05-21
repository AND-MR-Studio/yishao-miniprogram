/**
 * 汤面显示组件
 * 负责汤面内容的渲染
 * 不包含交互逻辑，交互由父页面控制
 */

// 引入MobX store和绑定工具
const { soupStore } = require('../../stores/index');
const { createStoreBindings } = require('mobx-miniprogram-bindings');

Component({
  properties: {
    // 汤面数据对象
    soupData: {
      type: Object,
      value: {} // 使用空对象作为默认值，而不是null
    },

    // 是否处于偷看模式
    isPeeking: {
      type: Boolean,
      value: false
    },

    // 是否处于喝汤状态
    isDrinking: {
      type: Boolean,
      value: false
    },

    // 模糊程度（0-10px）
    blurAmount: {
      type: Number,
      value: 0
    },

    // 是否正在加载
    loading: {
      type: Boolean,
      value: false
    }
  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },

  data: {
    isLoading: false, // 加载状态，同时控制呼吸模糊效果
    mockImage: 'https://and-tech.cn/uploads/images/78e17666-0671-487e-80bc-a80c0b8d0e07.png' // 使用在线图片路径
  },

  lifetimes: {
    // 组件初始化
    attached() {
      this._isAttached = true;

      // 创建MobX Store绑定
      this.storeBindings = createStoreBindings(this, {
        store: soupStore,
        fields: ['soupData', 'soupLoading']
      });

      // 加载汇文明朝体字体
      this.loadMinchoFont();
    },

    // 组件卸载
    detached() {
      this._isAttached = false;

      // 清理MobX绑定
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
    }
  },

  // 属性变化观察者
  observers: {
    // 监听loading状态变化
    'loading, soupLoading': function(loading, soupLoading) {
      if (this._isAttached) {
        // 通知页面组件加载状态变化
        this.triggerEvent('loading', { loading: loading || soupLoading });

        // 更新加载状态，呼吸模糊效果将通过WXML中的类绑定自动应用
        // 确保在切换汤谜时保持之前的内容并显示模糊效果
        this.setData({ isLoading: loading || soupLoading });

        // 如果不再加载，确保清除模糊效果
        if (!(loading || soupLoading)) {
          this.setData({ blurAmount: 0 });
        }
      }
    }
  },

  methods: {
    // 获取当前应显示的汤面数据
    // 优先使用属性传入的数据，其次使用store中的数据
    getDisplaySoupData() {
      return this.properties.soupData || this.data.soupData;
    },

    // 加载汇文明朝体字体
    loadMinchoFont() {
      // 字体缓存的key
      const FONT_CACHE_KEY = 'huiwen_mincho_font_cache';
      let loadSuccess = false; // 用于跟踪字体是否加载成功

      try {
        // 尝试从本地缓存获取字体加载状态
        const fontCache = wx.getStorageSync(FONT_CACHE_KEY);

        // 检查缓存是否存在且状态为 success
        if (fontCache && fontCache.status === 'success') {
          console.log('使用字体缓存，无需重新加载');
          return; // 缓存有效，直接返回
        }

        // 缓存不存在或未成功，重新加载字体
        wx.loadFontFace({
          family: 'Huiwen-mincho',
          source: 'https://oss.and-tech.cn/fonts/hwmct.woff2', // 直接使用 URL，不加 url() 包装
          success: (res) => {
            console.log('字体加载成功', res);
            loadSuccess = true; // 标记字体加载成功
          },
          fail: (err) => {
            console.error('字体加载失败', err);
            loadSuccess = false; // 标记字体加载失败
          },
          complete: () => {
            console.log('字体加载完成');
            
            // 只有在字体加载成功时才保存缓存
            if (loadSuccess) {
              wx.setStorage({
                key: FONT_CACHE_KEY,
                data: {
                  timestamp: Date.now(),
                  status: 'success'
                },
                success: () => {
                  console.log('字体缓存成功保存到本地');
                },
                fail: (err) => {
                  console.error('字体缓存保存失败', err);
                }
              });
            }
          }
        });
      } catch (e) {
        console.error('字体缓存读取失败', e);
        // 发生错误时不再重复加载字体，只做错误提示
      }
    }
  }
});
