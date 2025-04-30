# 对话服务（dialogService）

## 功能说明
对话服务是小程序的核心交互服务，负责处理用户与海龟汤的对话交互。采用RESTful API设计，提供简洁易用的接口，实现前后端分离。

## 服务器配置

### 后端服务器
- 本地开发环境：http://localhost:8080
- API基础路径：/api/dialog
- 本地管理页面：http://localhost:8080/html/dialog.html（待实现）

## 数据结构

### 对话消息数据结构
```javascript
{
    id: string,         // 消息唯一标识
    userId: string,     // 用户ID
    role: string,       // 消息角色（user/agent）
    content: string,    // 消息内容
    timestamp: number   // 消息时间戳
}
```

### 对话数据结构
```javascript
{
    dialogId: string,   // 对话唯一标识符
    soupId: string,     // 关联的汤面ID
    userId: string,     // 对话所属的用户ID
    messages: Array,    // 消息数组
    lastUpdated: number // 最后更新时间戳
}
```

## API 接口

### 1. 创建新对话
- **URL**: `/api/dialog/create`
- **方法**: `POST`
- **参数**:
  - `userId`: 用户ID
  - `soupId`: 汤面ID
- **响应**:
  - `dialogId`: 对话ID
  - `soupId`: 汤面ID
  - `userId`: 用户ID
  - `messages`: 消息数组（空）
  - `lastUpdated`: 最后更新时间戳

### 2. 发送消息
- **URL**: `/api/dialog/:dialogId/send`
- **方法**: `POST`
- **参数**:
  - `dialogId`: 对话ID（路径参数）
  - `userId`: 用户ID
  - `message`: 消息内容
  - `messageId`: 消息ID（可选）
  - `timestamp`: 时间戳（可选）
- **响应**:
  - `reply`: 回复内容
  - `message`: 回复消息对象
  - `dialogId`: 对话ID

### 3. 保存对话记录
- **URL**: `/api/dialog/:dialogId/save`
- **方法**: `POST`
- **参数**:
  - `dialogId`: 对话ID（路径参数）
  - `userId`: 用户ID
  - `messages`: 消息数组
- **响应**:
  - `message`: 保存结果

### 4. 获取所有对话记录
- **URL**: `/api/dialog/list`
- **方法**: `GET`
- **响应**:
  - `dialogs`: 对话数据数组
  - `total`: 对话总数

### 5. 获取特定对话记录
- **URL**: `/api/dialog/:dialogId`
- **方法**: `GET`
- **参数**:
  - `dialogId`: 对话ID（路径参数）
- **响应**:
  - `dialogId`: 对话ID
  - `soupId`: 汤面ID
  - `userId`: 用户ID
  - `messages`: 消息数组
  - `total`: 消息总数
  - `lastUpdated`: 最后更新时间戳

### 6. 获取用户的所有对话记录
- **URL**: `/api/dialog/user/:userId`
- **方法**: `GET`
- **参数**:
  - `userId`: 用户ID（路径参数）
- **响应**:
  - `dialogs`: 对话数据数组
  - `total`: 对话总数

### 7. 获取与特定汤面相关的对话
- **URL**: `/api/dialog/soup/:soupId`
- **方法**: `GET`
- **参数**:
  - `soupId`: 汤面ID（路径参数）
- **响应**:
  - `dialogs`: 对话数据数组
  - `total`: 对话总数

### 8. 获取用户特定汤面的对话记录
- **URL**: `/api/dialog/user/:userId/soup/:soupId`
- **方法**: `GET`
- **参数**:
  - `userId`: 用户ID（路径参数）
  - `soupId`: 汤面ID（路径参数）
- **响应**:
  - `dialogId`: 对话ID（如果存在）
  - `soupId`: 汤面ID
  - `userId`: 用户ID
  - `messages`: 消息数组
  - `total`: 消息总数
  - `lastUpdated`: 最后更新时间戳

### 9. 删除对话记录
- **URL**: `/api/dialog/:dialogId`
- **方法**: `DELETE`
- **参数**:
  - `dialogId`: 对话ID（路径参数）
- **响应**:
  - `message`: 删除结果

## 最佳实践

### 前端使用建议
1. **创建对话流程**：
   - 首先调用`/api/dialog/create`创建新对话，获取`dialogId`
   - 使用获取的`dialogId`进行后续的消息发送和保存操作
2. **使用异步API**：所有API都返回Promise，建议搭配async/await使用
3. **错误处理**：使用try/catch处理异步操作中可能的错误
4. **消息格式**：确保发送的消息格式符合要求，特别是role字段
5. **用户验证**：确保在发送消息前验证用户身份，只有对话所有者才能发送消息

### 后端实现说明
1. **RESTful设计**：API遵循RESTful设计规范，使用HTTP方法表达操作语义
2. **统一响应格式**：所有API返回统一的响应格式，包含success字段和data/error字段
3. **错误处理**：所有API都有完善的错误处理，返回合适的HTTP状态码和错误信息
4. **数据验证**：所有写操作都有输入验证，确保数据完整性
5. **用户关联**：每个对话只关联一个用户，确保数据隔离和安全

## 关键概念

### 对话ID与汤面ID的关系
- **对话ID (dialogId)**：对话的唯一标识符，格式为`dialog_时间戳`
- **汤面ID (soupId)**：关联的汤面（谜题内容）的ID，一个汤面可以有多个对话（不同用户）
- **用户ID (userId)**：对话所属的用户ID，一个用户可以有多个对话（不同汤面）

### 数据关系
- 一个用户可以对应多个对话（一对多）
- 一个汤面可以对应多个对话（一对多）
- 一个对话只对应一个用户（一对一）
- 一个对话只对应一个汤面（一对一）

## 未来计划
- [ ] 实现真实的对话Agent，替换固定回复
- [ ] 添加消息类型支持（文本、图片等）
- [ ] 实现对话历史记录分页
- [ ] 添加对话搜索功能
- [ ] 实现对话导出功能
- [ ] 添加对话统计分析

## 注意事项
- 本地开发环境下，数据存储在`local-server/data/dialogs.json`文件中
- 所有时间字段均使用时间戳格式
- 消息ID在创建时自动生成，格式为`msg_时间戳_用户ID`
- 对话ID在创建时自动生成，格式为`dialog_时间戳`
- 一个用户对同一个汤面只能创建一个对话
