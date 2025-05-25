# UserStore 便捷方法重构总结

## 重构目标

优化用户交互方法的调用方式，让 UserStore 提供更直观的便捷方法（如 `toggleLike(soupId)`），而不是需要传入布尔值的方法（如 `likeSoup(soupId, isLike)`）。同时确保职责分明：UserStore 负责用户侧操作，SoupStore 通过 UserStore 处理用户交互。

## 重构内容

### 1. UserStore 新增便捷方法

#### 新增的切换方法：
```javascript
/**
 * 切换收藏状态 - 便捷方法
 * 自动判断当前状态并切换
 */
*toggleFavorite(soupId) {
  const currentStatus = this.isFavoriteSoup(soupId);
  return yield this.favoriteSoup(soupId, !currentStatus);
}

/**
 * 切换点赞状态 - 便捷方法
 * 自动判断当前状态并切换
 */
*toggleLike(soupId) {
  const currentStatus = this.isLikedSoup(soupId);
  return yield this.likeSoup(soupId, !currentStatus);
}
```

#### 保留的基础方法：
- `favoriteSoup(soupId, isFavorite)` - 基础收藏方法
- `likeSoup(soupId, isLike)` - 基础点赞方法
- `solveSoup(soupId)` - 标记解决方法

#### 状态查询方法：
- `isFavoriteSoup(soupId)` - 检查收藏状态
- `isLikedSoup(soupId)` - 检查点赞状态
- `isSolvedSoup(soupId)` - 检查解决状态

### 2. SoupStore 重构

#### 更新调用方式：
```javascript
// 重构前：需要计算状态并传入布尔值
const newStatus = !this.userStore.isLikedSoup(soupId);
const userResult = yield this.userStore.likeSoup(soupId, newStatus);

// 重构后：直接调用便捷方法
const userResult = yield this.userStore.toggleLike(soupId);
```

#### 优化的数据流：
- `toggleLike()` 方法直接调用 `userStore.toggleLike()`
- `toggleFavorite()` 方法直接调用 `userStore.toggleFavorite()`
- 保持并行更新用户记录和汤面记录的逻辑

### 3. 组件层重构

#### interaction-footer 组件：
```javascript
// 重构前：调用 soupStore 的方法
const result = await soupStore.toggleFavorite(soupId);
const result = await soupStore.toggleLike(soupId);

// 重构后：直接调用 userStore 的便捷方法
const result = await userStore.toggleFavorite(soupId);
const result = await userStore.toggleLike(soupId);
```

#### index 页面双击收藏：
```javascript
// 重构前：调用 soupStore 的方法
await soupStore.toggleFavorite(soupStore.soupData.id);

// 重构后：直接调用 userStore 的便捷方法
await userStore.toggleFavorite(soupStore.soupData.id);
```

### 4. MobX 配置更新

#### UserStore makeAutoObservable 配置：
```javascript
makeAutoObservable(this, {
  // 标记异步方法为flow
  login: flow,
  logout: flow,
  updateAvatar: flow,
  updateUserProfile: flow,
  syncUserInfo: flow,
  favoriteSoup: flow,
  likeSoup: flow,
  solveSoup: flow,
  toggleFavorite: flow,  // 新增
  toggleLike: flow,      // 新增

  // 标记为非观察属性
  rootStore: false,
});
```

## 重构优势

### 1. 更直观的 API
- `userStore.toggleLike(soupId)` 比 `userStore.likeSoup(soupId, !currentStatus)` 更直观
- 减少了组件层需要计算状态的复杂度
- 方法名称更符合用户操作的语义

### 2. 职责更分明
- **UserStore**：专注于用户侧的所有操作（点赞、收藏、解决）
- **SoupStore**：专注于汤面数据管理和 UI 状态
- **组件层**：直接调用对应的 Store 方法，无需关心内部实现

### 3. 代码复用性
- 便捷方法可以在任何需要切换状态的地方使用
- 基础方法仍然保留，支持明确指定状态的场景
- 状态查询方法独立，可以在任何地方使用

### 4. 维护性提升
- 减少了重复的状态计算逻辑
- 统一的错误处理和消息返回
- 更清晰的数据流向：`UI → UserStore → Service`

## 使用示例

### 组件中的使用
```javascript
// 导入 userStore
const { userStore } = require('../../stores/index');

// 切换收藏状态
async handleFavoriteClick() {
  const result = await userStore.toggleFavorite(soupId);
  if (result.success) {
    wx.showToast({ title: result.message });
  }
}

// 切换点赞状态
async handleLikeClick() {
  const result = await userStore.toggleLike(soupId);
  if (result.success) {
    wx.showToast({ title: result.message });
  }
}

// 检查状态
const isFavorite = userStore.isFavoriteSoup(soupId);
const isLiked = userStore.isLikedSoup(soupId);
```

### 页面中的使用
```javascript
// 双击收藏
async handleDoubleTap() {
  if (soupStore.soupData?.id) {
    await userStore.toggleFavorite(soupStore.soupData.id);
  }
}
```

## 向后兼容性

- 保留了所有原有的基础方法（`favoriteSoup`, `likeSoup`, `solveSoup`）
- 新增的便捷方法不影响现有代码
- SoupStore 的对外接口保持不变，内部实现优化

## 注意事项

### 解决汤面功能
虽然 UserStore 中已经实现了 `solveSoup(soupId)` 方法，但目前前端还没有对应的 UI 组件来调用这个功能。chat.wxml 中引用的 `soup-truth` 组件实际上不存在。如果需要实现"标记为已解决"功能，需要：

1. 创建 soup-truth 组件
2. 在组件中添加"标记为已解决"按钮
3. 按钮点击时调用 `userStore.solveSoup(soupId)`

### 未来扩展
如果需要为解决汤面功能添加便捷方法，可以考虑添加：
```javascript
// UserStore 中添加
*toggleSolved(soupId) {
  const currentStatus = this.isSolvedSoup(soupId);
  if (currentStatus) {
    // 已解决的汤面通常不需要取消解决功能
    return { success: false, error: '汤面已标记为解决' };
  }
  return yield this.solveSoup(soupId);
}
```

## 总结

这次重构实现了更清晰的职责分离和更直观的 API 设计。UserStore 现在提供了完整的用户交互方法集合，包括便捷的切换方法和基础的操作方法，满足不同场景的需求。组件层可以直接调用 UserStore 的方法，无需通过 SoupStore 转发，数据流向更加清晰。
