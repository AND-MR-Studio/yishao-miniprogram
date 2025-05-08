// components/start-soup-button/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否处于加载状态
    isLoading: {
      type: Boolean,
      value: false
    },
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
    isExpanding: false,   // 是否正在执行展开动画
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 按钮点击事件
    handleTap() {
      // 如果正在加载或展开中，不处理点击
      if (this.data.isLoading || this.data.isExpanding || this.data.isPressed) {
        return;
      }

      // 设置按下状态和加载状态，显示圆形按钮和加载动画
      this.setData({
        isPressed: true,
        isLoading: true
      });

      // 触发tap事件，由父组件处理业务逻辑
      this.triggerEvent('tap');

      // 设置最大加载时间，如果超过这个时间还没有收到加载完成的通知，则自动重置按钮
      this._loadingTimeout = setTimeout(() => {
        // 如果还在加载中，自动重置按钮
        if (this.data.isLoading) {
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

    // 监听动画结束事件
    handleAnimationEnd() {
      // 如果是展开动画结束，重置状态
      if (this.data.isExpanding) {
        this.setData({
          isExpanding: false
        });
      }
    },

    // 异步setData封装，返回Promise
    _asyncSetData(data) {
      return new Promise(resolve => {
        this.setData(data, resolve);
      });
    },

    // 开始渐隐动画 - 异步处理
    async startExpandAnimation() {
      // 如果已经在执行动画，不重复执行
      if (this.data.isExpanding) return;

      // 设置展开动画状态
      await this._asyncSetData({
        isExpanding: true
      });

      // 延迟重置展开状态，确保动画有时间执行
      setTimeout(() => {
        this.setData({
          isExpanding: false
        });
      }, 300);
    },

    // 设置加载完成状态（由父组件调用） - 异步处理
    async setLoadingComplete(success = true) {
      // 如果当前没有在加载中，则不处理
      if (!this.data.isLoading) return;

      // 清除加载超时计时器
      if (this._loadingTimeout) {
        clearTimeout(this._loadingTimeout);
        this._loadingTimeout = null;
      }

      // 使用异步设置加载状态为完成
      await this._asyncSetData({
        isLoading: false
      });

      if (success) {
        // 成功时，开始展开动画，完成跳转
        this.startExpandAnimation();
      } else {
        // 失败时，恢复按钮到原始状态
        await this.resetButton();
      }
    },

    // 重置按钮到原始状态 - 异步处理
    async resetButton() {
      // 清除所有计时器
      if (this._loadingTimeout) {
        clearTimeout(this._loadingTimeout);
        this._loadingTimeout = null;
      }

      // 重置按钮状态
      await this._asyncSetData({
        isPressed: false,
        isLoading: false,
        isExpanding: false
      });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 初始化
    },

    detached() {
      // 清除所有计时器，避免内存泄漏
      if (this._loadingTimeout) {
        clearTimeout(this._loadingTimeout);
        this._loadingTimeout = null;
      }
    }
  }
})
