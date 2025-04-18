# 一勺海龟汤微信小程序项目文档

## 项目简介
「一勺海龟汤」是一款专为微信平台打造的海龟汤游戏小程序，让用户随时随地与AI进行海龟汤谜题互动。海龟汤是一种推理游戏，玩家需要通过提问和推理来解开谜题的真相。本小程序提供了丰富的海龟汤谜题，并结合AI技术，为用户提供沉浸式的游戏体验。

## 功能特性

### 1. 核心玩法
- **喝汤模式**：用户可以浏览海龟汤谜题，通过打字机效果逐字显示
- **对话交互**：用户可以与AI进行问答，推理谜题真相
- **汤底揭秘**：解谜成功后，可以查看谜题的完整解析
- **煮汤功能**：用户可以创建自己的海龟汤谜题

### 2. 用户体验
- **流畅动画**：打字机效果逐字显示，支持标题和内容分开动画
- **智能交互**：AI理解用户提问并给出恰当回应
- **个性化设置**：可配置动画速度、显示模式等
- **偷看功能**：支持偷看汤底（谜底）

### 3. 社交功能
- **分享功能**：支持将谜题分享给好友
- **收藏系统**：收藏喜爱的汤面
- **历史记录**：查看历史解谜记录

### 4. 性能优化
- **静态模式**：可跳过动画直接显示内容
- **智能缓存**：本地缓存汤面数据，减少网络请求
- **分包加载**：优化小程序启动速度和资源占用

## 项目结构

```
├── components/           # 组件目录
│   ├── bubble/           # 对话气泡组件
│   ├── button/           # 自定义按钮组件
│   ├── dialog-area/      # 对话区域组件
│   ├── input-bar/        # 输入栏组件
│   ├── nav-bar/          # 导航栏组件
│   ├── setting-card/     # 设置卡片组件
│   ├── soup-display/     # 汤面展示组件
│   └── soup-truth/       # 汤底展示组件
├── custom-tab-bar/       # 自定义底部导航栏
├── pages/                # 页面目录
│   ├── index/            # 首页（喝汤页面）
│   ├── dialog/           # 对话页面
│   ├── gensoup/          # 煮汤页面
│   └── mine/             # 我的页面
├── utils/                # 工具目录
│   ├── api.js            # API请求封装
│   ├── dialogService.js  # 对话服务
│   ├── soupService.js    # 汤面数据服务
│   └── typeAnimation.js  # 打字机动画工具
├── styles/               # 全局样式目录
├── static/               # 静态资源目录
├── app.js                # 小程序入口文件
├── app.json              # 小程序配置文件
└── project.config.json   # 项目配置文件
```

### 环境变量
- **开发环境**
  - 用户服务：`http://localhost:3000`
  - 汤面服务：`http://localhost:8081/api/soups`
- **生产环境**
  - 用户服务：`http://14.103.193.11:3000`
  - 汤面服务：`http://14.103.193.11:8081/api/soups`

## 核心模块详解

### 1. 汤面展示模块
汤面展示组件（soup-display）负责海龟汤内容的展示和动画效果：
- **打字机效果**：逐字显示谜题内容，增强沉浸感
- **动态/静态切换**：支持动画模式和静态模式切换
- **自定义配置**：可配置动画速度、光标样式等参数
- **事件通知**：提供加载成功、动画完成等事件回调

```javascript
// 组件使用示例
<soup-display
  id="soupDisplay"
  soupId="{{soupId}}"
  autoPlay="{{true}}"
  staticMode="{{false}}"
  titleTypeSpeed="{{80}}"
  contentTypeSpeed="{{60}}"
  bind:loadSuccess="onSoupLoadSuccess"
  bind:animationComplete="onSoupAnimationComplete"
/>
```

### 2. 对话交互模块
对话区域组件（dialog-area）管理用户与AI的对话交流：
- **多样气泡样式**：区分用户和AI的对话气泡
- **自动滚动**：新消息自动滚动到可视区域
- **历史记录**：保存对话历史，支持回顾
- **状态反馈**：显示AI思考、输入状态等反馈

### 3. 数据服务模块
汤面数据服务（soupService）负责管理汤面数据：
- **多环境支持**：开发/生产环境配置切换
- **数据缓存**：本地缓存减少网络请求
- **异步加载**：Promise-based API设计
- **错误处理**：网络异常处理和本地回退机制
- **数据查询**：支持按ID获取、随机获取等多种查询方式

```javascript
// 数据服务使用示例
const soupService = require('../../utils/soupService');

// 异步加载汤面数据
async function loadSoup(soupId) {
  try {
    const soupData = await soupService.getSoupDataAsync(soupId);
    // 处理加载成功的数据
  } catch (error) {
    // 处理加载失败的情况
  }
}
```

### 4. 用户界面模块
- **自定义导航栏**：适配不同机型的顶部导航
- **自定义底部标签栏**：实现煮汤、喝汤、我的三大核心功能入口
- **响应式设计**：适配不同尺寸的设备屏幕

## 页面功能说明

### 1. 首页（喝汤页面）
- 展示海龟汤谜题内容
- 提供“开始喝汤”按钮进入对话模式
- 支持切换下一个汤面
- 集成分享功能

### 2. 对话页面
- 显示用户与AI的对话历史
- 提供输入框发送问题
- 支持查看汤底（谜底）
- 提供返回按钮回到汤面展示

### 3. 煮汤页面
- 允许用户创建自己的海龟汤谜题
- 提供谜题标题、内容、谜底等输入框
- 支持预览和发布功能

### 4. 我的页面
- 显示用户基本信息
- 提供收藏的汤面列表
- 历史记录查看
- 用户设置管理

## API接口说明

### 1. 汤面数据接口
```
GET /api/soups/list          // 获取汤面列表
GET /api/soups/:id           // 获取指定汤面
POST /api/soups/create       // 创建新汤面
PUT /api/soups/:id           // 更新汤面
DELETE /api/soups/:id        // 删除汤面
```

### 2. 用户交互接口
```
POST /api/dialog/message     // 发送对话消息
GET /api/dialog/:dialogId    // 获取对话历史
POST /api/user/favorite      // 收藏/取消收藏汤面
GET /api/user/favorites      // 获取收藏列表
```

## 开发指南

### 组件配置参数

#### 汤面展示组件 (soup-display)
| 参数名 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| soupId | String | '' | 汤面ID |
| autoPlay | Boolean | true | 是否自动播放动画 |
| staticMode | Boolean | false | 是否使用静态模式 |
| titleTypeSpeed | Number | 80 | 标题打字速度(ms) |
| contentTypeSpeed | Number | 60 | 内容打字速度(ms) |

#### 对话区域组件 (dialog-area)
| 参数名 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| visible | Boolean | false | 是否显示对话区域 |
| messages | Array | [] | 对话消息数组 |
| soupId | String | '' | 当前汤面ID |

### 事件处理

```javascript
// 页面中处理组件事件示例
Page({
  // 汤面加载成功事件
  onSoupLoadSuccess(e) {
    const { soupData } = e.detail;
    // 处理加载成功逻辑
  },

  // 动画完成事件
  onSoupAnimationComplete() {
    this.setData({ showButtons: true });
  },

  // 对话关闭事件
  onDialogClose() {
    this.setData({
      pageState: 'viewing',
      showButtons: true
    });
  }
});
```

## 未来规划

### 近期优化
1. **用户体验提升**
   - [ ] 添加加载状态动画
   - [ ] 优化错误提示界面
   - [ ] 增强打字机动画效果

2. **功能完善**
   - [ ] 完善用户登录系统
   - [ ] 增加汤面评分功能
   - [ ] 添加更多交互动画

3. **性能优化**
   - [ ] 优化网络请求策略
   - [ ] 完善本地缓存机制
   - [ ] 减少不必要的渲染

### 长期规划
1. **社区功能**
   - [ ] 用户汤面排行榜
   - [ ] 评论与互动系统
   - [ ] 用户成就系统

2. **AI能力增强**
   - [ ] 提升AI理解能力
   - [ ] 增加多轮对话记忆
   - [ ] 支持更复杂的推理场景

3. **平台拓展**
   - [ ] 支持H5网页版
   - [ ] 开发App版本
   - [ ] 多端数据同步

