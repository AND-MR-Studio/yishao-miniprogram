/**
 * 滑动手势管理工具
 * 提供简洁高效的滑动检测和方向判断功能
 */

// 滑动方向常量
const SWIPE_DIRECTION = {
  LEFT: 'left',   // 左滑
  RIGHT: 'right', // 右滑
  UP: 'up',       // 上滑
  DOWN: 'down',   // 下滑
  NONE: 'none'    // 无滑动
};

/**
 * 创建滑动管理器
 * @param {Object} options 配置选项
 * @returns {Object} 滑动管理器对象
 */
function createSwipeManager(options = {}) {
  // 内部状态
  const state = { startX: 0, startY: 0, isSwiping: false, direction: SWIPE_DIRECTION.NONE };

  // 配置选项
  const config = {
    threshold: options.threshold || 50,
    setData: options.setData || (() => {}),
    callbacks: {
      onSwipeLeft: options.onSwipeLeft,
      onSwipeRight: options.onSwipeRight,
      onSwipeUp: options.onSwipeUp,
      onSwipeDown: options.onSwipeDown,
      onSwipeStart: options.onSwipeStart,
      onSwipeMove: options.onSwipeMove,
      onSwipeEnd: options.onSwipeEnd
    }
  };

  /**
   * 触发回调函数
   * @param {string} name 回调名称
   * @param {...any} args 回调参数
   */
  const triggerCallback = (name, ...args) => {
    const callback = config.callbacks[name];
    if (typeof callback === 'function') {
      return callback(...args);
    }
  };

  /**
   * 触摸开始事件处理
   * @param {Object} e 触摸事件对象
   * @param {boolean} [canSwipe=true] 是否允许滑动
   */
  function handleTouchStart(e, canSwipe = true) {
    if (!canSwipe) return;

    // 记录起始触摸点坐标
    state.startX = e.touches[0].clientX;
    state.startY = e.touches[0].clientY;
    state.isSwiping = true;
    state.direction = SWIPE_DIRECTION.NONE;

    // 更新页面状态
    config.setData({ swiping: true, swipeDirection: SWIPE_DIRECTION.NONE });

    // 触发开始滑动回调
    triggerCallback('onSwipeStart', e);
  }

  /**
   * 触摸移动事件处理
   * @param {Object} e 触摸事件对象
   * @param {boolean} [canSwipe=true] 是否允许滑动
   */
  function handleTouchMove(e, canSwipe = true) {
    if (!canSwipe || !state.isSwiping) return;

    // 计算滑动距离
    const moveX = e.touches[0].clientX;
    const moveY = e.touches[0].clientY;
    const deltaX = moveX - state.startX;
    const deltaY = moveY - state.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // 确定主要滑动方向
    const isHorizontal = absX > absY;
    const direction = isHorizontal
      ? (deltaX > 0 ? SWIPE_DIRECTION.RIGHT : SWIPE_DIRECTION.LEFT)
      : (deltaY > 0 ? SWIPE_DIRECTION.DOWN : SWIPE_DIRECTION.UP);

    // 更新状态和页面数据
    state.direction = direction;
    config.setData({ swipeDirection: direction });

    // 触发滑动过程回调
    triggerCallback('onSwipeMove', e, { direction, deltaX, deltaY, absX, absY });
  }

  /**
   * 触摸结束事件处理
   * @param {Object} e 触摸事件对象
   * @param {boolean} [canSwipe=true] 是否允许滑动
   */
  function handleTouchEnd(e, canSwipe = true) {
    if (!canSwipe || !state.isSwiping) return;

    // 计算最终滑动距离
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - state.startX;
    const deltaY = endY - state.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const { direction } = state;

    // 重置滑动状态
    state.isSwiping = false;
    config.setData({ swiping: false });

    // 触发滑动结束回调
    triggerCallback('onSwipeEnd', e, { direction, deltaX, deltaY, absX, absY });

    // 如果滑动距离不足，不触发方向回调
    if (absX < config.threshold && absY < config.threshold) return;

    // 根据滑动方向触发相应回调
    const isHorizontal = absX > absY;
    const swipeData = { deltaX, deltaY, absX, absY };

    if (isHorizontal) {
      // 水平滑动
      triggerCallback(deltaX > 0 ? 'onSwipeRight' : 'onSwipeLeft', e, swipeData);
    } else {
      // 垂直滑动
      triggerCallback(deltaY > 0 ? 'onSwipeDown' : 'onSwipeUp', e, swipeData);
    }
  }

  /**
   * 重置滑动状态
   */
  function reset() {
    state.isSwiping = false;
    state.direction = SWIPE_DIRECTION.NONE;
    config.setData({ swiping: false, swipeDirection: SWIPE_DIRECTION.NONE });
  }

  // 返回公共接口
  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    reset,
    destroy: reset, // 销毁就是重置状态
    SWIPE_DIRECTION
  };
}

module.exports = {
  createSwipeManager,
  SWIPE_DIRECTION
};
