# 数据流管理指南

## 🎯 核心原则

### 1. 数据归属明确
- **userInfo/userId** → `userStore` 管理
- **soupData/soupId** → `soupStore` 管理  
- **chatData/dialogId/messages** → `chatStore` 管理

### 2. 访问路径统一
- **UI 组件**：优先通过 `rootStore` 访问核心数据
- **Store 之间**：通过 `rootStore` 访问其他 Store 的数据
- **操作方法**：仍在各自的 Store 中，保持职责分离

## 📊 数据访问映射

### 用户数据
```javascript
// ✅ 推荐：通过 rootStore 统一访问
const userId = rootStore.userId;
const userInfo = rootStore.userInfo;
const isLoggedIn = rootStore.isLoggedIn;

// ❌ 不推荐：直接访问子 Store
const userId = rootStore.userStore.userId;
```

### 汤面数据
```javascript
// ✅ 推荐：通过 rootStore 统一访问
const soupData = rootStore.soupData;
const soupId = rootStore.soupId;
const soupLoading = rootStore.soupLoading;

// ❌ 不推荐：直接访问子 Store
const soupData = rootStore.soupStore.soupData;
```

### 聊天数据
```javascript
// ✅ 推荐：通过 rootStore 统一访问
const dialogId = rootStore.dialogId;
const chatState = rootStore.chatState;
const messages = rootStore.messages;

// ❌ 不推荐：直接访问子 Store
const dialogId = rootStore.chatStore.dialogId;
```

## 🔄 操作方法调用

### 用户操作
```javascript
// ✅ 直接调用对应 Store 的方法
await rootStore.userStore.login();
await rootStore.userStore.toggleLike(soupId);
```

### 汤面操作
```javascript
// ✅ 直接调用对应 Store 的方法
await rootStore.soupStore.fetchSoup(soupId);
await rootStore.soupStore.toggleFavorite(soupId);
```

### 聊天操作
```javascript
// ✅ 直接调用对应 Store 的方法
await rootStore.chatStore.getChatData(userId, soupId);
await rootStore.chatStore.sendMessage(content);
```

## 🏗️ Store 内部数据访问

### 在子 Store 中访问其他数据
```javascript
class SoupStore {
  // ✅ 推荐：通过 rootStore 统一接口访问
  get userId() {
    return this.rootStore?.userId || '';
  }
  
  get isLoggedIn() {
    return this.rootStore?.isLoggedIn || false;
  }
}

class ChatStore {
  // ✅ 推荐：通过 rootStore 统一接口访问
  get soupData() {
    return this.rootStore?.soupData || null;
  }
  
  get soupId() {
    return this.rootStore?.soupId || '';
  }
}
```

## 📝 组件使用示例

### 小程序页面组件
```javascript
// pages/chat/chat.js
const { rootStore } = require('../../stores/index');

Page({
  data: {},
  
  onLoad(options) {
    // ✅ 通过 rootStore 访问数据
    const userId = rootStore.userId;
    const soupId = rootStore.soupId;
    
    // ✅ 调用对应 Store 的方法
    if (userId && soupId) {
      rootStore.chatStore.getChatData(userId, soupId);
    }
  },
  
  async onSendMessage(event) {
    const content = event.detail.content;
    // ✅ 调用对应 Store 的方法
    await rootStore.chatStore.sendMessage(content);
  }
});
```

### 自定义组件
```javascript
// components/soup-display/soup-display.js
const { rootStore } = require('../../stores/index');

Component({
  data: {},
  
  lifetimes: {
    attached() {
      // ✅ 通过 rootStore 访问数据
      this.setData({
        soupData: rootStore.soupData,
        isLoggedIn: rootStore.isLoggedIn
      });
    }
  },
  
  methods: {
    async onLike() {
      const soupId = rootStore.soupId;
      // ✅ 调用对应 Store 的方法
      const result = await rootStore.soupStore.toggleLike(soupId);
      
      if (result.success) {
        wx.showToast({ title: result.message });
      }
    }
  }
});
```

## ⚠️ 注意事项

1. **数据一致性**：始终通过 rootStore 访问核心数据，确保数据源唯一
2. **职责分离**：操作方法仍在各自的 Store 中，不要在 rootStore 中重复实现
3. **响应式更新**：MobX 会自动处理计算属性的响应式更新，无需手动管理
4. **错误处理**：始终使用可选链操作符 `?.` 防止空指针异常

## 🚀 优势

1. **统一的数据访问接口**：减少组件对具体 Store 实现的依赖
2. **清晰的数据流向**：UI → rootStore → 具体 Store → Service
3. **易于维护**：数据访问路径一致，便于重构和调试
4. **类型安全**：统一的接口便于添加类型定义
