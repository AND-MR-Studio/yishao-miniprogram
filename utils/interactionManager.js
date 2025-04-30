/**
 * 交互管理器
 * 统一管理滑动翻页和双击点赞等交互功能
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
 * 创建交互管理器
 * @param {Object} options 配置选项
 * @returns {Object} 交互管理器对象
 */
function createInteractionManager(options = {}) {
  // 内部状态
  const state = {
    // 滑动相关状态
    startX: 0,
    startY: 0,
    isSwiping: false,
    direction: SWIPE_DIRECTION.NONE,
    swipeStarted: false,
    blurAmount: 0,
    angle: 0, // 当前旋转角度，用于计算圆的位置
    
    // 双击相关状态
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0
  };

  // 配置选项
  const config = {
    // 滑动相关配置
    threshold: options.threshold || 50,
    maxBlur: options.maxBlur || 10, // 最大模糊程度，默认10px
    maxDistance: options.maxDistance || 100, // 最大滑动距离，默认100px
    enableBlurEffect: options.enableBlurEffect !== false, // 默认启用模糊特效
    enableBackgroundEffect: options.enableBackgroundEffect !== false, // 默认启用背景效果
    
    // 双击相关配置
    doubleTapDelay: options.doubleTapDelay || 300, // 双击间隔时间，默认300ms
    doubleTapDistance: options.doubleTapDistance || 30, // 双击允许的位置偏差，默认30px
    
    // 数据更新方法
    setData: options.setData || (() => {}),
    
    // 回调函数
    callbacks: {
      // 滑动相关回调
      onSwipeLeft: options.onSwipeLeft,
      onSwipeRight: options.onSwipeRight,
      onSwipeUp: options.onSwipeUp,
      onSwipeDown: options.onSwipeDown,
      onSwipeStart: options.onSwipeStart,
      onSwipeMove: options.onSwipeMove,
      onSwipeEnd: options.onSwipeEnd,
      
      // 双击相关回调
      onDoubleTap: options.onDoubleTap
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
   * 更新背景效果
   * @param {string} direction 滑动方向
   * @param {number} progress 滑动进度（0-1）
   */
  function updateBackgroundEffect(direction, progress) {
    if (!config.enableBackgroundEffect) return;

    // 计算滑动距离对应的角度变化
    // 根据滑动方向和进度动态设置背景渐变圆的位置
    let gradientStyle = '';

    // 计算角度变化步长 - 增加移动速度使效果更明显
    const angleStep = progress * 1; // 每次滑动的角度变化，调整这个值可以改变移动速度

    // 根据滑动方向更新角度
    if (direction === SWIPE_DIRECTION.LEFT) {
      // 左滑时，角度减小（逆时针旋转）
      state.angle = (state.angle - angleStep) % 360;
      // 如果角度为负数，转换为等价的正角度
      if (state.angle < 0) state.angle += 360;
    } else if (direction === SWIPE_DIRECTION.RIGHT) {
      // 右滑时，角度增加（顺时针旋转）
      state.angle = (state.angle + angleStep) % 360;
    }

    // 使用三角函数计算光晕的位置，实现真正的无限循环
    // 不再使用均匀分布的圆，而是使用不同大小和位置的渐变光晕
    const angle1 = state.angle;
    const angle2 = (state.angle + 60) % 360;  // 偏移60度
    const angle3 = (state.angle + 180) % 360; // 偏移180度

    // 使用余弦函数计算X坐标（0-100%）
    // 增大振幅使光晕移动范围更大
    const getPositionX = (angle) => {
      return 50 + 45 * Math.cos(angle * Math.PI / 180);
    };

    // 使用正弦函数计算Y坐标，使光晕在垂直方向上也有变化
    const getPositionY = (angle, baseY) => {
      return baseY + 15 * Math.sin(angle * Math.PI / 180);
    };

    // 计算每个光晕的位置
    const x1 = getPositionX(angle1);
    const y1 = getPositionY(angle1, 70); // 主要蓝色光晕在中间偏上

    const x2 = getPositionX(angle2);
    const y2 = getPositionY(angle2, 85); // 次要光晕在下方

    const x3 = getPositionX(angle3);
    const y3 = getPositionY(angle3, 50); // 辅助光晕在上方

    // 计算绿色光晕的位置 - 添加绿色品牌色点缀
    const angle4 = (state.angle + 120) % 360; // 绿色光晕与主要蓝色光晕错开
    const angle5 = (state.angle + 240) % 360; // 第二个绿色光晕与主要蓝色光晕错开

    const x4 = getPositionX(angle4);
    const y4 = getPositionY(angle4, 20); // 绿色光晕在上方

    const x5 = getPositionX(angle5);
    const y5 = getPositionY(angle5, 75); // 第二个绿色光晕在下方

    // 生成更高级的渐变样式，统一绿紫品牌色调
    // 使用椭圆而不是圆形，增大光晕范围，调整透明度和颜色
    gradientStyle = `radial-gradient(ellipse at ${x1}% ${y1}%, rgba(76, 0, 255, 0.5) 0%, rgba(25, 0, 112, 0.3) 30%, transparent 70%),
                    radial-gradient(ellipse at ${x2}% ${y2}%, rgba(0, 30, 255, 0.3) 0%, rgba(0, 10, 80, 0.2) 40%, transparent 70%),
                    radial-gradient(ellipse at ${x3}% ${y3}%, rgba(128, 0, 255, 0.2) 0%, rgba(50, 0, 120, 0.1) 30%, transparent 60%),
                    radial-gradient(ellipse at ${x4}% ${y4}%, rgba(0, 255, 136, 0.25) 0%, rgba(0, 180, 90, 0.15) 30%, transparent 60%),
                    radial-gradient(ellipse at ${x5}% ${y5}%, rgba(0, 200, 100, 0.2) 0%, rgba(0, 100, 50, 0.1) 40%, transparent 70%)`;

    if (gradientStyle) {
      // 使用自定义数据属性来存储渐变样式
      // 在页面中通过动态样式应用
      config.setData({
        gradientStyle: gradientStyle,
        swiping: true
      });
    }
  }

  /**
   * 检测双击事件
   * @param {Object} e 触摸事件对象
   * @returns {boolean} 是否触发了双击
   */
  function detectDoubleTap(e) {
    const currentTime = e.timeStamp;
    const lastTapTime = state.lastTapTime;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const lastTapX = state.lastTapX;
    const lastTapY = state.lastTapY;

    // 计算时间差和位置差
    const timeDiff = currentTime - lastTapTime;
    const xDiff = Math.abs(currentX - lastTapX);
    const yDiff = Math.abs(currentY - lastTapY);

    // 更新最后一次点击的时间和位置
    state.lastTapTime = currentTime;
    state.lastTapX = currentX;
    state.lastTapY = currentY;

    // 如果时间差小于配置的双击延迟且位置差小于配置的双击距离，认为是双击
    return (timeDiff < config.doubleTapDelay && xDiff < config.doubleTapDistance && yDiff < config.doubleTapDistance);
  }

  /**
   * 触摸开始事件处理
   * @param {Object} e 触摸事件对象
   * @param {boolean} [canInteract=true] 是否允许交互
   */
  function handleTouchStart(e, canInteract = true) {
    if (!canInteract) return;

    // 检测双击
    if (detectDoubleTap(e)) {
      triggerCallback('onDoubleTap', e);
    }

    // 记录起始触摸点坐标
    state.startX = e.touches[0].clientX;
    state.startY = e.touches[0].clientY;
    state.isSwiping = true;
    state.direction = SWIPE_DIRECTION.NONE;

    // 重置模糊相关状态
    state.swipeStarted = false;
    state.blurAmount = 0;

    // 更新页面状态
    config.setData({
      swiping: true,
      swipeDirection: SWIPE_DIRECTION.NONE,
      swipeStarted: false,
      blurAmount: 0
    });

    // 触发开始滑动回调
    triggerCallback('onSwipeStart', e);
  }

  /**
   * 触摸移动事件处理
   * @param {Object} e 触摸事件对象
   * @param {boolean} [canInteract=true] 是否允许交互
   */
  function handleTouchMove(e, canInteract = true) {
    if (!canInteract || !state.isSwiping) return;

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

    // 更新状态
    state.direction = direction;

    // 计算滑动进度（0-1）
    const maxDistance = config.maxDistance;
    const progress = Math.min(Math.max(absX, absY) / maxDistance, 1);

    // 更新背景效果
    if (isHorizontal) {
      updateBackgroundEffect(direction, progress);
    }

    // 如果启用了模糊特效，计算模糊程度
    if (config.enableBlurEffect) {
      // 设置开始滑动状态
      state.swipeStarted = true;

      // 计算模糊程度，根据滑动距离的比例
      const maxBlur = config.maxBlur;
      const blurAmount = progress * maxBlur;
      state.blurAmount = blurAmount;

      // 更新页面数据
      config.setData({
        swipeDirection: direction,
        swipeStarted: true,
        blurAmount: blurAmount
      });
    } else {
      // 不使用模糊特效，只更新方向
      config.setData({ swipeDirection: direction });
    }

    // 触发滑动过程回调
    triggerCallback('onSwipeMove', e, { direction, deltaX, deltaY, absX, absY, progress });
  }

  /**
   * 触摸结束事件处理
   * @param {Object} e 触摸事件对象
   * @param {boolean} [canInteract=true] 是否允许交互
   */
  function handleTouchEnd(e, canInteract = true) {
    if (!canInteract || !state.isSwiping) return;

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

    // 判断是否触发滑动回调
    const isSwipeTriggered = absX >= config.threshold || absY >= config.threshold;

    // 如果启用了模糊特效，重置模糊相关状态
    if (config.enableBlurEffect) {
      state.swipeStarted = false;
      state.blurAmount = 0;

      // 更新页面数据
      config.setData({
        swiping: false,
        swipeStarted: false,
        blurAmount: 0
      });
    } else {
      // 不使用模糊特效，只更新滑动状态
      config.setData({ swiping: false });
    }

    // 触发滑动结束回调
    triggerCallback('onSwipeEnd', e, { direction, deltaX, deltaY, absX, absY });

    // 如果滑动距离不足，不触发方向回调
    if (!isSwipeTriggered) return;

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
   * 重置交互状态
   */
  function reset() {
    state.isSwiping = false;
    state.direction = SWIPE_DIRECTION.NONE;
    state.swipeStarted = false;
    state.blurAmount = 0;

    // 不重置背景效果，保持当前背景状态

    if (config.enableBlurEffect) {
      config.setData({
        swiping: false,
        swipeDirection: SWIPE_DIRECTION.NONE,
        swipeStarted: false,
        blurAmount: 0
      });
    } else {
      config.setData({
        swiping: false,
        swipeDirection: SWIPE_DIRECTION.NONE
      });
    }
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
  createInteractionManager,
  SWIPE_DIRECTION
};
