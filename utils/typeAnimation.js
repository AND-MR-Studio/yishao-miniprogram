/**
 * 打字机动画工具类 - 通用版
 * 提供文本打字机效果，支持任意文本内容
 */
const typeAnimation = {
  /**
   * 创建打字机动画实例
   * @param {Object} component 组件实例
   * @param {Object} options 配置选项
   * @returns {Object} 打字机动画实例
   */
  createInstance(component, options = {}) {
    if (!component || typeof component.setData !== 'function') {
      console.error('组件实例无效');
      return null;
    }

    // 定时器和Promise解析函数
    let animationTimer = null;
    let animationResolve = null;

    // 简化配置
    const config = {
      typeSpeed: options.typeSpeed || 60, // 打字速度（毫秒/字）
      onComplete: options.onAnimationComplete || null
    };

    // 标点符号列表
    const punctuations = ['.', '。', '!', '！', '?', '？', ',', '，', ';', '；', '、', ':', '：', '-', '—', '·', '…'];

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
     * 将任意内容处理为文本行数组
     * @param {*} content 输入内容
     * @returns {Array} 处理后的文本行数组
     */
    const normalizeContent = (content) => {
      // 处理空值
      if (!content) return [];
      
      // 字符串：按换行符分割
      if (typeof content === 'string') {
        return content.split(/\r?\n/);
      }
      
      // 数组：确保每项都是字符串
      if (Array.isArray(content)) {
        return content.map(item => 
          typeof item === 'string' ? item : String(item)
        );
      }

      // 对象：尝试智能提取文本内容
      if (typeof content === 'object') {
        // 尝试使用自定义toString方法
        if (content.toString !== Object.prototype.toString) {
          return content.toString().split(/\r?\n/);
        }
        
        // 提取常见文本属性
        const textFields = ['text', 'content', 'message', 'description'];
        for (const field of textFields) {
          if (content[field]) {
            return typeof content[field] === 'string' ? 
              content[field].split(/\r?\n/) : [String(content[field])];
          }
        }
        
        // 提取数组类型的字段
        const arrayFields = ['lines', 'contentLines', 'contents', 'messages'];
        for (const field of arrayFields) {
          if (content[field] && Array.isArray(content[field])) {
            return content[field].map(line => 
              typeof line === 'string' ? line : String(line)
            );
          }
        }
        
        // 最后尝试将整个对象转为JSON
        try {
          return [JSON.stringify(content)];
        } catch (e) {
          return ['[对象数据]'];
        }
      }
      
      // 其他类型：转换为字符串
      return [String(content)];
    };

    /**
     * 执行打字动画
     * @param {*} content 要显示的任意内容
     */
    const animateText = (content) => {
      const lines = normalizeContent(content);
      let lineIndex = 0;
      let charIndex = 0;
      let currentActive = -1;
      let displayLines = [];
      
      // 更新UI状态
      const updateUI = (isComplete = false) => {
        component.setData({
          displayLines,
          currentLineIndex: lineIndex,
          isAnimating: !isComplete
        });
      };
      
      const showNextChar = () => {
        // 所有行处理完毕
        if (lineIndex >= lines.length) {
          updateUI(true);
          
          if (config.onComplete) {
            config.onComplete();
          }
          
          // 解析Promise
          if (animationResolve) {
            animationResolve();
            animationResolve = null;
          }
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
              active: false
            }))
          });
        }

        // 当前行处理完毕，准备处理下一行
        if (charIndex >= currentLine.length) {
          if (currentActive >= 0) {
            displayLines[lineIndex].chars[currentActive].active = false;
          }
          
          lineIndex++;
          charIndex = 0;
          currentActive = -1;
          
          // 行间延迟
          animationTimer = setTimeout(showNextChar, config.typeSpeed * 5);
          return;
        }

        // 更新前一个激活字符的状态
        if (currentActive >= 0) {
          displayLines[lineIndex].chars[currentActive].active = false;
        }

        // 显示当前字符
        displayLines[lineIndex].chars[charIndex].show = true;
        displayLines[lineIndex].chars[charIndex].active = true;
        displayLines[lineIndex].text = currentLine.substring(0, charIndex + 1);
        
        currentActive = charIndex;
        
        // 更新界面
        updateUI();

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
       * 开始打字机动画
       * @param {*} content 任意内容
       * @returns {Promise} 返回Promise，动画完成时解析
       */
      start(content) {
        clearTimer();
        
        if (!content) return Promise.resolve();
        
        component.setData({
          displayLines: [],
          currentLineIndex: 0,
          isAnimating: true
        });
        
        // 创建并返回Promise
        return new Promise((resolve) => {
          animationResolve = resolve;
          animateText(content);
        });
      },
      
      /**
       * 立即显示完整内容
       * @param {*} content 任意内容
       * @returns {Promise} 立即解析的Promise
       */
      showComplete(content) {
        clearTimer();
        
        if (!content) return Promise.resolve();
        
        const lines = normalizeContent(content);
        const displayLines = lines.map(line => ({
          text: line,
          chars: line.split('').map(char => ({
            char,
            show: true,
            active: false
          }))
        }));
        
        component.setData({
          displayLines,
          currentLineIndex: displayLines.length,
          isAnimating: false
        });
        
        if (config.onComplete) {
          config.onComplete();
        }
        
        return Promise.resolve();
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
        
        if (animationResolve) {
          animationResolve();
          animationResolve = null;
        }
        
        component.setData({
          displayLines: [],
          currentLineIndex: 0,
          isAnimating: false
        });
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
        
        if (animationResolve) {
          animationResolve();
          animationResolve = null;
        }
      }
    };
  }
};

module.exports = typeAnimation;
