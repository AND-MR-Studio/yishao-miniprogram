# 微信小程序打字机动画工具

一个简洁高效的打字机动画工具，适用于微信小程序，为文本内容提供逐字打印的打字机效果，支持普通和发光两种效果。

## 功能特点

- 逐字符动画效果，模拟真实打字机
- 支持多行文本内容
- 标点符号自动停顿，模拟自然阅读节奏
- 支持两种效果类型：普通和发光
- 简单配置，仅需设置打字速度和效果类型
- 支持暂停、继续、重置等控制功能
- 支持直接显示完整内容
- 兼容多种数据格式输入

## 安装使用

1. 将 `typeAnimation.js` 文件复制到你的项目 `utils` 目录中
2. 将所需的CSS样式添加到你的项目样式文件中（见下方CSS示例）
3. 在需要使用的页面或组件中引入并使用

## 基本用法

### 1. 引入工具

```javascript
const typeAnimation = require('../../utils/typeAnimation');
```

### 2. 创建实例

```javascript
// 在组件或页面的生命周期函数中初始化
attached() {
  this.typeAnimator = typeAnimation.createInstance(this, {
    typeSpeed: 60,               // 打字速度（毫秒/字）
    typeEffect: 'glow',          // 效果类型：'normal'或'glow'，默认'glow'
    onAnimationStart: () => this.triggerEvent('animationStart'),
    onAnimationComplete: () => this.triggerEvent('animationComplete')
  });
}
```

### 3. 开始动画

```javascript
// 字符串方式
this.typeAnimator.start("这是一段测试文本\n这是第二行");

// 数组方式
this.typeAnimator.start(["第一行", "第二行", "第三行"]);

// 对象方式（如汤面数据格式）
this.typeAnimator.start({
  title: "标题文本",
  contentLines: ["第一行内容", "第二行内容"]
});
```

### 4. WXML模板示例

```html
<view class="content-area">
  <block wx:for="{{displayLines}}" wx:key="index">
    <view class="text-line-container {{index === 0 ? 'title' : ''}}">
      <text class="text-line {{index === 0 ? 'title' : ''}}">
        <text 
          wx:for="{{item.chars}}" 
          wx:for-item="char"
          wx:for-index="charIndex"
          wx:key="charIndex" 
          class="char-typing {{char.show ? 'show' : ''}} {{char.active ? 'active effect-' + typeEffect : ''}} {{char.prev ? 'prev' : ''}}"
        >{{char.char}}</text>
      </text>
    </view>
  </block>
</view>
```

### 5. 所需的CSS样式

```css
/* 打字机字符动画通用类 */
.char-typing {
  display: inline-block;
  opacity: 0;
  transform: scale(0.9);
  transition: all 160ms cubic-bezier(0.215, 0.610, 0.355, 1.000);
  position: relative;
}

/* 普通显示状态 */
.char-typing.show {
  opacity: 1;
  transform: scale(1);
}

/* 活跃状态 - 普通打字机 */
.char-typing.active.effect-normal {
  opacity: 1;
  transform: scale(1);
  color: var(--color-text-primary);
}

/* 活跃状态 - 发光打字机 */
.char-typing.active.effect-glow {
  opacity: 1;
  transform: scale(1.05);
  text-shadow: 0 0 8rpx var(--color-primary);
  color: #fff;
}

/* 前一个字符状态 - 刚刚输入完的字符 */
.char-typing.prev {
  opacity: 0.9;
  transform: scale(1);
  transition: all 200ms cubic-bezier(0.215, 0.610, 0.355, 1.000);
}
```

## API 参考

### 创建实例

```javascript
typeAnimation.createInstance(component, options)
```

#### 参数

- `component`: 组件实例，需要有setData方法
- `options`: 配置选项对象
  - `typeSpeed`: 打字速度（毫秒/字），默认60
  - `typeEffect`: 效果类型，'normal'或'glow'，默认'glow'
  - `onAnimationStart`: 动画开始回调函数
  - `onAnimationComplete`: 动画完成回调函数

### 实例方法

#### 开始动画

```javascript
typeAnimator.start(data)
```

开始打字机动画，data可以是字符串、数组或对象。

#### 暂停动画

```javascript
typeAnimator.pause()
```

暂停当前正在执行的动画。

#### 重置动画

```javascript
typeAnimator.reset()
```

重置动画状态，清空显示内容。

#### 立即显示完整内容

```javascript
typeAnimator.showComplete(data)
```

不执行动画，直接显示完整内容。

#### 设置效果类型

```javascript
typeAnimator.setTypeEffect(effectType)
```

设置打字机效果类型，参数为'normal'或'glow'。

```javascript
// 设置为普通打字机效果
typeAnimator.setTypeEffect('normal');

// 设置为发光打字机效果
typeAnimator.setTypeEffect('glow');
```

#### 更新打字速度

```javascript
typeAnimator.updateSpeed(speed)
```

更新打字机动画的速度，参数为毫秒/字符。

#### 获取效果类型

```javascript
const effectTypes = typeAnimator.getTypeEffects();
// 返回 { NORMAL: 'normal', GLOW: 'glow' }
```

#### 销毁实例

```javascript
typeAnimator.destroy()
```

清理资源，组件销毁时调用。

## 数据格式

打字机动画支持以下几种数据格式：

1. **字符串**：包含换行符的多行文本
2. **数组**：每个元素为一行文本
3. **对象**：包含 `title` 和 `contentLines` 属性的对象

## 页面状态变量

工具会设置以下状态变量，可在页面中使用：

- `displayLines`: 显示的行数组
- `currentLineIndex`: 当前处理的行索引
- `lineAnimationComplete`: 当前行动画是否完成
- `animationComplete`: 整个动画是否完成
- `isAnimating`: 是否正在动画中
- `typeEffect`: 打字效果类型，'normal'或'glow'

## 应用场景

- 对话框文字逐字显示
- 故事情节展示
- 引导页面说明
- 教程步骤讲解
- 任何需要引起用户注意的文本内容

## 效果类型应用场景

- `normal`: 适用于普通文本展示，清晰自然
- `glow`: 适用于重要内容强调，引起用户注意

## 性能优化提示

1. 对于长文本，可以考虑使用 `showComplete` 方法直接显示
2. 在低端设备上，可以使用 `normal` 效果类型替代 `glow` 效果
3. 适当增加打字速度，减少动画时间

## 兼容性

此工具已在微信小程序基础库 2.10.0 及以上版本测试通过。 