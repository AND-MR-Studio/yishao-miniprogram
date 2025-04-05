/**
 * 打字机动画工具类 - 通用版
 * 提供文本打字机效果，支持任意文本内容
 */
const typeAnimation = {
  /**
   * 创建打字机动画实例
   * @param {Object} component 组件实例，需要有setData方法
   * @param {Object} options 配置选项
   * @returns {Object} 打字机动画实例
   */
  createInstance(component, options = {}) {
    if (!component || typeof component.setData !== 'function') {
      console.error('组件实例无效');
      return null;
    }

    // 定时器
    let animationTimer = null;

    // 默认配置
    const config = {
      typeSpeed: options.typeSpeed || 60,
      lineDelay: options.lineDelay || 500,
      punctuationDelay: options.punctuationDelay || 2.5,
      charActiveDuration: options.charActiveDuration || 180,
      charPrevDuration: options.charPrevDuration || 320,
      onAnimationStart: options.onAnimationStart || null,
      onAnimationComplete: options.onAnimationComplete || null
    };

    // 标点符号列表
    const punctuations = [
      '.', '。', '!', '！', '?', '？', ',', '，', ';', '；', '、', 
      ':', '：', '-', '—', '·', '…'
    ];

    // 清除定时器
    const clearTimer = () => {
      if (animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = null;
      }
    };

    /**
     * 获取字符延迟时间
     * @param {String} char 要检查的字符
     * @returns {Number} 实际延迟时间
     */
    const getCharDelay = (char) => {
      if (punctuations.includes(char)) {
        return config.typeSpeed * config.punctuationDelay;
      }
      // 添加随机变化使打字效果更自然
      const variance = Math.floor(Math.random() * 20) - 10;
      return Math.max(config.typeSpeed / 2, config.typeSpeed + variance);
    };

    /**
     * 将文本内容转换为行数组
     * @param {String|Array} content 文本内容
     * @returns {Array} 行数组
     */
    const convertToLines = (content) => {
      if (typeof content === 'string') {
        return content.split(/\r?\n/);
      } 
      if (Array.isArray(content)) {
        return content.map(String);
      }
      return [];
    };

    /**
     * 解析输入数据为统一格式
     * @param {String|Array|Object} data 输入数据
     * @returns {Array} 处理后的行数组
     */
    const parseInputData = (data) => {
      if (typeof data === 'string' || Array.isArray(data)) {
        return data;
      } 
      if (data && typeof data === 'object') {
        // 兼容汤面数据格式
        return [data.title].concat(data.contentLines || []);
      }
      console.error('无效的数据格式');
      return null;
    };

    /**
     * 统一的打字动画处理
     * @param {String|Array} content 要显示的文本内容
     * @param {Function} onComplete 完成回调
     */
    const animateText = (content, onComplete) => {
      const lines = convertToLines(content);
      let lineIndex = 0;
      let charIndex = 0;
      let currentActive = -1;
      let prevActive = -1;
      let displayLines = [];
      
      const showNextChar = () => {
        // 所有行处理完毕
        if (lineIndex >= lines.length) {
          component.setData({
            animationComplete: true,
            isAnimating: false
          });
          
          if (config.onAnimationComplete) {
            config.onAnimationComplete();
          }
          if (onComplete) onComplete();
          return;
        }

        const currentLine = lines[lineIndex];
        
        // 初始化当前行
        if (displayLines.length <= lineIndex) {
          displayLines.push({
            text: '',
            chars: currentLine.split('').map(char => ({
              char,
              show: false,
              active: false,
              prev: false
            }))
          });
        }

        // 当前行处理完毕，准备处理下一行
        if (charIndex >= currentLine.length) {
          if (currentActive >= 0) {
            displayLines[lineIndex].chars[currentActive].active = false;
            displayLines[lineIndex].chars[currentActive].prev = false;
          }
          
          component.setData({ 
            displayLines,
            currentLineIndex: lineIndex,
            lineAnimationComplete: true
          });

          lineIndex++;
          charIndex = 0;
          currentActive = -1;
          prevActive = -1;
          
          animationTimer = setTimeout(showNextChar, config.lineDelay);
          return;
        }

        // 更新前一个激活字符的状态
        if (prevActive >= 0) {
          displayLines[lineIndex].chars[prevActive].prev = false;
        }
        
        if (currentActive >= 0) {
          prevActive = currentActive;
          displayLines[lineIndex].chars[currentActive].active = false;
          displayLines[lineIndex].chars[currentActive].prev = true;
        }

        // 显示当前字符
        displayLines[lineIndex].chars[charIndex].show = true;
        displayLines[lineIndex].chars[charIndex].active = true;
        displayLines[lineIndex].text = currentLine.substring(0, charIndex + 1);
        
        currentActive = charIndex;
        
        // 更新界面
        component.setData({
          displayLines,
          currentLineIndex: lineIndex,
          lineAnimationComplete: false
        });

        charIndex++;
        
        // 计算下一个字符的延迟时间
        const delay = getCharDelay(currentLine[charIndex - 1]);
        animationTimer = setTimeout(showNextChar, delay);
      };

      // 开始动画
      showNextChar();
    };

    // 返回打字机动画实例API
    return {
      /**
       * 获取当前配置
       */
      getConfig() {
        return { ...config };
      },
      
      /**
       * 开始打字机动画
       * @param {String|Array|Object} data 动画数据
       */
      start(data) {
        clearTimer();
        
        const content = parseInputData(data);
        if (!content) return;
        
        component.setData({
          displayLines: [],
          currentLineIndex: 0,
          lineAnimationComplete: false,
          animationComplete: false,
          isAnimating: true
        });
        
        if (config.onAnimationStart) {
          config.onAnimationStart();
        }
        
        animateText(content, () => {
          component.setData({ animationComplete: true });
        });
      },
      
      /**
       * 暂停动画
       */
      pause() {
        clearTimer();
        component.setData({ isAnimating: false });
      },
      
      /**
       * 重置动画
       */
      reset() {
        clearTimer();
        
        component.setData({
          displayLines: [],
          currentLineIndex: 0,
          lineAnimationComplete: false,
          animationComplete: false,
          isAnimating: false
        });
      },
      
      /**
       * 立即显示完整内容
       * @param {String|Array|Object} data 动画数据
       */
      showComplete(data) {
        clearTimer();
        
        const content = parseInputData(data);
        if (!content) return;
        
        const lines = convertToLines(content);
        const displayLines = lines.map(line => ({
          text: line,
          chars: line.split('').map(char => ({
            char,
            show: true,
            active: false,
            prev: false
          }))
        }));
        
        component.setData({
          displayLines,
          currentLineIndex: displayLines.length,
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
      updateConfig(newOptions) {
        Object.assign(config, newOptions);
      },
      
      /**
       * 清理资源
       */
      destroy() {
        clearTimer();
      }
    };
  }
};

module.exports = typeAnimation;
