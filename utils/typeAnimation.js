/**
 * 简化版打字机动画工具
 * 专注于高性能、低开销的文本打字机效果
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
      batchSize: options.batchSize || 5,  // 每次更新的字符数量
      onComplete: options.onComplete || null,
      onStart: options.onStart || null,
      onUpdate: options.onUpdate || null
    };

    // 清除定时器
    const clearTimer = () => {
      if (animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = null;
      }
    };

    // 返回打字机动画实例API
    return {
      /**
       * 开始打字机动画
       * @param {String} content 要显示的文本内容
       * @returns {Promise} 返回Promise，动画完成时解析
       */
      start(content) {
        clearTimer();

        // 空内容直接返回
        if (!content || typeof content !== 'string') {
          return Promise.resolve();
        }

        // 初始化状态
        let displayText = '';
        let currentIndex = 0;

        // 调用开始回调
        if (config.onStart) {
          config.onStart();
        }

        // 设置初始状态
        component.setData({
          typingText: '',
          isAnimating: true
        });

        // 创建并返回Promise
        return new Promise((resolve) => {
          animationResolve = resolve;

          // 逐字更新函数
          const updateChar = () => {
            // 如果已经完成，则结束动画
            if (currentIndex >= content.length) {
              // 设置最终文本
              component.setData({
                typingText: content,
                isAnimating: false
              });

              // 调用完成回调
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

            // 添加下一个字符
            displayText += content.charAt(currentIndex);

            // 更新组件状态 - 使用节流控制，每N个字符才触发一次setData
            if (currentIndex % config.batchSize === 0 || currentIndex === content.length - 1) {
              component.setData({
                typingText: displayText
              }, () => {
                // 调用更新回调 - 确保每次更新都触发滚动
                if (config.onUpdate) {
                  config.onUpdate();
                }
              });
            } else {
              // 即使不触发setData，也要更新内部状态，确保下一次更新时包含所有字符
              // 同时确保每个字符都能触发滚动回调
              if (config.onUpdate) {
                config.onUpdate();
              }
            }

            // 更新当前位置
            currentIndex++;

            // 计算下一个字符的延迟时间
            // 为标点符号增加额外延迟
            const char = content.charAt(currentIndex - 1);
            const isPunctuation = ['.', '。', '!', '！', '?', '？', ',', '，', ';', '；', ':', '：'].includes(char);
            const delay = isPunctuation ? config.typeSpeed * 3 : config.typeSpeed;

            // 安排下一个字符更新
            animationTimer = setTimeout(updateChar, delay);
          };

          // 开始逐字更新
          updateChar();
        });
      },

      /**
       * 立即显示完整内容
       * @param {String} content 要显示的文本内容
       * @returns {Promise} 立即解析的Promise
       */
      showComplete(content) {
        clearTimer();

        if (!content) {
          return Promise.resolve();
        }

        component.setData({
          typingText: content,
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
          typingText: '',
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
       * 更新批量大小
       * @param {Number} size 新的批量大小
       */
      updateBatchSize(size) {
        if (typeof size === 'number' && size > 0) {
          config.batchSize = size;
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
