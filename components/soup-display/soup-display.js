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
      value: null
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
        fields: ['soupData', 'isLoading']
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
    'loading': function(loading) {
      if (this._isAttached) {
        // 通知页面组件加载状态变化
        this.triggerEvent('loading', { loading: loading });

        // 更新加载状态，呼吸模糊效果将通过WXML中的类绑定自动应用
        this.setData({ isLoading: loading });
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
      wx.loadFontFace({
        family: 'Huiwen-mincho',
        source: 'url("https://juhe-001.oss-cn-hangzhou.aliyuncs.com/hwmct.ttf")',
        success: (res) => {
          console.log('字体加载成功', res);
        },
        fail: (err) => {
          console.error('字体加载失败', err);
        },
        complete: () => {
          console.log('字体加载完成');
        }
      });
    }
  }
});
