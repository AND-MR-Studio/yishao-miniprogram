// components/button/index.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮类型，light: 点亮，unlight: 未点亮
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
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    animationClass: '',
    animationStyle: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 按钮点击事件
    handleTap() {
      this.triggerEvent('tap');
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
          animationStyle: delay ? `animation-delay: ${delay}s;` : ''
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
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'show, animation, delay': function(show, animation, delay) {
      this.updateAnimation();
    }
  }
})