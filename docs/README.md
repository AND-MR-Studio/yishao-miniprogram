# 汤面小程序

## 项目简介
「汤面小程序」是一款专为微信平台打造的海龟汤游戏应用，让用户随时随地与AI进行海龟汤谜题互动。

## 技术架构

### 服务器配置
- 支持开发/生产环境切换
- API基础路径：
  - 开发环境：`http://localhost:8081/api/soups`
  - 生产环境：`http://71.137.1.230:8081/api/soups`

### 核心模块
```
├── components/         # 组件目录
│   ├── soup-display/   # 汤面展示组件
│   ├── dialog-area/    # 对话区域组件
│   ├── input-bar/      # 输入栏组件
│   ├── nav-bar/        # 导航栏组件
│   ├── setting-card/   # 设置卡片组件
│   └── button/         # 按钮组件
├── pages/              # 页面目录
│   ├── index/          # 首页
│   ├── dialog/         # 对话页
│   ├── mine/           # 我的页面
│   ├── gensoup/      # 社区页面
│   └── admin/          # 管理页面
├── utils/              # 工具目录
│   ├── soupService.js  # 汤面数据服务（含环境配置、数据缓存）
│   └── typeAnimation.js # 打字机动画工具
├── static/             # 静态资源目录
├── images/             # 图像资源目录
└── styles/             # 全局样式目录
```

### 模块说明

#### 1. 汤面展示组件 (soup-display)
- 负责汤面内容的展示和动画效果
- 提供流畅的打字机动画效果
- 支持静态/动态展示模式切换
- 可自定义光标样式和动画参数
- 提供完整的动画控制接口

#### 2. 对话区域组件 (dialog-area)
- 管理用户与AI的对话交流
- 支持多种对话气泡样式
- 实现自动滚动和历史记录

#### 3. 汤面数据服务 (soupService)
- 支持多环境配置切换
- 实现数据缓存和自动更新
- 提供环境切换接口 `switchEnvironment()`
- 支持数据刷新 `refreshSoups()`
- 自动处理网络异常和本地回退
- 管理汤面数据的获取和缓存
- 提供数据加载和查询接口
- 支持按ID获取指定汤面
- 处理数据加载失败的后备方案

#### 4. 打字机动画工具 (typeAnimation)
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
- 自定义光标样式

### 2. 对话交互
- 与AI进行海龟汤问答
- 主页汤面预览
- 对话页完整阅读
- 动画完成后显示操作按钮
- 支持页面间数据传递

### 3. 用户系统
- 个人中心页面
- 收藏喜爱的汤面
- 历史记录查看
- 用户设置管理

### 4. 性能优化
- 静态模式支持（跳过动画）
- 组件状态智能管理
- 数据加载失败后备方案
- 分包加载减少初始化时间

## 使用说明

### 主页配置
```javascript
// pages/index/index.js
Page({
  data: {
    soupConfig: {
      autoPlay: true,        // 自动播放动画
      staticMode: false,     // 静态模式（跳过动画）
      titleTypeSpeed: 80,    // 标题打字速度
      contentTypeSpeed: 60   // 内容打字速度
    }
  },
  
  onSoupAnimationComplete() {
    // 动画完成后的处理逻辑
  }
});
```

### 对话页配置
```javascript
// pages/dialog/dialog.js
Page({
  data: {
    soupConfig: {
      useDefaultOnly: false,  // 是否仅使用默认汤面
      autoPlay: true,         // 自动播放
      staticMode: true        // 对话页默认使用静态模式
    }
  },
  
  // 发送用户输入到AI
  sendUserInput(input) {
    // 调用AI交互相关接口
  }
});
```

### 组件使用
```html
<soup-display 
  id="soupDisplay"
  soupId="{{soupId}}"
  useDefaultOnly="{{soupConfig.useDefaultOnly}}"
  autoPlay="{{soupConfig.autoPlay}}"
  staticMode="{{soupConfig.staticMode}}"
  titleTypeSpeed="{{soupConfig.titleTypeSpeed}}"
  contentTypeSpeed="{{soupConfig.contentTypeSpeed}}"
  bind:loadSuccess="onSoupLoadSuccess"
  bind:animationComplete="onSoupAnimationComplete"
/>
```

## 后端API需求

### 1. 汤面数据接口
```
GET /api/v1/soups/:soupId       // 获取指定汤面
GET /api/v1/soups/random        // 获取随机汤面
POST /api/v1/soups/:soupId/view // 记录汤面查看
GET /api/v1/soups/view-status   // 获取查看状态
```

### 2. 用户交互接口
```
POST /api/v1/dialog/message     // 发送对话消息
GET /api/v1/dialog/:dialogId    // 获取对话历史
POST /api/v1/soups/:soupId/favorite  // 收藏汤面
GET /api/v1/user/favorites      // 获取收藏列表
```

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
   - [ ] 社区互动功能

