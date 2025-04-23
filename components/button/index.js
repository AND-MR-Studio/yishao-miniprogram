// components/button/index.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮类型，light: 点亮，unlight: 未点亮，，dark: 深色按钮，switch: 开关，radio: 单选按钮
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
    touchStartTime: 0, // 按下时间记录
    isPressed: false, // 是否处于按下状态
    buttonLeft: 0, // 按钮当前左侧位置
    buttonTop: 0, // 按钮当前顶部位置
    startX: 0, // 触摸起始X坐标
    startY: 0, // 触摸起始Y坐标
    isDragging: false // 是否正在拖动
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

      // 如果是开始喝汤按钮（light类型），则直接开始动画并跳转
      if (buttonType === 'light' && this.properties.text === '开始喝汤') {
        // 先设置按下状态，显示圆形
        this.setData({
          isPressed: true
        });

        // 等待短暂后开始渐隐动画
        setTimeout(() => {
          this.startExpandAnimation();
        }, 200);

        // 触发预加载事件
        this.triggerEvent('preload');
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

    // 监听动画结束事件
    handleAnimationEnd() {
      // 只触发一次动画完成事件
      if (!this.data.animationEnd && this.properties.show) {
        this.setData({
          animationEnd: true
        });

        this.triggerEvent('animationend');
      }

      // 如果是展开动画结束，触发完成事件
      if (this.data.isExpanding) {
        this.setData({
          isExpanding: false
        });
        this.triggerEvent('expandend');
      }
    },

    // 按钮按下事件
    handleTouchStart(e) {
      // 如果不是开始喝汤按钮，不处理拖动逻辑
      if (this.properties.type !== 'light' || this.properties.text !== '开始喝汤') {
        return;
      }

      // 记录按下时间和位置
      const touch = e.touches[0];

      // 获取按钮当前位置
      const query = wx.createSelectorQuery().in(this);
      query.select('.btn-light').boundingClientRect(rect => {
        if (!rect) return;

        // 计算圆形按钮的中心位置，确保它在原来按钮的中心
        // 将 120rpx 转换为 px，大约是 60px
        const buttonSize = 60; // 圆形按钮的大小（px）
        const centerX = rect.left + rect.width / 2 - buttonSize / 2;
        const centerY = rect.top + rect.height / 2 - buttonSize / 2;
        this.setData({
          touchStartTime: Date.now(),
          isPressed: true,
          startX: touch.clientX,
          startY: touch.clientY,
          buttonLeft: centerX,
          buttonTop: centerY
        });
      }).exec();
    },

    // 按钮移动事件 - 异步处理
    async handleTouchMove(e) {
      // 如果不是开始喝汤按钮或者没有按下，不处理拖动逻辑
      if (this.properties.type !== 'light' ||
          this.properties.text !== '开始喝汤' ||
          !this.data.isPressed) {
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - this.data.startX;
      const deltaY = touch.clientY - this.data.startY;

      // 如果移动距离超过5px，认为开始拖动
      if (!this.data.isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        await this._asyncSetData({
          isDragging: true
        });
      }

      // 如果正在拖动，更新按钮位置
      if (this.data.isDragging) {
        // 添加弹性回弹效果，让移动更自然
        // 使用阴阻因子来模拟物理效果，移动越快越流畅
        const dampingFactor = 0.8; // 阴阻因子，调整这个值可以改变拖动的感觉
        const newDeltaX = deltaX * dampingFactor;
        const newDeltaY = deltaY * dampingFactor;

        // 使用异步处理和节流来优化性能
        if (!this._animationFrameId) {
          this._animationFrameId = setTimeout(async () => {
            await this._asyncSetData({
              buttonLeft: this.data.buttonLeft + newDeltaX,
              buttonTop: this.data.buttonTop + newDeltaY,
              startX: touch.clientX,
              startY: touch.clientY
            });
            this._animationFrameId = null;
          }, 16); // 大约相当于60fps
        }
      }
    },

    // 异步setData封装，返回Promise
    _asyncSetData(data) {
      return new Promise(resolve => {
        this.setData(data, resolve);
      });
    },

    // 按钮松开事件 - 异步处理
    async handleTouchEnd() {
      // 清除动画帧ID，避免内存泄漏
      if (this._animationFrameId) {
        clearTimeout(this._animationFrameId);
        this._animationFrameId = null;
      }

      // 如果是开始喝汤按钮，直接开始动画
      if (this.properties.type === 'light' && this.properties.text === '开始喝汤') {
        // 确保预加载事件被触发，使用异步处理
        if (!this.data.isLoading) {
          // 在单独的微任务中触发预加载事件
          Promise.resolve().then(() => {
            this.triggerEvent('preload');
          });
        }

        // 无论是否在拖动，都开始动画并跳转
        // 在单独的微任务中开始动画
        setTimeout(() => {
          this.startExpandAnimation();
        }, 0);
      }

      // 重置按下状态，使用异步处理
      await this._asyncSetData({
        isPressed: false,
        isDragging: false,
        touchStartTime: 0
      });
    },

    // 添加弹性回弹效果 - 简化版
    addBounceEffect() {
      // 直接开始渐隐动画，跳过复杂的弹性效果
      // 这样可以减少性能消耗，避免卡顿
      this.startExpandAnimation();
    },

    // 按钮触摸取消事件 - 异步处理
    async handleTouchCancel() {
      // 清除动画帧ID，避免内存泄漏
      if (this._animationFrameId) {
        clearTimeout(this._animationFrameId);
        this._animationFrameId = null;
      }

      // 重置按下状态，使用异步处理
      await this._asyncSetData({
        isPressed: false,
        isDragging: false,
        touchStartTime: 0
      });
    },

    // 开始渐隐动画 - 异步处理
    async startExpandAnimation() {
      // 如果已经在执行动画，不重复执行
      if (this.data.isExpanding) return;

      // 在单独的微任务中触发展开结束事件
      // 这样可以减少主线程负担，避免卡顿
      Promise.resolve().then(() => {
        this.triggerEvent('expandend');
      });

      // 在事件触发后再设置状态，避免卡顿
      await this._asyncSetData({
        isExpanding: true
      });
    },

    // 预加载对话数据 - 异步处理
    async preloadDialogData() {
      // 如果已经在加载中，不重复加载
      if (this.data.isLoading) return;

      // 使用异步设置加载状态
      await this._asyncSetData({
        isLoading: true
      });

      // 在单独的微任务中触发预加载事件
      // 这样可以减少主线程负担，避免卡顿
      Promise.resolve().then(() => {
        this.triggerEvent('preload');
      });

      // 模拟加载完成，实际应由父组件调用setLoadingComplete方法
      // setTimeout(() => {
      //   this.setLoadingComplete();
      // }, 1000);
    },

    // 设置加载完成状态（由父组件调用） - 异步处理
    async setLoadingComplete() {
      // 如果当前没有在加载中，则不处理
      if (!this.data.isLoading) return;

      // 使用异步设置加载状态
      await this._asyncSetData({
        isLoading: false
      });

      // 如果按钮当前处于按下状态，在单独的微任务中开始展开动画
      if (this.data.touchStartTime > 0) {
        // 使用Promise将动画放入微任务队列
        Promise.resolve().then(() => {
          this.startExpandAnimation();
        });
      }
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
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'show, animation, delay': function (show, animation, delay) {
      this.updateAnimation();
    }
  }
})