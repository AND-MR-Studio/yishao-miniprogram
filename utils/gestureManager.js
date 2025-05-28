/**
 * gestureManager.js - 统一手势管理器
 * 
 * 整合了面板拖拽、滑动翻页、双击、长按等所有手势交互功能
 * 支持:
 * 1. 面板下拉关闭（带阻尼效果）
 * 2. 滑动翻页（水平/垂直）
 * 3. 双击检测
 * 4. 长按检测
 * 5. 背景视觉效果
 * 6. 模糊效果
 * 7. 统一的状态管理和资源清理
 */

// 手势类型常量
const GESTURE_TYPE = {
  PANEL_DRAG: 'panel_drag',     // 面板拖拽
  SWIPE: 'swipe',               // 滑动
  DOUBLE_TAP: 'double_tap',     // 双击
  LONG_PRESS: 'long_press'      // 长按
};

// 滑动方向常量
const SWIPE_DIRECTION = {
  LEFT: 'left',
  RIGHT: 'right',
  UP: 'up',
  DOWN: 'down',
  NONE: 'none'
};

/**
 * 创建统一手势管理器
 * @param {Object} options 配置选项
 * @returns {Object} 手势管理器对象
 */
function createGestureManager(options = {}) {
  // 配置选项
  const config = {
    // 面板拖拽配置
    enablePanelDrag: options.enablePanelDrag || false,
    closeThreshold: options.closeThreshold || 200,
    dampingFactor: options.dampingFactor || 0.6,
    
    // 滑动配置
    enableSwipe: options.enableSwipe !== false,
    swipeThreshold: options.swipeThreshold || 50,
    maxDistance: options.maxDistance || 100,
    
    // 特效配置
    enableBlurEffect: options.enableBlurEffect !== false,
    enableBackgroundEffect: options.enableBackgroundEffect !== false,
    maxBlur: options.maxBlur || 10,
    
    // 双击配置
    enableDoubleTap: options.enableDoubleTap || false,
    doubleTapDelay: options.doubleTapDelay || 300,
    doubleTapDistance: options.doubleTapDistance || 30,
    
    // 长按配置
    enableLongPress: options.enableLongPress || false,
    longPressDelay: options.longPressDelay || 500,
    
    // 数据更新方法
    setData: options.setData || (() => {}),
    setBlurAmount: options.setBlurAmount || (() => {}),
    
    // 回调函数
    callbacks: {
      // 面板拖拽回调
      onPanelClose: options.onPanelClose,
      onVibrate: options.onVibrate,
      
      // 滑动回调
      onSwipeLeft: options.onSwipeLeft,
      onSwipeRight: options.onSwipeRight,
      onSwipeUp: options.onSwipeUp,
      onSwipeDown: options.onSwipeDown,
      onSwipeStart: options.onSwipeStart,
      onSwipeMove: options.onSwipeMove,
      onSwipeEnd: options.onSwipeEnd,
      
      // 双击回调
      onDoubleTap: options.onDoubleTap,
      
      // 长按回调
      onLongPressStart: options.onLongPressStart,
      onLongPressEnd: options.onLongPressEnd
    }
  };

  // 内部状态
  const state = {
    // 基础触摸状态
    startX: 0,
    startY: 0,
    isActive: false,
    
    // 面板拖拽状态
    isDragging: false,
    moveDistance: 0,
    
    // 滑动状态
    direction: SWIPE_DIRECTION.NONE,
    swipeStarted: false,
    blurAmount: 0,
    angle: 0,
    
    // 双击状态
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,
    
    // 长按状态
    longPressTimer: null,
    isLongPressing: false
  };

  // 定时器管理
  const timers = {
    resetTimer: null,
    closeTimer1: null,
    closeTimer2: null,
    closeTimer3: null,
    longPressTimer: null
  };

  /**
   * 清理所有定时器
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
   * 触发回调函数
   */
  function triggerCallback(name, ...args) {
    const callback = config.callbacks[name];
    if (typeof callback === 'function') {
      return callback(...args);
    }
  }

  /**
   * 检测双击事件
   */
  function detectDoubleTap(e) {
    if (!config.enableDoubleTap) return false;
    
    const currentTime = e.timeStamp;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const timeDiff = currentTime - state.lastTapTime;
    const xDiff = Math.abs(currentX - state.lastTapX);
    const yDiff = Math.abs(currentY - state.lastTapY);
    
    // 更新最后一次点击的时间和位置
    state.lastTapTime = currentTime;
    state.lastTapX = currentX;
    state.lastTapY = currentY;
    
    return (timeDiff < config.doubleTapDelay && 
            xDiff < config.doubleTapDistance && 
            yDiff < config.doubleTapDistance);
  }

  /**
   * 开始长按检测
   */
  function startLongPressDetection(e) {
    if (!config.enableLongPress) return;
    
    clearTimeout(timers.longPressTimer);
    
    timers.longPressTimer = setTimeout(() => {
      state.isLongPressing = true;
      triggerCallback('onLongPressStart', e);
    }, config.longPressDelay);
  }

  /**
   * 结束长按检测
   */
  function endLongPressDetection(e) {
    if (timers.longPressTimer) {
      clearTimeout(timers.longPressTimer);
      timers.longPressTimer = null;
    }
    
    if (state.isLongPressing) {
      state.isLongPressing = false;
      triggerCallback('onLongPressEnd', e);
    }
  }

  /**
   * 更新背景效果
   */
  function updateBackgroundEffect(direction, progress) {
    if (!config.enableBackgroundEffect) return;
    
    const angleStep = progress * 1;
    
    if (direction === SWIPE_DIRECTION.LEFT) {
      state.angle = (state.angle - angleStep) % 360;
      if (state.angle < 0) state.angle += 360;
    } else if (direction === SWIPE_DIRECTION.RIGHT) {
      state.angle = (state.angle + angleStep) % 360;
    }
    
    // 计算光晕位置
    const getPositionX = (angle) => 50 + 45 * Math.cos(angle * Math.PI / 180);
    const getPositionY = (angle, baseY) => baseY + 15 * Math.sin(angle * Math.PI / 180);
    
    const angle1 = state.angle;
    const angle2 = (state.angle + 60) % 360;
    const angle3 = (state.angle + 180) % 360;
    const angle4 = (state.angle + 120) % 360;
    const angle5 = (state.angle + 240) % 360;
    
    const x1 = getPositionX(angle1);
    const y1 = getPositionY(angle1, 70);
    const x2 = getPositionX(angle2);
    const y2 = getPositionY(angle2, 85);
    const x3 = getPositionX(angle3);
    const y3 = getPositionY(angle3, 50);
    const x4 = getPositionX(angle4);
    const y4 = getPositionY(angle4, 20);
    const x5 = getPositionX(angle5);
    const y5 = getPositionY(angle5, 75);
    
    const gradientStyle = `radial-gradient(ellipse at ${x1}% ${y1}%, rgba(87, 44, 239, 0.5) 0%, rgba(25, 0, 112, 0.3) 30%, transparent 70%),
                          radial-gradient(ellipse at ${x2}% ${y2}%, rgba(0, 30, 255, 0.3) 0%, rgba(0, 10, 80, 0.2) 40%, transparent 70%),
                          radial-gradient(ellipse at ${x3}% ${y3}%, rgba(87, 44, 239, 0.2) 0%, rgba(50, 0, 120, 0.1) 30%, transparent 60%),
                          radial-gradient(ellipse at ${x4}% ${y4}%, rgba(92, 232, 33, 0.25) 0%, rgba(0, 180, 90, 0.15) 30%, transparent 60%),
                          radial-gradient(ellipse at ${x5}% ${y5}%, rgba(92, 232, 33, 0.2) 0%, rgba(0, 100, 50, 0.1) 40%, transparent 70%)`;
    
    config.setData({
      gradientStyle,
      swiping: true
    });
  }

  /**
   * 处理面板拖拽逻辑
   */
  function handlePanelDrag(e, moveDistance) {
    if (moveDistance <= 0) {
      config.setData({
        panelStyle: '',
        moveDistance: 0
      });
      return;
    }
    
    // 计算阻尼效果
    const translateY = Math.pow(moveDistance, config.dampingFactor);
    state.moveDistance = moveDistance;
    
    config.setData({
      moveDistance,
      panelStyle: `transform: translateY(${translateY}rpx);`
    });
  }

  /**
   * 重置面板位置
   */
  function resetPanelPosition() {
    config.setData({
      panelStyle: 'transform: translateY(0); transition: transform 0.3s ease-out;'
    });
    
    clearTimeout(timers.resetTimer);
    timers.resetTimer = setTimeout(() => {
      config.setData({ panelStyle: '', moveDistance: 0 });
    }, 300);
  }

  /**
   * 关闭面板动画
   */
  function closeWithAnimation() {
    clearAllTimers();
    
    config.setData({
      panelStyle: 'transform: translateY(60rpx); transition: transform 0.1s ease-out;'
    });
    
    timers.closeTimer1 = setTimeout(() => {
      config.setData({
        panelStyle: 'transform: translateY(100%); transition: transform 0.3s ease-in;'
      });
      
      timers.closeTimer2 = setTimeout(() => {
        triggerCallback('onPanelClose');
        
        timers.closeTimer3 = setTimeout(() => {
          config.setData({ moveDistance: 0, panelStyle: '' });
        }, 100);
      }, 250);
    }, 100);
  }

  /**
   * 触摸开始事件处理
   */
  function handleTouchStart(e, extraParams = {}) {
    const { canInteract = true, isShow = true } = extraParams;
    
    if (!canInteract) return;
    
    // 检测双击
    if (detectDoubleTap(e)) {
      triggerCallback('onDoubleTap', e);
      return;
    }
    
    // 记录起始位置
    state.startX = e.touches[0].clientX;
    state.startY = e.touches[0].clientY;
    state.isActive = true;
    
    // 面板拖拽逻辑
    if (config.enablePanelDrag && isShow) {
      state.isDragging = true;
      config.setData({ isDragging: true });
    }
    
    // 滑动逻辑
    if (config.enableSwipe) {
      state.direction = SWIPE_DIRECTION.NONE;
      state.swipeStarted = false;
      state.blurAmount = 0;
      
      config.setData({
        swiping: true,
        swipeDirection: SWIPE_DIRECTION.NONE,
        swipeStarted: false,
        blurAmount: 0
      });
      
      triggerCallback('onSwipeStart', e);
    }
    
    // 长按检测
    if (config.enableLongPress) {
      startLongPressDetection(e);
    }
  }

  /**
   * 触摸移动事件处理
   */
  function handleTouchMove(e, extraParams = {}) {
    const { canInteract = true, isShow = true } = extraParams;
    
    if (!canInteract || !state.isActive) return;
    
    const moveX = e.touches[0].clientX;
    const moveY = e.touches[0].clientY;
    const deltaX = moveX - state.startX;
    const deltaY = moveY - state.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // 取消长按检测
    if (absX > 10 || absY > 10) {
      endLongPressDetection(e);
    }
    
    // 面板拖拽逻辑
    if (config.enablePanelDrag && state.isDragging && isShow) {
      const moveDistance = deltaY;
      handlePanelDrag(e, moveDistance);
    }
    
    // 滑动逻辑
    if (config.enableSwipe) {
      const isHorizontal = absX > absY;
      const direction = isHorizontal
        ? (deltaX > 0 ? SWIPE_DIRECTION.RIGHT : SWIPE_DIRECTION.LEFT)
        : (deltaY > 0 ? SWIPE_DIRECTION.DOWN : SWIPE_DIRECTION.UP);
      
      state.direction = direction;
      
      const progress = Math.min(Math.max(absX, absY) / config.maxDistance, 1);
      
      // 更新背景效果
      if (isHorizontal) {
        updateBackgroundEffect(direction, progress);
      }
      
      // 更新模糊效果
      if (config.enableBlurEffect) {
        state.swipeStarted = true;
        const blurAmount = progress * config.maxBlur;
        state.blurAmount = blurAmount;
        
        config.setBlurAmount(blurAmount);
        config.setData({
          swipeDirection: direction,
          swipeStarted: true
        });
      } else {
        config.setData({ swipeDirection: direction });
      }
      
      triggerCallback('onSwipeMove', e, { direction, deltaX, deltaY, absX, absY, progress });
    }
  }
  /**
   * 触摸结束事件处理
   */
  function handleTouchEnd(e, extraParams = {}) {
    const { canInteract = true, isShow = true } = extraParams;
    
    if (!canInteract || !state.isActive) return;

    endLongPressDetection(e);
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - state.startX;
    const deltaY = endY - state.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // 面板拖拽逻辑
    if (config.enablePanelDrag && state.isDragging && isShow) {
      state.isDragging = false;
      config.setData({ isDragging: false });
      
      if (state.moveDistance > config.closeThreshold) {
        triggerCallback('onVibrate');
        closeWithAnimation();
      } else {
        resetPanelPosition();
      }
    }
    
    // 滑动逻辑
    if (config.enableSwipe) {
      state.isActive = false;
      
      // 重置状态
      if (config.enableBlurEffect) {
        state.swipeStarted = false;
        state.blurAmount = 0;
        config.setBlurAmount(0);
        config.setData({
          swiping: false,
          swipeStarted: false
        });
      } else {
        config.setData({ swiping: false });
      }
      
      triggerCallback('onSwipeEnd', e, { direction: state.direction, deltaX, deltaY, absX, absY });
      
      // 检查是否触发滑动回调
      const isSwipeTriggered = absX >= config.swipeThreshold || absY >= config.swipeThreshold;
      if (isSwipeTriggered) {
        const isHorizontal = absX > absY;
        const swipeData = { deltaX, deltaY, absX, absY };
        
        if (isHorizontal) {
          triggerCallback(deltaX > 0 ? 'onSwipeRight' : 'onSwipeLeft', e, swipeData);
        } else {
          triggerCallback(deltaY > 0 ? 'onSwipeDown' : 'onSwipeUp', e, swipeData);
        }
      }
    }
    
    state.isActive = false;
  }

  /**
   * 手动关闭面板
   */
  function closePanel() {
    if (config.enablePanelDrag) {
      triggerCallback('onVibrate');
      closeWithAnimation();
    }
  }

  /**
   * 重置所有状态
   */
  function reset() {
    state.isActive = false;
    state.isDragging = false;
    state.moveDistance = 0;
    state.direction = SWIPE_DIRECTION.NONE;
    state.swipeStarted = false;
    state.blurAmount = 0;
    state.isLongPressing = false;
    
    clearAllTimers();
    
    if (config.enableBlurEffect) {
      config.setBlurAmount(0);
    }
    
    config.setData({
      swiping: false,
      swipeDirection: SWIPE_DIRECTION.NONE,
      swipeStarted: false,
      isDragging: false,
      moveDistance: 0,
      panelStyle: ''
    });
  }

  /**
   * 清理资源
   */
  function destroy() {
    clearAllTimers();
    reset();
  }

  // 返回公共接口
  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    closePanel,
    reset,
    destroy,
    GESTURE_TYPE,
    SWIPE_DIRECTION
  };
}

module.exports = {
  createGestureManager,
  GESTURE_TYPE,
  SWIPE_DIRECTION
};
