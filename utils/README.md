# 工具类说明文档

## swipeManager.js - 滑动手势管理工具

`swipeManager.js` 提供了一个简洁高效的滑动手势检测和处理工具，可以在任何需要滑动手势的页面或组件中使用。

### 主要功能

- 检测和处理左右滑动和上下滑动手势
- 提供滑动开始、滑动中和滑动结束的回调
- 支持设置滑动触发阈值
- 支持绑定页面的 setData 方法自动更新页面状态

### 使用方法

1. 引入工具类：

```javascript
const { createSwipeManager, SWIPE_DIRECTION } = require('../../utils/swipeManager');
```

2. 在页面数据中添加滑动状态：

```javascript
data: {
  swiping: false, // 是否正在滑动中
  swipeDirection: SWIPE_DIRECTION.NONE, // 滑动方向
  swipeFeedback: false // 滑动反馈动画（可选）
}
```

3. 初始化滑动管理器：

```javascript
// 在 onLoad 中初始化
onLoad() {
  this.initSwipeManager();
  // 其他初始化代码...
},

// 初始化滑动管理器
initSwipeManager() {
  this.swipeManager = createSwipeManager({
    threshold: 50, // 滑动触发阈值（单位：px）
    setData: this.setData.bind(this), // 绑定页面的 setData 方法

    // 左滑回调
    onSwipeLeft: () => {
      // 处理左滑逻辑
    },

    // 右滑回调
    onSwipeRight: () => {
      // 处理右滑逻辑
    }
  });
}
```

4. 在页面卸载时销毁滑动管理器：

```javascript
onUnload() {
  if (this.swipeManager) {
    this.swipeManager.destroy();
    this.swipeManager = null;
  }
}
```

5. 在 WXML 中绑定触摸事件：

```html
<view bindtouchstart="touchStart" bindtouchmove="touchMove" bindtouchend="touchEnd">
  <!-- 页面内容 -->
</view>
```

6. 实现触摸事件处理方法：

```javascript
// 检查是否可以滑动
canSwipe() {
  return true; // 根据实际情况判断
},

// 简洁的触摸事件处理方法
touchStart(e) {
  this.swipeManager?.handleTouchStart(e, this.canSwipe());
},

touchMove(e) {
  this.swipeManager?.handleTouchMove(e, this.canSwipe());
},

touchEnd(e) {
  this.swipeManager?.handleTouchEnd(e, this.canSwipe());
}
```

### 滑动反馈动画（可选）

如果需要添加滑动反馈动画，可以在 WXSS 中添加以下样式：

```css
/* 滑动反馈动画 */
.swipe-feedback-left {
  animation: swipeLeft 0.3s ease-out;
}

.swipe-feedback-right {
  animation: swipeRight 0.3s ease-out;
}

@keyframes swipeLeft {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(-100rpx);
    opacity: 0;
  }
}

@keyframes swipeRight {
  0% {
    transform: translateX(0);
    opacity: 1;
  }
  100% {
    transform: translateX(100rpx);
    opacity: 0;
  }
}
```

然后在需要应用动画的元素上添加类名：

```html
<view class="{{swipeFeedback ? 'swipe-feedback-' + swipeDirection : ''}}">
  <!-- 内容 -->
</view>
```

### 实际使用示例

以下是一个实际使用的例子，实现左右滑动切换汤面：

```javascript
// 初始化滑动管理器
initSwipeManager() {
  this.swipeManager = createSwipeManager({
    threshold: 50,
    setData: this.setData.bind(this),

    // 左滑回调 - 下一个汤面
    onSwipeLeft: () => {
      if (this.canSwitchSoup()) {
        this.setData({ swipeFeedback: true });
        this.onNextSoup();
      }
    },

    // 右滑回调 - 上一个汤面
    onSwipeRight: () => {
      if (this.canSwitchSoup()) {
        this.setData({ swipeFeedback: true });
        this.onPreviousSoup();
      }
    }
  });
},

// 检查是否可以切换汤面
canSwitchSoup() {
  return this.data.pageState === 'viewing' && !this.data.isLoading;
},

// 简洁的触摸事件处理方法
touchStart(e) {
  this.swipeManager?.handleTouchStart(e, this.canSwitchSoup());
},

touchMove(e) {
  this.swipeManager?.handleTouchMove(e, this.canSwitchSoup());
},

touchEnd(e) {
  this.swipeManager?.handleTouchEnd(e, this.canSwitchSoup());
}
```

### 注意事项

- 滑动管理器会自动判断主要滑动方向（水平或垂直）
- 可以通过 `threshold` 参数调整滑动触发的灵敏度
- 使用可选链式调用（`?.`）可以简化代码并避免空值检查
- 如果页面有多个需要滑动的区域，可以创建多个滑动管理器实例
