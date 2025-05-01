// components/button/index.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮类型，light: 点亮，unlight: 未点亮，dark: 深色按钮，switch: 开关，radio: 单选按钮，tab-switcher: 标签切换器
    type: {
      type: String,
      value: 'unlight'
    },
    // 按钮文本
    text: {
      type: String,
      value: '按钮'
    },
    // 动画类型
    animation: {
      type: String,
      value: 'none' // none, fade-in, slide-up, slide-down, slide-left, slide-right, scale-in, rotate-in, slide-up
    },
    // 动画延迟时间(秒)
    delay: {
      type: Number,
      value: 0
    },
    // 是否显示按钮
    show: {
      type: Boolean,
      value: true
    },
    // 开关标签（仅在type为switch时有效）
    label: {
      type: String,
      value: ''
    },
    // 开关状态（仅在type为switch时有效）
    checked: {
      type: Boolean,
      value: false
    },
    // 开关的数据类型（仅在type为switch时有效）
    dataType: {
      type: String,
      value: ''
    },
    // radio选中状态（仅在type为radio时有效）
    active: {
      type: Boolean,
      value: false
    },
    // radio按钮对应的值（仅在type为radio时有效）
    value: {
      type: String,
      value: ''
    },
    // radio按钮组名称（仅在type为radio时有效）
    groupName: {
      type: String,
      value: ''
    },
    // 宽度（可选，主要用于dark类型按钮）
    width: {
      type: String,
      value: 'auto'
    },
    // 高度（可选，主要用于dark类型按钮）
    height: {
      type: String,
      value: 'auto'
    },
    // 当前激活的标签（仅在type为tab-switcher时有效）
    activeTab: {
      type: String,
      value: '荒诞'
    },
    // 未解决的预制汤数量（仅在type为tab-switcher时有效）
    unsolvedCount: {
      type: Number,
      value: 0
    },
    // 是否处于偷看模式（仅在type为tab-switcher时有效）
    isPeeking: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    animationClass: '',
    animationStyle: '',
    animationData: {}, // 动画数据
    jellyAnimating: false, // 是否正在执行果冻动画
    initialized: false, // 初始化标志
    animationEnd: false,
    isLoading: false, // 是否正在加载数据
    isExpanding: false, // 是否正在执行展开动画
    isPressed: false // 是否处于按下状态
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 按钮点击事件
    handleTap() {
      // 如果正在加载或展开中，不处理点击
      if (this.data.isLoading || this.data.isExpanding) {
        return;
      }

      // 只有特定类型的按钮才执行果冻动画（不包括light和unlight类型）
      const buttonType = this.properties.type;
      if (buttonType !== 'light' && buttonType !== 'unlight') {
        // 开始果冻动画
        this.setData({
          jellyAnimating: true
        });

        // 监听动画结束并重置状态
        setTimeout(() => {
          this.setData({
            jellyAnimating: false
          });
        }, 600); // 与动画持续时间一致
      }

      // 如果是开始喝汤按钮（light类型），则直接变为圆形并开始加载
      if (buttonType === 'light' && this.properties.text === '开始喝汤') {
        // 先设置按下状态和加载状态，显示圆形按钮和加载动画
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
      }

      if (this.properties.type === 'switch') {
        const newValue = !this.data.checked;
        this.setData({
          checked: newValue
        });

        this.triggerEvent('change', {
          type: this.properties.dataType || 'switch',
          checked: newValue
        });
      } else if (this.properties.type === 'radio') {
        // 对于radio类型，如果已经是active状态，不触发事件
        if (this.properties.active) return;

        // 触发radiochange事件，传递对应的值
        this.triggerEvent('radiochange', {
          value: this.properties.value,
          groupName: this.properties.groupName
        });

        // 更新当前radio的状态为选中
        this.setData({
          active: true
        });
      } else {
        this.triggerEvent('tap');
      }
    },

    // 标签切换点击事件
    handleTabTap(e) {
      const tab = e.currentTarget.dataset.tab;
      if (tab === this.data.activeTab) return;

      // 开始果冻动画
      this.setData({
        jellyAnimating: true,
        activeTab: tab
      });

      // 监听动画结束并重置状态
      setTimeout(() => {
        this.setData({
          jellyAnimating: false
        });
      }, 600); // 与动画持续时间一致

      // 触发标签切换事件，通知父组件
      this.triggerEvent('tabchange', { tab });
    },

    // 监听动画结束事件
    handleAnimationEnd() {
      // 只触发一次动画完成事件
      if (!this.data.animationEnd && this.properties.show) {
        this.setData({
          animationEnd: true
        });

        this.triggerEvent('animationend');
      }

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

    // 预加载方法已移除，直接在handleTap中处理

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
        isExpanding: false,
        animationData: {} // 清除动画数据
      });
    },

    // 更新动画相关设置
    updateAnimation() {
      const { show, animation, delay } = this.properties;

      if (show) {
        let animationClass = '';
        if (animation !== 'none') {
          animationClass = `animate-${animation}`;
        }
        this.setData({
          animationClass,
          animationStyle: delay ? `animation-delay: ${delay}s;` : '',
          animationEnd: false // 重置动画完成状态
        });
      } else {
        // 当按钮隐藏时，清除动画类
        this.setData({
          animationClass: '',
          animationStyle: '',
          animationEnd: false
        });
      }
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 设置动画延迟
      this.updateAnimation();

      // 确保初始化设置了状态
      this.setData({
        initialized: true
      });
    },

    detached() {
      // 清除所有计时器，避免内存泄漏
      if (this._loadingTimeout) {
        clearTimeout(this._loadingTimeout);
        this._loadingTimeout = null;
      }
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'show, animation, delay': function () {
      this.updateAnimation();
    }
  }
})