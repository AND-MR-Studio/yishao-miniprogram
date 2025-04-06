/**
 * panelDrag.js - 面板拖拽管理工具
 * 
 * 提供底部弹出面板的下拉关闭和交互功能，支持:
 * 1. 手势下拉关闭面板，带有阻尼效果
 * 2. 平滑动画过渡
 * 3. 震动反馈
 * 4. 资源自动清理
 * 
 * 配合微信小程序组件使用，在wxml中需要相应的触摸事件绑定：
 * - bindtouchstart="handleTouchStart"
 * - bindtouchmove="handleTouchMove" 
 * - bindtouchend="handleTouchEnd"
 * 
 * CSS样式建议:
 * - 面板样式通过panelStyle动态设置
 * - 拖拽时通过isDragging状态添加额外效果
 * 
 * 适用于各种底部弹出面板，如设置面板、筛选面板等
 */

/**
 * 创建面板拖拽管理器
 * @param {Object} options 配置选项
 * @param {Number} options.closeThreshold 关闭阈值距离，下拉超过该距离将触发关闭动画，默认200
 * @param {Number} options.dampingFactor 阻尼系数(0-1)，越小阻力越大，默认0.6
 * @param {Function} options.onClose 面板关闭时的回调函数
 * @param {Function} options.onVibrate 震动反馈的回调函数
 * @param {Function} options.setData 设置组件数据的函数，通常传入组件的this.setData
 * @returns {Object} 拖拽管理器对象及其方法集合
 */
function createPanelDragManager(options = {}) {
  // 默认配置
  const config = {
    closeThreshold: 200,
    dampingFactor: 0.6,
    onClose: () => {},
    onVibrate: () => {},
    setData: () => {},
    ...options
  };

  // 计时器管理
  const timers = {
    resetTimer: null,
    closeTimer1: null,
    closeTimer2: null,
    closeTimer3: null
  };

  // 当前状态
  const state = {
    startY: 0,
    moveY: 0,
    moveDistance: 0,
    isDragging: false
  };

  /**
   * 清理所有计时器
   */
  function clearAllTimers() {
    Object.keys(timers).forEach(key => {
      if (timers[key]) {
        clearTimeout(timers[key]);
        timers[key] = null;
      }
    });
  }

  /**
   * 处理触摸开始
   * @param {Object} e 触摸事件对象
   * @param {Boolean} isShow 面板是否显示
   * @returns {void}
   */
  function handleTouchStart(e, isShow) {
    if (!isShow) return;
    
    state.startY = e.touches[0].clientY;
    state.isDragging = true;
    
    config.setData({
      isDragging: true
    });
  }

  /**
   * 处理触摸移动
   * @param {Object} e 触摸事件对象
   * @param {Boolean} isShow 面板是否显示
   * @returns {void}
   */
  function handleTouchMove(e, isShow) {
    if (!isShow || !state.isDragging) return;
    
    const moveY = e.touches[0].clientY;
    const moveDistance = moveY - state.startY;
    
    // 只处理下拉，忽略上拉
    if (moveDistance <= 0) {
      config.setData({
        panelStyle: '',
        moveDistance: 0
      });
      return;
    }
    
    // 计算阻尼效果，下拉越多阻力越大
    const translateY = Math.pow(moveDistance, config.dampingFactor);
    
    state.moveY = moveY;
    state.moveDistance = moveDistance;
    
    config.setData({
      moveDistance,
      panelStyle: `transform: translateY(${translateY}rpx);`
    });
  }

  /**
   * 处理触摸结束
   * @param {Boolean} isShow 面板是否显示
   * @returns {void}
   */
  function handleTouchEnd(isShow) {
    if (!isShow || !state.isDragging) return;
    
    config.setData({ isDragging: false });
    state.isDragging = false;
    
    // 如果下拉距离超过阈值，关闭面板
    if (state.moveDistance > config.closeThreshold) {
      if (config.onVibrate) config.onVibrate();
      closeWithAnimation();
    } else {
      resetPanelPosition();
    }
  }

  /**
   * 重置面板位置
   * @returns {void}
   */
  function resetPanelPosition() {
    // 设置过渡回原位
    config.setData({
      panelStyle: 'transform: translateY(0); transition: transform 0.3s ease-out;'
    });
    
    // 延时清除过渡效果
    if (timers.resetTimer) clearTimeout(timers.resetTimer);
    timers.resetTimer = setTimeout(() => {
      config.setData({ panelStyle: '', moveDistance: 0 });
    }, 300);
  }

  /**
   * 带动画关闭面板
   * @returns {void}
   */
  function closeWithAnimation() {
    // 清理可能存在的计时器
    clearAllTimers();
    
    // 动画1：先轻微下拉
    config.setData({
      panelStyle: 'transform: translateY(60rpx); transition: transform 0.1s ease-out;'
    });
    
    // 动画2：完全下拉
    timers.closeTimer1 = setTimeout(() => {
      config.setData({
        panelStyle: 'transform: translateY(100%); transition: transform 0.3s ease-in;'
      });
      
      // 动画完成后关闭面板
      timers.closeTimer2 = setTimeout(() => {
        if (config.onClose) config.onClose();
        
        // 重置样式
        timers.closeTimer3 = setTimeout(() => {
          config.setData({ moveDistance: 0, panelStyle: '' });
        }, 100);
      }, 250);
    }, 100);
  }

  /**
   * 手动关闭面板
   * @returns {void}
   */
  function closePanel() {
    if (config.onVibrate) config.onVibrate();
    closeWithAnimation();
  }

  /**
   * 清理资源
   * @returns {void}
   */
  function destroy() {
    clearAllTimers();
  }

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetPanelPosition,
    closeWithAnimation,
    closePanel,
    destroy
  };
}

module.exports = {
  createPanelDragManager
}; 