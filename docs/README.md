# 汤面小程序

## 项目简介
一个随时随地和ai玩海龟汤的微信小程序。

## 技术架构

### 核心模块
```
├── components/          # 组件目录
│   └── soup-display/   # 汤面展示组件
├── pages/              # 页面目录
│   ├── index/         # 主页
│   └── dialog/        # 对话页
└── utils/             # 工具目录
    ├── soupService.js # 汤面数据服务
    └── typeAnimation.js # 打字机动画工具
```

### 模块说明

#### 1. 汤面展示组件 (soup-display)
- 负责汤面内容的展示和动画效果
- 支持静态/动态展示模式
- 提供完整的动画控制接口
- 详细文档：[soup-display/README.md](../components/soup-display/README.md)

#### 2. 汤面数据服务 (soupService)
- 管理汤面数据的获取和缓存
- 提供数据加载和查询接口
- 支持按ID获取指定汤面
- 详细文档：[utils/README.md](../utils/README.md)

#### 3. 打字机动画工具 (typeAnimation)
- 提供仿机械打字机效果
- 支持字符级动画控制
- 可配置的动画参数
- 支持标点符号智能延迟

## 功能特性

### 1. 汤面展示
- 打字机效果逐字显示
- 支持标题和内容分开动画
- 智能标点符号延迟
- 可配置的动画速度

### 2. 页面交互
- 主页汤面预览
- 对话页完整阅读
- 动画完成后显示操作按钮
- 支持页面间数据传递

### 3. 性能优化
- 静态模式支持（跳过动画）
- 组件状态智能管理
- 数据加载失败后备方案

## 使用说明

### 主页配置
```javascript
// pages/index/index.js
Page({
  data: {
    soupConfig: {
      autoPlay: true,        // 自动播放动画
      staticMode: false      // 静态模式（跳过动画）
    }
  }
});
```

### 对话页配置
```javascript
// pages/dialog/dialog.js
Page({
  data: {
    soupConfig: {
      useDefaultOnly: false,
      autoPlay: true,
      staticMode: true      // 对话页默认使用静态模式
    }
  }
});
```

### 组件使用
```html
<soup-display 
  id="soupDisplay"
  useDefaultOnly="{{soupConfig.useDefaultOnly}}"
  autoPlay="{{soupConfig.autoPlay}}"
  staticMode="{{soupConfig.staticMode}}"
  bind:animationComplete="onSoupAnimationComplete"
/>
```

## 后端API需求

### 1. 汤面数据接口
```
GET /api/v1/soups/:soupId
GET /api/v1/soups/random
POST /api/v1/soups/:soupId/view
GET /api/v1/soups/view-status
```

详细API文档请参考：[utils/README.md](../utils/README.md)

## 开发计划

### 近期优化
1. 动画效果增强
   - [ ] 添加更多动画效果
   - [ ] 优化动画性能
   - [ ] 增加自定义样式选项

2. 数据管理优化
   - [ ] 实现本地数据缓存
   - [ ] 添加数据版本控制
   - [ ] 实现增量更新机制

3. 用户体验提升
   - [ ] 添加加载状态提示
   - [ ] 优化错误处理
   - [ ] 支持更多交互事件

### 长期规划
1. 后端对接
   - [ ] 实现完整的后端API
   - [ ] 添加用户系统
   - [ ] 支持数据同步

2. 功能扩展
   - [ ] 添加收藏功能
   - [ ] 支持分享功能
   - [ ] 添加用户反馈

## 注意事项

1. 组件使用
   - 确保正确配置组件属性
   - 注意处理动画完成事件
   - 合理使用静态模式

2. 数据处理
   - 使用 soupId 传递数据
   - 处理数据加载失败情况
   - 注意数据格式完整性

3. 性能优化
   - 合理使用静态模式
   - 避免频繁更新数据
   - 及时清理组件资源

