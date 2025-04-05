# 汤面组件 (soup-display)

## 简介

汤面组件是一个专门用于展示恐怖/悬疑风格短文本的微信小程序组件。它提供了可配置的打字机动画效果，支持动态加载汤面数据，并且可以根据需要切换静态/动态显示模式。

## 特性

- 🎬 流畅的打字机动画效果
- 🔄 支持动态加载和切换汤面
- ⚡ 静态/动态显示模式切换
- 🎨 可自定义光标样式
- 🎮 完整的动画控制接口
- 🔧 高度可配置的动画参数

## 架构设计

组件采用三层架构设计，实现关注点分离：

```
soup-display（展示层）
    ├── typeAnimation（动画层）
    └── soupService（数据层）
```

## 属性配置

| 属性名 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| soupId | String | '' | 指定要显示的汤面ID |
| autoPlay | Boolean | true | 是否自动播放动画 |
| titleTypeSpeed | Number | 80 | 标题打字速度(ms/字) |
| contentTypeSpeed | Number | 60 | 内容打字速度(ms/字) |
| lineDelay | Number | 500 | 行间延迟(ms) |
| punctuationDelay | Number | 2.5 | 标点符号延迟倍数 |
| staticMode | Boolean | false | 静态模式(不显示动画) |
| cursorColor | String | '' | 自定义光标颜色 |

## 事件系统

| 事件名 | 触发时机 | 回调参数 |
|-------|---------|---------|
| loadStart | 开始加载数据 | - |
| loadSuccess | 数据加载成功 | { soupData } |
| loadFail | 数据加载失败 | { error } |
| loadComplete | 数据加载完成 | - |
| contentChange | 内容变化时 | { soupId, title, contentLines } |
| animationStart | 动画开始 | - |
| animationPause | 动画暂停 | - |
| animationReset | 动画重置 | - |
| animationComplete | 动画完成 | - |

## API 接口

### 数据控制
- `loadSoupData()`: 加载汤面数据
- `setCurrentSoup(soup)`: 设置当前汤面
- `getSoupData()`: 获取当前汤面数据

### 动画控制
- `startAnimation()`: 开始动画
- `pauseAnimation()`: 暂停动画
- `resetAnimation()`: 重置动画

## 使用示例

### 基础用法

```html
<soup-display 
  id="soupDisplay"
  soupId="{{soupId}}"
  autoPlay="{{true}}"
  bind:loadSuccess="onSoupLoadSuccess"
  bind:animationComplete="onAnimationComplete"
/>
```

### 完整配置

```html
<soup-display 
  id="soupDisplay"
  soupId="{{soupId}}"
  autoPlay="{{true}}"
  titleTypeSpeed="{{80}}"
  contentTypeSpeed="{{60}}"
  lineDelay="{{500}}"
  punctuationDelay="{{2.5}}"
  staticMode="{{false}}"
  cursorColor="#FF0000"
  bind:loadStart="onSoupLoadStart"
  bind:loadSuccess="onSoupLoadSuccess"
  bind:loadFail="onSoupLoadFail"
  bind:loadComplete="onSoupLoadComplete"
  bind:contentChange="onSoupContentChange"
  bind:animationStart="onSoupAnimationStart"
  bind:animationComplete="onSoupAnimationComplete"
  bind:animationPause="onSoupAnimationPause"
  bind:animationReset="onSoupAnimationReset"
/>
```

### 页面逻辑示例

```javascript
Page({
  data: {
    soupId: 'default_001'
  },

  onLoad() {
    this.soupDisplay = this.selectComponent('#soupDisplay');
  },

  // 开始喝汤
  onStartSoup() {
    if (!this.soupDisplay) return;
    
    const soupData = this.soupDisplay.getSoupData();
    if (!soupData?.soupId) return;
    
    wx.navigateTo({
      url: `/pages/dialog/dialog?soupId=${soupData.soupId}`
    });
  },

  // 切换下一个汤面
  onNextSoup() {
    if (this.soupDisplay) {
      this.soupDisplay.loadSoupData();
    }
  },

  // 事件处理
  onSoupLoadSuccess({ detail }) {
    console.log('汤面加载成功:', detail.soupData);
  },

  onAnimationComplete() {
    console.log('动画播放完成');
  }
});
```

## 最佳实践

1. **数据加载**
   - 使用 `soupId` 属性指定要显示的汤面
   - 监听 `loadSuccess` 和 `loadFail` 事件处理加载结果

2. **动画控制**
   - 使用 `staticMode` 在需要时禁用动画
   - 监听 `animationComplete` 事件处理后续逻辑

3. **性能优化**
   - 避免频繁切换 `staticMode`
   - 合理设置动画速度和延迟参数

4. **错误处理**
   - 监听 `loadFail` 事件处理加载失败情况
   - 组件会自动使用第一个汤面作为后备方案

## 注意事项

1. 静态模式下会直接显示完整内容，跳过动画效果
2. 设置汤面数据时必须包含完整的数据结构
3. 页面跳转时建议使用 `soupId` 传递数据
4. `cursorColor` 为空时使用主题默认颜色
5. 动画完成后会触发 `animationComplete` 事件

## 后续优化计划

1. 支持更多动画效果和过渡方式
2. 添加更多自定义样式选项
3. 优化动画性能和内存占用
4. 增强错误处理机制
5. 支持更多交互事件和手势控制 