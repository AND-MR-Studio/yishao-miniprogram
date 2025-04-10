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

    // 打字机效果类型
    const TYPE_EFFECTS = {
      NORMAL: 'normal',    // 普通效果，无发光
      GLOW: 'glow'         // 发光效果（包含发光和缩放）
    };

    // 简化配置
    const config = {
      typeSpeed: options.typeSpeed || 60, // 打字速度（毫秒/字）
      onAnimationStart: options.onAnimationStart || null,
      onAnimationComplete: options.onAnimationComplete || null,
      typeEffect: options.typeEffect || TYPE_EFFECTS.GLOW // 默认为发光效果
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
      // 标点符号停顿时间延长2.5倍
      if (punctuations.includes(char)) {
        return config.typeSpeed * 2.5;
      }
      // 添加随机变化使打字效果更自然
      const variance = Math.floor(Math.random() * 20) - 10;
      return Math.max(config.typeSpeed / 2, config.typeSpeed + variance);
    };

    /**
     * 解析输入数据为统一格式的行数组
     * @param {String|Array|Object} data 输入数据
     * @returns {Array} 处理后的行数组
     */
    const parseInputData = (data) => {
      if (!data) {
        console.error('无效的数据格式');
        return [];
      }
      
      // 字符串转换为行数组
      if (typeof data === 'string') {
        return data.split(/\r?\n/);
      } 
      
      // 数组格式直接映射为字符串
      if (Array.isArray(data)) {
        return data.map(String);
      } 
      
      // 对象格式（兼容汤面数据）
      if (typeof data === 'object') {
        return [data.title].concat(data.contentLines || []);
      }
      
      return [];
    };

    /**
     * 统一的打字动画处理
     * @param {String|Array|Object} content 要显示的文本内容
     * @param {Function} onComplete 完成回调
     */
    const animateText = (content, onComplete) => {
      const lines = parseInputData(content);
      let lineIndex = 0;
      let charIndex = 0;
      let currentActive = -1;
      let prevActive = -1;
      let displayLines = [];
      
      // 更新UI状态
      const updateUIState = (state = {}) => {
        component.setData({
          displayLines,
          currentLineIndex: lineIndex,
          typeEffect: config.typeEffect,
          ...state
        });
      };
      
      const showNextChar = () => {
        // 所有行处理完毕
        if (lineIndex >= lines.length) {
          updateUIState({
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
          
          updateUIState({ lineAnimationComplete: true });

          lineIndex++;
          charIndex = 0;
          currentActive = -1;
          prevActive = -1;
          
          // 行间延迟固定为 typeSpeed * 8
          animationTimer = setTimeout(showNextChar, config.typeSpeed * 8);
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
        updateUIState({ lineAnimationComplete: false });

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
       * 获取可用的效果类型
       */
      getTypeEffects() {
        return { ...TYPE_EFFECTS };
      },
      
      /**
       * 开始打字机动画
       * @param {String|Array|Object} data 动画数据
       */
      start(data) {
        clearTimer();
        
        if (!data) return;
        
        component.setData({
          displayLines: [],
          currentLineIndex: 0,
          lineAnimationComplete: false,
          animationComplete: false,
          isAnimating: true,
          typeEffect: config.typeEffect
        });
        
        if (config.onAnimationStart) {
          config.onAnimationStart();
        }
        
        animateText(data, () => {
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
        
        if (!data) return;
        
        const lines = parseInputData(data);
        const displayLines = lines.map(line => ({
          text: line,
          chars: line.split('').map(char => ({
            char,
            show: true,
            active: false,
            prev: false
          }))
        }));
        
        if (config.onAnimationStart) {
          config.onAnimationStart();
        }
        
        component.setData({
          displayLines,
          currentLineIndex: displayLines.length,
          lineAnimationComplete: true,
          animationComplete: true,
          isAnimating: false,
          typeEffect: config.typeEffect
        });
        
        if (config.onAnimationComplete) {
          config.onAnimationComplete();
        }
      },
      
      /**
       * 设置打字机效果类型
       * @param {String} effectType 效果类型，'normal'或'glow'
       */
      setTypeEffect(effectType) {
        if (effectType === TYPE_EFFECTS.NORMAL || effectType === TYPE_EFFECTS.GLOW) {
          config.typeEffect = effectType;
          component.setData({ typeEffect: effectType });
        } else {
          console.error('无效的效果类型，可用类型:', Object.values(TYPE_EFFECTS));
        }
      },
      
      /**
       * 更新打字速度
       * @param {Number} speed 新的打字速度
       */
      updateSpeed(speed) {
        if (typeof speed === 'number' && speed > 0) {
          config.typeSpeed = speed;
        }
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
