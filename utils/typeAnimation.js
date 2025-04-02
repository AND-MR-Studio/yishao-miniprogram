/**
 * 打字机动画工具类 - 精简版
 * 提供文本打字机效果
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
      contentTimer: null,
      stateTimer: null
    };

    // 默认配置
    const config = {
      // 速度配置
      titleTypeSpeed: options.titleTypeSpeed || 80,
      contentTypeSpeed: options.contentTypeSpeed || 60,
      lineDelay: options.lineDelay || 500,
      // 标点符号延迟倍数
      punctuationDelay: options.punctuationDelay || 2.5,
      // 字符状态持续时间
      charActiveDuration: options.charActiveDuration || 180,
      charPrevDuration: options.charPrevDuration || 320,
      // 回调函数
      onAnimationStart: options.onAnimationStart || null,
      onAnimationComplete: options.onAnimationComplete || null
    };

    // 标点符号列表（不区分类型）
    const punctuations = [
      '.', '。', '!', '！', '?', '？', 
      ',', '，', ';', '；', '、', 
      ':', '：', '-', '—', '·', '…'
    ];

    /**
     * 清除所有定时器
     */
    const clearTimers = function() {
      Object.values(timers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      Object.keys(timers).forEach(key => timers[key] = null);
    };

    /**
     * 检查字符是否为标点符号并获取延迟时间
     * @param {String} char 要检查的字符
     * @param {Number} baseSpeed 基础打字速度
     * @returns {Number} 实际延迟时间
     */
    const getCharDelay = function(char, baseSpeed) {
      // 如果是标点符号，使用延长的停顿时间
      if (punctuations.includes(char)) {
        return baseSpeed * config.punctuationDelay;
      }
      
      // 为普通字符添加微小的随机波动，使打字更自然
      const variance = Math.floor(Math.random() * 20) - 10; // ±10ms的随机波动
      return Math.max(baseSpeed / 2, baseSpeed + variance);
    };

    /**
     * 显示标题动画 - 增强版带过渡效果
     * @param {Array} titleChars 标题字符数组
     * @param {Function} onComplete 完成回调
     */
    const animateTitle = function(titleChars, onComplete) {
      let index = 0;
      let currentActive = -1;
      let prevActive = -1;
      
      const showNextChar = () => {
        if (index >= titleChars.length) {
          // 最后字符状态整理
          if (currentActive >= 0) {
            const chars = [...titleChars];
            chars[currentActive].active = false;
            component.setData({ titleChars: chars });
          }
          
          component.setData({ titleAnimationComplete: true });
          if (onComplete) setTimeout(onComplete, 200);
          return;
        }

        // 更新前一个激活字符状态为prev
        if (prevActive >= 0) {
          const chars = [...titleChars];
          chars[prevActive].prev = false;
          component.setData({ titleChars: chars });
        }
        
        // 更新当前激活字符状态为普通显示
        if (currentActive >= 0) {
          prevActive = currentActive;
          const chars = [...titleChars];
          chars[currentActive].active = false;
          chars[currentActive].prev = true;
          component.setData({ titleChars: chars });
        }
        
        // 显示并激活下一个字符
        const chars = [...titleChars];
        chars[index].show = true;
        chars[index].active = true;
        component.setData({ titleChars: chars });
        
        currentActive = index;
        
        // 获取当前字符的延迟时间
        const currentChar = titleChars[index].char;
        const delay = getCharDelay(currentChar, config.titleTypeSpeed);
        
        index++;
        timers.titleTimer = setTimeout(showNextChar, delay);
      };
      
      showNextChar();
    };

    /**
     * 显示内容动画
     * @param {Array} contentLines 内容行数组
     */
    const animateContent = function(contentLines) {
      let lineIndex = 0;
      let displayLines = [];
      
      const typeLine = () => {
        // 所有行显示完成
        if (lineIndex >= contentLines.length) {
          component.setData({
            animationComplete: true,
            isAnimating: false
          });
          
          if (config.onAnimationComplete) {
            config.onAnimationComplete();
          }
          return;
        }
        
        const currentLine = contentLines[lineIndex];
        let charIndex = 0;
        
        // 填充到当前行
        if (displayLines.length <= lineIndex) {
          displayLines.push('');
        }
        
        const typeChar = () => {
          if (charIndex >= currentLine.length) {
            // 该行打字完成
            setTimeout(() => {
              lineIndex++;
              component.setData({ 
                currentLineIndex: lineIndex,
                lineAnimationComplete: true
              });
              typeLine(); // 继续下一行
            }, config.lineDelay);
            return;
          }
          
          // 添加下一个字符
          const currentChar = currentLine[charIndex];
          displayLines[lineIndex] = currentLine.substring(0, charIndex + 1);
          
          component.setData({
            displayLines: displayLines,
            currentLineIndex: lineIndex,
            lineAnimationComplete: false
          });
          
          charIndex++;
          
          // 使用基于字符的延迟时间
          const delay = getCharDelay(currentChar, config.contentTypeSpeed);
          timers.contentTimer = setTimeout(typeChar, delay);
        };
        
        typeChar();
      };
      
        typeLine();
    };

    // 返回打字机动画实例API
    return {
      /**
       * 获取当前配置
       */
      getConfig: function() {
        return { ...config };
      },
      
      /**
       * 开始打字机动画
       * @param {Object} data 动画数据
       */
      start: function(data) {
        clearTimers();
        
        const title = data.title || '';
        const contentLines = data.contentLines || [];
        
        // 初始化标题字符，增加active和prev状态
        const titleChars = title.split('').map(char => ({ 
          char, 
          show: false,
          active: false,
          prev: false
        }));
        
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
        
        if (config.onAnimationStart) {
          config.onAnimationStart();
        }
        
        // 开始标题动画
        animateTitle(titleChars, () => {
          // 标题动画完成后开始内容动画
          animateContent(contentLines);
        });
      },
      
      /**
       * 暂停动画
       */
      pause: function() {
        clearTimers();
        component.setData({ isAnimating: false });
      },
      
      /**
       * 重置动画
       */
      reset: function() {
        clearTimers();
        
        const titleChars = (component.data.titleChars || []).map(char => {
          return { 
            ...char, 
            show: false,
            active: false,
            prev: false
          };
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
       * 立即显示完整内容
       * @param {Object} data 动画数据
       */
      showComplete: function(data) {
        clearTimers();
        
        const title = data.title || '';
        const contentLines = data.contentLines || [];
        const titleChars = title.split('').map(char => ({ 
          char, 
          show: true,
          active: false,
          prev: false
        }));
        
        component.setData({
          titleChars,
          titleAnimationComplete: true,
          displayLines: contentLines,
          currentLineIndex: contentLines.length,
          lineAnimationComplete: true,
          animationComplete: true,
          isAnimating: false
        });
        
        if (config.onAnimationComplete) {
          config.onAnimationComplete();
        }
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
        clearTimers();
      }
    };
  }
};

module.exports = typeAnimation;
