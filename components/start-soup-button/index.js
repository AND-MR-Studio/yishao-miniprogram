// components/start-soup-button/index.js
// 引入MobX store和绑定工具
const { store } = require('../../stores/soupStore');
const { createStoreBindings } = require('mobx-miniprogram-bindings');
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮文本
    text: {
      type: String,
      value: '开始喝汤'
    },
    // 按钮宽度
    width: {
      type: String,
      value: '50%'
    },
    // 按钮高度
    height: {
      type: String,
      value: '80rpx'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isPressed: false,     // 是否处于按下状态
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 按钮点击事件
    handleTap() {
      // 如果正在加载或已按下，不处理点击
      // 使用MobX中的isLoading状态
      if (this.data.isLoading || this.isLoading || this.data.isPressed) {
        return;
      }

      // 设置按下状态，显示圆形按钮和加载动画
      this.setData({
        isPressed: true
      });

      // 触发tap事件，由父组件处理业务逻辑
      this.triggerEvent('tap');

      // 设置最大加载时间，如果超过这个时间还没有收到加载完成的通知，则自动重置按钮
      this._loadingTimeout = setTimeout(() => {
        // 如果还在加载中，自动重置按钮
        if (this.isLoading) {
          // 重置按钮到原始状态
          this.resetButton();

          // 显示超时提示
          wx.showToast({
            title: '加载超时，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      }, 5000); // 最大等待5秒
    },

    // 异步setData封装，返回Promise
    _asyncSetData(data) {
      return new Promise(resolve => {
        this.setData(data, resolve);
      });
    },

    // 设置加载完成状态（由父组件调用） - 异步处理
    async setLoadingComplete() {
      // 如果当前没有在加载中，则不处理
      // 使用MobX中的isLoading状态
      if (!this.isLoading && !this.data.isPressed) return;

      // 清除加载超时计时器
      if (this._loadingTimeout) {
        clearTimeout(this._loadingTimeout);
        this._loadingTimeout = null;
      }

      // 无论成功与否，都重置按钮状态
      await this.resetButton();
    },

    // 重置按钮到原始状态 - 异步处理
    async resetButton() {
      // 清除所有计时器
      if (this._loadingTimeout) {
        clearTimeout(this._loadingTimeout);
        this._loadingTimeout = null;
      }

      // 重置按钮状态 - 不再设置isLoading，由MobX管理
      await this._asyncSetData({
        isPressed: false
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 创建MobX Store绑定
      this.storeBindings = createStoreBindings(this, {
        store: store,
        fields: ['isLoading', 'isViewing', 'soupState'],
      });
    },

    detached() {
      // 清除所有计时器，避免内存泄漏
      if (this._loadingTimeout) {
        clearTimeout(this._loadingTimeout);
        this._loadingTimeout = null;
      }

      // 清理MobX绑定
      if (this.storeBindings) {
        this.storeBindings.destroyStoreBindings();
      }
    }
  }
})
