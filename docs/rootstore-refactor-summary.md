# RootStore 架构重构总结

## 重构目标

移除 rootStore 中的冗余业务方法，让 UI 组件直接调用对应的具体 Store 方法，确保数据流向清晰：`UI → 具体Store → Service`，而非 `UI → rootStore → 具体Store → Service`。

## 重构内容

### 1. 移除的冗余方法

#### rootStore 中删除的方法：
- `toggleLikeSoup(soupId)` - 点赞切换方法转发器
- `toggleFavoriteSoup(soupId)` - 收藏切换方法转发器  
- `solveSoup(soupId)` - 解决汤面方法转发器
- `isLikedSoup(soupId)` - 点赞状态查询转发器
- `isFavoriteSoup(soupId)` - 收藏状态查询转发器
- `isSolvedSoup(soupId)` - 解决状态查询转发器
- `syncUserInfo()` - 用户信息同步转发器

### 2. 重构后的 rootStore 职责

#### 保留的核心功能：
- **Store 实例管理**：创建和管理所有子 Store 实例
- **全局状态协调**：管理跨 Store 的全局状态（如 `isFirstVisit`、`showGuide`）
- **计算属性引用**：通过计算属性提供对 userStore 数据的访问
- **跨 Store 数据流控制**：新增 `syncAllStores()` 方法用于全局同步

#### 新增方法：
```javascript
*syncAllStores() // 全局 Store 同步协调方法
```

### 3. soupStore 重构

#### 直接引用 userStore：
```javascript
// 重构前：通过 rootStore 访问
const currentStatus = this.rootStore.isLikedSoup(soupId);
const result = await this.rootStore.toggleLikeSoup(soupId);

// 重构后：直接访问 userStore
const currentStatus = this.userStore.isLikedSoup(soupId);
const result = await this.userStore.likeSoup(soupId, newStatus);
```

#### 优化的数据流：
- `toggleLike()` 方法直接调用 `userStore.likeSoup()` 和 `soupService.likeSoup()`
- `toggleFavorite()` 方法直接调用 `userStore.favoriteSoup()` 和 `soupService.favoriteSoup()`
- `fetchSoup()` 方法直接从 `userStore` 获取交互状态

### 4. stores/index.js 更新

#### 移除的导出：
- `syncUserInfo: rootStore.syncUserInfo.bind(rootStore)` - 已删除

#### 新增的导出：
- `userStore: rootStore.userStore` - 直接导出 userStore 实例

## 重构优势

### 1. **架构清晰**
- 消除了不必要的方法转发层
- 数据流向更加直观：`UI → 具体Store → Service`
- 符合 MobX 官方最佳实践

### 2. **职责单一**
- rootStore 专注于 Store 管理和全局协调
- 各个具体 Store 负责自己领域的业务逻辑
- UI 组件直接与相关 Store 交互

### 3. **性能优化**
- 减少了方法调用链的层级
- 避免了不必要的状态转发
- 提高了代码执行效率

### 4. **维护性提升**
- 减少了代码冗余
- 降低了修改成本
- 提高了代码可读性

## 迁移指南

### 对于现有 UI 组件：

#### 推荐的新用法：
```javascript
// 直接使用具体 Store
import { userStore, soupStore } from '../stores';

// 用户交互操作
const result = await userStore.likeSoup(soupId, true);
const result = await userStore.favoriteSoup(soupId, true);
const result = await userStore.solveSoup(soupId);

// 状态查询
const isLiked = userStore.isLikedSoup(soupId);
const isFavorite = userStore.isFavoriteSoup(soupId);
const isSolved = userStore.isSolvedSoup(soupId);

// 汤面操作
const result = await soupStore.toggleLike(soupId);
const result = await soupStore.toggleFavorite(soupId);
```

#### 向后兼容：
- rootStore 的计算属性（`userId`、`isLoggedIn`、`userInfo`）仍然可用
- 全局状态管理（`showGuide`、`toggleGuide`）保持不变

## 注意事项

1. **初始化顺序**：rootStore 初始化时直接调用 `userStore.syncUserInfo()`
2. **错误处理**：各 Store 方法需要自行处理错误，不再依赖 rootStore 的错误处理
3. **状态同步**：重要操作后建议调用 `userStore.syncUserInfo()` 同步最新状态
4. **组件绑定**：建议组件直接绑定所需的具体 Store，而非通过 rootStore

## 后续优化建议

1. 考虑进一步优化组件与 Store 的绑定粒度
2. 实现更细粒度的状态更新机制
3. 添加 Store 间的事件通信机制
4. 考虑实现乐观更新机制提升用户体验
