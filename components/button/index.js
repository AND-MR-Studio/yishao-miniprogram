// components/button/index.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    // 按钮类型，light: 点亮，unlight: 未点亮
    type: {
      type: String,
      value: 'unlight' // 默认未点亮
    },
    // 按钮文本
    text: {
      type: String,
      value: '按钮'
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
    animationStyle: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 按钮点击事件
    handleTap() {
      this.triggerEvent('tap');
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 设置动画延迟
      if (this.properties.show) {
        this.setData({
          animationStyle: `animation-delay: ${this.properties.delay}s;`
        });
      }
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'show, delay': function(show, delay) {
      if (show) {
        this.setData({
          animationStyle: `animation-delay: ${delay}s;`
        });
      }
    }
  }
})