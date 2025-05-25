# UserStore 架构优化总结

## 优化目标

解决 rootStore 和 userStore 之间的循环调用、重复数据同步和性能问题。

## 主要优化内容

### 1. 数据流向优化

**优化前的问题：**
- userStore.syncUserInfo() 调用 rootStore.setUserInfo()
- rootStore.syncUserInfo() 委托给 userStore.syncUserInfo()
- 存在循环调用风险和重复数据存储

**优化后的架构：**
```
Service层 → UserStore → RootStore (计算属性引用)
```

- **单一数据源**：userInfo 只在 userStore 中存储
- **计算属性引用**：rootStore 通过计算属性获取 userStore 的数据
- **避免循环调用**：移除 rootStore.setUserInfo() 调用

### 2. RootStore 优化

#### 计算属性重构
```javascript
// 优化前：重复存储
userInfo = null; // rootStore 中的副本
setUserInfo(info) { this.userInfo = info; }

// 优化后：计算属性引用
get userInfo() {
  return this.userStore?.userInfo || null;
}

get userId() {
  return this.userStore?.userId || '';
}

get isLoggedIn() {
  return this.userStore?.isLoggedIn || false;
}
```

#### 同步方法优化
```javascript
// 优化后：安全的委托调用
*syncUserInfo() {
  if (!this.userStore) {
    console.warn('userStore 未初始化');
    return { success: false, error: 'userStore 未初始化' };
  }
  
  try {
    return yield this.userStore.syncUserInfo();
  } catch (error) {
    console.error('rootStore.syncUserInfo 调用失败:', error);
    return { success: false, error: '同步用户信息失败' };
  }
}
```

### 3. UserStore 优化

#### 防重复调用机制
```javascript
*syncUserInfo() {
  // 防止重复调用
  if (this.isLoading) {
    console.log('用户信息正在同步中，跳过重复调用');
    return { success: false, error: '正在同步中' };
  }
  
  // ... 同步逻辑
}
```

#### 数据变化检测
```javascript
// 检查数据是否有变化，避免不必要的更新
const hasChanged = JSON.stringify(this.userInfo) !== JSON.stringify(result.data);
if (hasChanged) {
  this.userInfo = result.data;
  console.log('用户信息已更新');
} else {
  console.log('用户信息无变化，跳过更新');
}
```

#### 移除循环依赖
```javascript
// 优化前：存在循环调用
this.userInfo = result.data;
this.rootStore.setUserInfo(result.data); // 移除此调用

// 优化后：单向数据流
this.userInfo = result.data; // 只更新 userStore
// rootStore 通过计算属性自动获取最新数据
```

### 4. 调用方式修正

#### 页面调用优化
```javascript
// 优化前：可能导致循环调用
await rootStore.syncUserInfo();

// 优化后：直接调用数据源
await rootStore.userStore.syncUserInfo();
```

## 性能提升

### 1. 减少重复网络请求
- 防重复调用机制避免同时发起多个同步请求
- 数据变化检测避免不必要的状态更新

### 2. 优化 MobX 响应式更新
- 使用计算属性实现自动响应式更新
- 减少手动状态同步，降低组件重渲染频率

### 3. 内存优化
- 消除重复数据存储
- 单一数据源减少内存占用

## 架构优势

### 1. 清晰的数据流向
```
userService → userStore (单一数据源) → rootStore (计算属性) → 页面组件
```

### 2. 避免循环依赖
- userStore 不再调用 rootStore.setUserInfo()
- rootStore 通过计算属性被动获取数据
- 明确的单向数据流

### 3. 更好的可维护性
- 用户信息的所有操作都在 userStore 中
- rootStore 只作为访问入口和子 Store 容器
- 职责分离更加清晰

## 向后兼容性

优化后的架构保持了对外接口的兼容性：
- `rootStore.userInfo` 仍然可用（通过计算属性）
- `rootStore.syncUserInfo()` 仍然可用（委托给 userStore）
- 页面组件无需修改绑定代码

## 注意事项

1. **初始化顺序**：确保 userStore 在 rootStore 构造函数中正确初始化
2. **错误处理**：在 rootStore 的委托方法中添加了安全检查
3. **日志记录**：增加了详细的日志记录，便于调试和监控
4. **性能监控**：可以通过日志观察数据同步的频率和效果

## 测试建议

1. 测试用户登录/退出流程
2. 验证数据同步的防重复机制
3. 检查页面组件的响应式更新
4. 确认内存使用情况的改善
