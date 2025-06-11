/**
 * 汤面显示组件
 * 负责汤面内容的渲染
 * 不包含交互逻辑，交互由父页面控制
 */

// 引入MobX store和绑定工具
const { rootStore } = require('../../stores/index');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
const { assets } = require('../../config/assets');

Component({
  // 组件属性
  properties: {
    // 模糊程度 - 从页面传入
    blurAmount: {
      type: Number,
      value: 0
    }
  },

  options: {
    styleIsolation: 'isolated',
    addGlobalClass: true
  },
  data: {
    // 配图TODO: 直接从store.soupdata获取，不再使用properties
  },

  lifetimes: {
    // 组件初始化
    attached() {
      this._isAttached = true;

      // 创建MobX Store绑定
      this.storeBindings = createStoreBindings(this, {
        store: rootStore.soupStore,
        fields: [
          'soupData',      // 汤面数据
          'soupLoading'    // 汤面加载状态
        ]
      });

      // 绑定聊天状态 - 用于判断是否处于偷看模式
      this.chatStoreBindings = createStoreBindings(this, {
        store: rootStore.chatStore,
        fields: ['isPeeking', 'chatState']
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
      if (this.chatStoreBindings) {
        this.chatStoreBindings.destroyStoreBindings();
      }
    }
  },

  // 属性变化观察者
  observers: {
    // 监听soupLoading状态变化
    'soupLoading': function(soupLoading) {
      if (this._isAttached) {
        // 通知页面组件加载状态变化
        this.triggerEvent('loading', { loading: soupLoading });
      }
    }
  },
  methods: {
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
