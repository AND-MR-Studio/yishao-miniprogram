# 打字机动画模块使用指南

## 📖 功能概述
本模块提供仿机械打字机效果的文本展示动画，支持：
- 标题逐字显示（带字符状态过渡）
- 内容逐行显示
- 标点符号智能延迟
- 前字符闪烁过渡效果
- 动画流程控制（开始/暂停/重置/立即完成）
- 静态模式（跳过动画直接显示）

## 🚀 快速开始
### 1. 引入模块
```javascript
// 在组件js文件中引入
const typeAnimation = require('../../utils/typeAnimation.js');
```

### 2. 基础使用
```javascript
// 组件JS
Component({
  methods: {
    startAnimation() {
      this.animator = typeAnimation.createInstance(this, {
        titleTypeSpeed: 80,    // 标题打字速度(ms/字符)
        contentTypeSpeed: 60,  // 内容打字速度
        punctuationDelay: 2.5  // 标点符号延迟倍数
      });
      
      this.animator.start({
        title: '示例标题',
        contentLines: [
          '第一行示例文本，',
          '第二行示例内容。'
        ]
      });
    }
  }
})
```

### 3. 静态模式使用（跳过动画）
```javascript
// 方法一：通过设置速度为0跳过动画
this.animator = typeAnimation.createInstance(this, {
  titleTypeSpeed: 0,    // 设置为0立即显示
  contentTypeSpeed: 0,  // 设置为0立即显示
  lineDelay: 0          // 消除行间延迟
});
this.animator.start(data);

// 方法二：直接调用showComplete立即显示全部内容
this.animator = typeAnimation.createInstance(this);
this.animator.showComplete(data);

// 方法三：通过CSS类控制
// 在组件wxml中
<view class="soup-container {{staticMode ? 'static-mode' : ''}}">
  <!-- 内容... -->
</view>

// 在组件js中设置属性
properties: {
  staticMode: {
    type: Boolean,
    value: false
  }
}
```

## ⚙️ 配置选项
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|-----|
| `titleTypeSpeed` | Number | 80 | 标题字符间隔(ms)，设为0则立即显示 |
| `contentTypeSpeed` | Number | 60 | 内容字符间隔，设为0则立即显示 |
| `lineDelay` | Number | 500 | 行间延迟 |
| `punctuationDelay` | Number | 2.5 | 标点符号延迟倍数 |
| `charActiveDuration` | Number | 180 | 字符高亮状态持续时间 |
| `charPrevDuration` | Number | 320 | 前字符过渡状态持续时间 |

## 🎮 方法API
```javascript
// 开始动画
animator.start(data)

// 暂停动画
animator.pause()

// 重置到初始状态
animator.reset()

// 立即显示完整内容
animator.showComplete(data)

// 更新配置
animator.updateConfig({
  titleTypeSpeed: 100,
  //...其他配置项
})

// 销毁实例
animator.destroy()
```

## 🎨 样式说明
需在WXSS中配置以下样式类：
```css
/* 字符基础样式 */
.char-typing {
  opacity: 0;
  transform: scale(0.9);
  transition: all 160ms cubic-bezier(0.215, 0.610, 0.355, 1.000);
}

/* 显示状态 */
.char-typing.show {
  opacity: 1;
  transform: scale(1);
}

/* 当前活跃字符 */
.char-typing.active {
  transform: scale(1.05);
  text-shadow: 0 0 8rpx var(--color-primary);
}

/* 前一个字符 */
.char-typing.prev {
  opacity: 0.9;
  transition-duration: 200ms;
}
```

## 💡 最佳实践
1. **性能优化**：
- 在Page/Component的onUnload中调用`animator.destroy()`
- 避免在动画进行中频繁更新数据
- 使用`wx:if`控制动画容器的渲染

2. **视觉调优**：
- 通过调整`cubic-bezier`曲线改变动画节奏
- 使用`text-shadow`增强字符高亮效果
- 在`.char-typing.prev`中配置透明度过渡实现闪烁效果

3. **静态/动态模式切换**：
```javascript
// 组件属性设置
properties: {
  staticMode: {
    type: Boolean,
    value: false,
    observer(newVal) {
      if (newVal && this.animator) {
        // 切换到静态模式，立即显示所有内容
        this.animator.showComplete(this.data.animationData);
      } else if (!newVal && this.animator && this.data.isPlaying) {
        // 从静态切回动态，重新开始动画
        this.animator.reset();
        this.animator.start(this.data.animationData);
      }
    }
  }
}
```

4. **错误处理**：
```javascript
try {
  this.animator.start(data);
} catch (error) {
  console.error('动画启动失败:', error);
  wx.showToast({ title: '动画初始化失败' });
}
```

## ❓ 常见问题
**Q：如何实现不同字符的不同效果？**
A：可通过扩展字符数据对象实现：
```javascript
title.split('').map(char => ({
  char,
  show: false,
  customClass: getCharClass(char) // 自定义分类逻辑
}))
```

**Q：动画卡顿怎么处理？**
1. 适当降低`titleTypeSpeed/contentTypeSpeed`
2. 减少同时进行的动画元素数量
3. 检查是否有复杂CSS样式（如box-shadow）

**Q：如何实现换行停顿？**
在contentLines数组中插入空字符串：
```javascript
contentLines: [
  '第一行内容',
  '', // 此处会产生额外停顿
  '第二行内容'
]
```

**Q：如何在不同场景下切换动态/静态展示？**
A：可以通过多种方式实现：
```javascript
// 1. 使用页面参数决定是否使用静态模式
onLoad(options) {
  this.setData({
    staticMode: options.noAnimation === '1' // URL参数控制
  });
}

// 2. 基于设备性能自动选择
onLoad() {
  // 低端设备自动切换到静态模式
  const systemInfo = wx.getSystemInfoSync();
  if (systemInfo.benchmarkLevel <= 20) { // 设备性能较低
    this.setData({ staticMode: true });
  }
}

// 3. 用户偏好设置
onLoad() {
  const userSettings = wx.getStorageSync('userSettings') || {};
  this.setData({ staticMode: userSettings.disableAnimations });
}
```

完整示例代码请参考项目中的 `soup-display` 组件实现。
