# 汤面组件 (soup-display)

## 简介

汤面组件是一个可配置的打字机效果文本展示组件，用于展示恐怖/悬疑风格的短文本，支持从后台动态获取汤面数据，或使用默认汤面数据。组件采用模块化设计，将数据服务和动画效果解耦，便于维护和扩展。

## 架构设计

组件采用三层架构设计，实现了关注点分离：

1. **展示层 (soup-display)**: 负责UI渲染和事件触发
2. **动画层 (typeAnimation)**: 提供打字机动画效果
3. **数据层 (soupService)**: 处理数据加载和默认数据管理

### 组件依赖关系

```
soup-display.js
    ├── typeAnimation.js (动画服务)
    └── soupService.js   (数据服务)
```

## 功能特性

- 打字机逐字显示效果
- 自动从后台加载汤面数据
- 加载失败时自动降级为默认汤面
- 可配置的打字速度、行间延迟
- 丰富的事件通知
- 完全组件化，低耦合设计
- 支持动画控制（开始、暂停、重置）

## 完整数据流过程

### 1. 初始化阶段

```
页面初始化 → 汤面组件创建 → attached生命周期 → 初始化动画工具
    ↓                                         
检查autoLoad属性 → 自动加载数据或使用默认汤面
```

### 2. 数据加载阶段

```
loadSoupData() → 设置loading=true → 触发loadStart事件
    ↓
soupService.getSoupData() → 获取汤面数据 → 返回数据或默认汤面
    ↓
设置currentSoup → 触发loadSuccess事件 → 触发loadComplete事件
```

### 3. 动画展示阶段

```
autoPlay=true → startAnimation() → typeAnimator.start() → 触发animationStart事件
    ↓
动画进行 → 逐字显示标题 → 逐行逐字显示内容
    ↓
动画完成 → 触发animationComplete事件
```

## 属性说明

| 属性名 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| useDefaultOnly | Boolean | false | 是否只使用默认汤面，忽略后台数据 |
| autoPlay | Boolean | true | 是否自动播放动画 |
| titleTypeSpeed | Number | 150 | 标题打字速度（毫秒/字） |
| contentTypeSpeed | Number | 100 | 内容打字速度（毫秒/字） |
| lineDelay | Number | 800 | 行间延迟（毫秒） |
| autoLoad | Boolean | true | 组件初始化时是否自动加载数据 |

## 事件说明

| 事件名 | 说明 | 回调参数 |
|-------|------|---------|
| loadStart | 开始加载数据 | - |
| loadSuccess | 数据加载成功 | { soupData } |
| loadFail | 数据加载失败 | { error } |
| loadComplete | 数据加载完成 | - |
| contentChange | 内容发生变化 | { soupId, title, contentLines } |
| animationStart | 动画开始播放 | - |
| animationPause | 动画暂停 | - |
| animationReset | 动画重置 | - |
| animationComplete | 动画播放完成 | - |

## 方法说明

| 方法名 | 说明 | 参数 | 返回值 |
|-------|------|------|-------|
| loadSoupData | 从后台加载汤面数据 | - | - |
| setCurrentSoup | 设置当前汤面 | soup: Object | Boolean |
| clearCurrentSoup | 恢复使用默认汤面 | - | Boolean |
| updateDefaultSoup | 更新默认汤面 | soup: Object | Boolean |
| startAnimation | 开始动画 | - | - |
| pauseAnimation | 暂停动画 | - | - |
| resetAnimation | 重置动画 | - | - |
| getSoupData | 获取当前汤面数据 | - | Object |

## 使用示例

### 基本使用

```html
<soup-display />
```

### 高级配置

```html
<soup-display 
  id="soupDisplay"
  useDefaultOnly="{{false}}"
  autoPlay="{{true}}"
  titleTypeSpeed="{{150}}"
  contentTypeSpeed="{{100}}"
  lineDelay="{{800}}"
  autoLoad="{{true}}"
  bind:loadStart="onSoupLoadStart"
  bind:loadSuccess="onSoupLoadSuccess"
  bind:loadFail="onSoupLoadFail"
  bind:loadComplete="onSoupLoadComplete"
  bind:contentChange="onSoupContentChange"
  bind:animationStart="onSoupAnimationStart"
  bind:animationComplete="onSoupAnimationComplete"
/>
```

### 方法调用

```javascript
// 获取组件实例
const soupDisplay = this.selectComponent('#soupDisplay');

// 手动加载数据
soupDisplay.loadSoupData();

// 设置自定义汤面
soupDisplay.setCurrentSoup({
  soupId: 'custom_001',
  title: '《自定义汤面》',
  contentLines: [
    '第一行文本',
    '第二行文本',
    '最后一行'
  ]
});

// 恢复使用默认汤面
soupDisplay.clearCurrentSoup();

// 控制动画
soupDisplay.startAnimation();
soupDisplay.pauseAnimation();
soupDisplay.resetAnimation();
```

## 汤面数据格式

汤面数据对象格式如下：

```javascript
{
  soupId: 'soup_001',      // 汤面唯一标识
  title: '《汤面标题》',    // 汤面标题
  contentLines: [          // 汤面内容行数组
    '第一行文本',
    '第二行文本',
    '最后一行'
  ]
}
```

## 如何扩展

### 自定义数据源

可以通过修改 `utils/soupService.js` 文件中的 `getSoupData` 方法来自定义数据源：

```javascript
getSoupData: function(options = {}) {
  const { success, fail, complete } = options;
  
  // 使用云开发获取数据
  wx.cloud.callFunction({
    name: 'getSoup',
    data: {},
    success: res => {
      // 如果获取到有效数据，返回后台数据；否则返回默认汤面
      const resultData = (res.result && res.result.data) ? res.result.data : this.defaultSoup;
      if (typeof success === 'function') {
        success(resultData);
      }
    },
    fail: err => {
      if (typeof fail === 'function') {
        fail(err);
      }
    },
    complete: () => {
      if (typeof complete === 'function') {
        complete();
      }
    }
  });
}
```

### 自定义默认汤面

可以通过soupService的updateDefaultSoup方法更新默认汤面：

```javascript
soupService.updateDefaultSoup({
  soupId: 'custom_default',
  title: '《自定义默认汤面》',
  contentLines: [
    '这是自定义的',
    '默认汤面内容'
  ]
});
```

### 使用打字机动画工具

打字机动画工具是完全独立的，可以在其他组件中复用：

```javascript
const typeAnimation = require('../../utils/typeAnimation');

// 创建动画实例
const animator = typeAnimation.createInstance(this, {
  titleTypeSpeed: 150,
  contentTypeSpeed: 100,
  lineDelay: 800,
  onAnimationStart: () => {
    console.log('动画开始');
  },
  onAnimationComplete: () => {
    console.log('动画完成');
  }
});

// 开始动画
animator.start({
  title: '标题文本',
  contentLines: ['第一行', '第二行']
});

// 暂停动画
animator.pause();

// 重置动画
animator.reset();

// 销毁动画（在组件销毁时调用）
animator.destroy();
```

## 注意事项

1. 确保汤面数据格式正确，特别是 `contentLines` 必须是数组类型
2. 当 `useDefaultOnly` 设为 `true` 时，组件将不会请求后台数据
3. 自动播放（`autoPlay=true`）仅在数据加载完成后触发
4. 组件销毁时会自动清理动画资源，避免内存泄漏
5. 数据和动画逻辑已解耦，便于单独维护和测试 