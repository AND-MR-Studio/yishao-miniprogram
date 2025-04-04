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
    jellyAnimating: false, // 是否正在执行果冻动画
    initialized: false, // 初始化标志
    animationEnd: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 按钮点击事件
    handleTap() {
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
      
      if (this.properties.type === 'switch') {
        const newValue = !this.data.checked;
        this.setData({
          checked: newValue
        });
        this.triggerEvent('change', {
          type: this.properties.type,
          checked: newValue
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
    'show, animation, delay': function(show, animation, delay) {
      this.updateAnimation();
    }
  }
})