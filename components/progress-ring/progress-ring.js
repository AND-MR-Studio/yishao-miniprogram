// components/progress-ring/progress-ring.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 当前进度值
    value: {
      type: Number,
      value: 0,
      observer: function(newVal) {
        this.updateProgress(newVal);
      }
    },
    // 最大值
    max: {
      type: Number,
      value: 10
    },
    // 环形进度条直径
    size: {
      type: Number,
      value: 120
    },
    // 环形进度条宽度
    strokeWidth: {
      type: Number,
      value: 8
    },
    // 是否显示粒子动效
    showParticles: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 进度条相关
    percentage: 0,
    circumference: 0,
    dashOffset: 0,
    radius: 0,
    
    // 粒子动效相关
    particles: [],
    animating: false
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化进度条
     */
    initProgressRing() {
      const radius = (this.data.size - this.data.strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      
      this.setData({
        radius,
        circumference,
        dashOffset: circumference
      });
      
      this.updateProgress(this.data.value);
    },
    
    /**
     * 更新进度条
     * @param {number} value 当前值
     */
    updateProgress(value) {
      const { max, circumference } = this.data;
      const percentage = Math.min(Math.max(value / max, 0), 1);
      const dashOffset = circumference * (1 - percentage);
      
      this.setData({
        percentage,
        dashOffset
      });
      
      // 如果启用了粒子效果，并且进度增加，则触发粒子动效
      if (this.data.showParticles && percentage > this.data.percentage && !this.data.animating) {
        this.triggerParticleEffect();
      }
    },
    
    /**
     * 触发粒子动效
     */
    triggerParticleEffect() {
      const { radius, percentage } = this.data;
      const particleCount = 8; // 粒子数量
      const particles = [];
      
      // 计算当前进度对应的角度
      const angle = percentage * 2 * Math.PI;
      
      // 创建粒子
      for (let i = 0; i < particleCount; i++) {
        // 在进度点周围随机生成粒子
        const randomAngle = angle + (Math.random() - 0.5) * 0.5;
        const x = radius * Math.cos(randomAngle);
        const y = radius * Math.sin(randomAngle);
        
        // 随机生成粒子大小和动画持续时间
        const size = Math.random() * 4 + 2;
        const duration = Math.random() * 300 + 200;
        
        particles.push({
          id: i,
          x,
          y,
          size,
          duration,
          opacity: 1
        });
      }
      
      this.setData({
        particles,
        animating: true
      });
      
      // 动画结束后清除粒子
      setTimeout(() => {
        this.setData({
          particles: [],
          animating: false
        });
      }, 400);
    }
  },
  
  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initProgressRing();
    }
  }
})
