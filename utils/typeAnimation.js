/**
 * 打字机动画工具类
 * 提供标题和内容的打字机动画效果
 */
const typeAnimation = {
  /**
   * 创建打字机动画实例
   * @param {Object} component 组件实例，需要有setData方法
   * @param {Object} options 配置选项
   * @returns {Object} 打字机动画实例
   */
  createInstance: function(component, options = {}) {
    if (!component || typeof component.setData !== 'function') {
      console.error('组件实例无效');
      return null;
    }

    // 定时器
    const timers = {
      titleTimer: null,
      contentTimer: null
    };

    // 默认配置
    const defaultOptions = {
      titleTypeSpeed: 80,  // 标题打字速度（毫秒/字）
      contentTypeSpeed: 50, // 内容打字速度（毫秒/字）
      lineDelay: 400,       // 行间延迟（毫秒）
      // 标点符号停顿时间配置
      punctuationDelays: {
        sentenceEnd: {
          base: 200,    // 句末标点基础停顿时间
          variance: 100  // 随机波动范围 ±100ms
        },
        pause: {
          base: 100,    // 句内停顿基础时间
          variance: 50   // 随机波动范围 ±50ms
        },
        lead: {
          base: 60,     // 引导性标点基础时间
          variance: 30   // 随机波动范围 ±30ms
        },
        ellipsis: {
          base: 100,    // 省略号基础时间
          variance: 50   // 随机波动范围 ±50ms
        }
      },
      onAnimationStart: null,
      onTitleComplete: null,
      onLineComplete: null,
      onAnimationComplete: null
    };

    // 标点符号分类
    const punctuationTypes = {
      // 句末标点：停顿较长
      sentenceEnd: ['.', '。', '!', '！', '?', '？'],
      // 句内停顿：停顿中等
      pause: [',', '，', ';', '；', '、'],
      // 引导性标点：停顿稍短
      lead: [':', '：', '-', '—', '·'],
      // 省略号和特殊标点
      ellipsis: ['…', '.', '。']
    };

    // 合并配置
    const config = { ...defaultOptions, ...options };

    /**
     * 清除所有定时器
     * @private
     */
    const clearAllTimers = function() {
      if (timers.titleTimer) {
        clearTimeout(timers.titleTimer);
        timers.titleTimer = null;
      }

      if (timers.contentTimer) {
        clearTimeout(timers.contentTimer);
        timers.contentTimer = null;
      }
    };

    /**
     * 拆分标题为字符数组
     * @param {String} title 标题文本
     * @returns {Array} 字符数组
     */
    const splitTitleChars = function(title) {
      return title.split('').map(char => {
        return { char, show: false };
      });
    };

    /**
     * 获取随机停顿时间
     * @param {Object} delayConfig 停顿时间配置对象
     * @returns {Number} 实际停顿时间
     */
    const getRandomDelay = function(delayConfig) {
      const { base, variance } = delayConfig;
      const randomVariance = Math.floor(Math.random() * variance * 2) - variance;
      return Math.max(0, base + randomVariance);
    };

    /**
     * 获取字符的停顿时间
     * @param {String} char 当前字符
     * @param {String} nextChar 下一个字符
     * @returns {Number} 停顿时间（毫秒）
     */
    const getPunctuationDelay = function(char, nextChar) {
      // 处理省略号特殊情况
      if (char === '.' && nextChar === '.') {
        return getRandomDelay(config.punctuationDelays.ellipsis);
      }
      
      // 检查字符属于哪种标点类型
      for (const [type, chars] of Object.entries(punctuationTypes)) {
        if (chars.includes(char)) {
          return getRandomDelay(config.punctuationDelays[type]);
        }
      }
      
      // 为普通字符添加微小的随机波动
      const normalCharVariance = Math.floor(Math.random() * 20) - 10; // ±10ms的随机波动
      return Math.max(0, config.contentTypeSpeed + normalCharVariance);
    };

    /**
     * 动画标题
     * @param {Object} options 动画选项
     */
    const animateTitle = function(options) {
      const { titleChars, onComplete } = options;
      let currentIndex = 0;

      const animateNextChar = () => {
        if (currentIndex >= titleChars.length) {
          // 标题动画完成
          component.setData({
            titleAnimationComplete: true
          });

          if (typeof onComplete === 'function') {
            setTimeout(onComplete, config.lineDelay);
          }
          
          if (typeof config.onTitleComplete === 'function') {
            config.onTitleComplete();
          }
          
          return;
        }

        // 显示下一个字符
        const updatedChars = [...titleChars];
        updatedChars[currentIndex].show = true;

        component.setData({ titleChars: updatedChars });

        currentIndex++;

        // 设置下一个字符的定时器
        timers.titleTimer = setTimeout(animateNextChar, config.titleTypeSpeed);
      };

      // 开始第一个字符的动画
      animateNextChar();
    };

    /**
     * 动画内容
     * @param {Object} options 动画选项
     */
    const animateContent = function(options) {
      const { contentLines, displayLines, currentLineIndex } = options;
      let updatedDisplayLines = [...displayLines];
      let updatedLineIndex = currentLineIndex;

      if (updatedLineIndex >= contentLines.length) {
        component.setData({
          animationComplete: true,
          isAnimating: false
        });

        if (typeof config.onAnimationComplete === 'function') {
          config.onAnimationComplete();
        }
        
        return;
      }

      if (updatedDisplayLines.length <= updatedLineIndex) {
        updatedDisplayLines.push('');
      }

      const targetLine = contentLines[updatedLineIndex];
      let currentCharIndex = updatedDisplayLines[updatedLineIndex].length;

      const typeLine = () => {
        if (currentCharIndex >= targetLine.length) {
          component.setData({
            lineAnimationComplete: true
          });

          if (typeof config.onLineComplete === 'function') {
            config.onLineComplete(updatedLineIndex);
          }

          setTimeout(() => {
            updatedLineIndex++;
            component.setData({
              currentLineIndex: updatedLineIndex,
              lineAnimationComplete: false
            });
            
            animateContent({
              contentLines,
              displayLines: updatedDisplayLines,
              currentLineIndex: updatedLineIndex
            });
          }, config.lineDelay);

          return;
        }

        const currentChar = targetLine[currentCharIndex];
        const nextChar = targetLine[currentCharIndex + 1];
        
        // 添加下一个字符
        updatedDisplayLines[updatedLineIndex] = targetLine.substring(0, currentCharIndex + 1);

        component.setData({
          displayLines: updatedDisplayLines,
          lineAnimationComplete: false
        });

        currentCharIndex++;

        // 计算下一个字符的延迟时间
        const punctuationDelay = getPunctuationDelay(currentChar, nextChar);
        const nextDelay = punctuationDelay > 0 ? punctuationDelay : config.contentTypeSpeed;

        // 设置下一个字符的定时器
        timers.contentTimer = setTimeout(typeLine, nextDelay);
      };

      // 开始打字
      typeLine();
    };

    // 返回打字机动画实例API
    return {
      /**
       * 开始打字机动画
       * @param {Object} data 动画数据
       */
      start: function(data) {
        // 清除之前的动画
        clearAllTimers();
        
        // 初始化数据
        const titleChars = splitTitleChars(data.title || '');
        const contentLines = data.contentLines || [];
        
        // 更新组件数据
        component.setData({
          titleChars,
          titleAnimationComplete: false,
          displayLines: [],
          currentLineIndex: 0,
          lineAnimationComplete: false,
          animationComplete: false,
          isAnimating: true
        });
        
        // 触发动画开始回调
        if (typeof config.onAnimationStart === 'function') {
          config.onAnimationStart();
        }
        
        // 开始标题动画
        animateTitle({
          titleChars,
          onComplete: () => {
            // 标题动画完成后开始内容动画
            animateContent({
              contentLines,
              displayLines: [],
              currentLineIndex: 0
            });
          }
        });
      },
      
      /**
       * 暂停动画
       */
      pause: function() {
        clearAllTimers();
        component.setData({ isAnimating: false });
      },
      
      /**
       * 重置动画
       */
      reset: function() {
        clearAllTimers();
        
        // 重置字符显示状态
        const titleChars = component.data.titleChars.map(char => {
          return { ...char, show: false };
        });
        
        component.setData({
          titleChars,
          titleAnimationComplete: false,
          displayLines: [],
          currentLineIndex: 0,
          lineAnimationComplete: false,
          animationComplete: false,
          isAnimating: false
        });
      },
      
      /**
       * 更新配置
       * @param {Object} newOptions 新配置
       */
      updateConfig: function(newOptions) {
        Object.assign(config, newOptions);
      },
      
      /**
       * 清理资源
       */
      destroy: function() {
        clearAllTimers();
      }
    };
  }
};

module.exports = typeAnimation;
