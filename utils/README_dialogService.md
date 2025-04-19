# DialogService 对话服务

`DialogService` 是一个负责处理用户与系统对话的服务类，提供消息发送、存储和加载等功能。该服务采用前后端分离架构，客户端通过API与服务器进行通信，实现对话数据的持久化存储和管理。

## 架构概述

对话服务由以下两部分组成：

1. **客户端服务 (utils/dialogService.js)**：
   - 提供对话状态管理
   - 处理消息发送和接收
   - 与服务器API通信
   - 管理本地缓存

2. **服务器端 (local-server/dialogService.js)**：
   - 提供RESTful API接口
   - 持久化存储对话数据
   - 处理对话逻辑和回复生成

## 主要功能

1. **消息发送**：调用后端API发送用户消息并处理回复
2. **消息格式化**：将不同格式的API响应转换为统一格式
3. **对话状态管理**：跟踪当前对话的汤面ID和对话ID
4. **服务器存储**：通过API将对话记录保存到服务器

## 使用方法

### 导入服务

```javascript
const dialogService = require('../../utils/dialogService');
```

### 设置当前汤面ID

在开始对话前，必须设置当前的汤面ID：

```javascript
dialogService.setCurrentSoupId('soup_001');
```

### 发送消息

```javascript
async function sendMessage() {
  try {
    const response = await dialogService.sendMessage({
      message: '用户的问题'
    });
    // response 格式: {id: 'msg_123456789', type: 'normal', content: '回复内容', timestamp: 1234567890}
    console.log(response);
  } catch (error) {
    console.error('发送失败:', error);
  }
}
```

### 获取对话记录（从服务器）

```javascript
async function fetchDialogMessages() {
  try {
    // 从服务器获取对话记录，并包含系统初始消息
    const messages = await dialogService.getDialogMessages('soup_001');
    console.log('获取对话记录成功:', messages);
    return messages;
  } catch (error) {
    console.error('获取对话记录失败:', error);
    return dialogService.getInitialSystemMessages(); // 失败时返回初始消息
  }
}
```

### 处理用户输入

```javascript
// 处理用户输入并生成消息对象
const result = dialogService.handleUserInput('用户输入的文本');
if (result.userMessage) {
  // 添加到消息列表
  this.data.messages.push(result.userMessage);
  this.setData({ messages: this.data.messages });
}
```

### 获取初始系统消息

```javascript
// 获取系统初始消息（欢迎语等）
const initialMessages = dialogService.getInitialSystemMessages();
```

### 合并初始消息与历史消息

```javascript
// 将系统初始消息与历史消息合并
const historyMessages = [...]; // 从服务器或其他渠道获取的历史消息
const combinedMessages = dialogService.combineWithInitialMessages(historyMessages);
```

### 状态管理

```javascript
// 检查消息是否有变更未保存
const isDirty = dialogService.isMessageDirty();

// 设置消息变更状态
dialogService.setMessageDirty(true);

// 重置对话状态
dialogService.resetDialogState();
```

## 消息类型

服务处理以下几种消息类型：

- `user`: 用户发送的消息
- `normal`: 系统回复的普通消息
- `system`: 系统初始化消息(不会被存储)
- `hint`: 提示类消息

## 消息格式

消息对象的标准格式如下：

```javascript
{
  id: 'msg_1234567890', // 消息唯一ID，通常使用时间戳生成
  type: 'normal',       // 消息类型：user/normal/system/hint
  content: '消息内容', // 消息文本内容
  timestamp: 1234567890 // 消息创建时间戳
}
```

## 数据存储

### 客户端存储

- `system` 类型的消息不会被存储，用于减少存储空间占用
- 其他类型的消息(如 `user`, `normal`, `hint`)会被正常存储
- 客户端不再使用本地存储，而是优先从服务器获取数据

### 服务器存储

- 服务器使用JSON文件存储对话数据，以汤面ID为键
- 每个汤面的对话数据包含消息数组和最后更新时间
- 数据格式示例：

```javascript
{
  "soup_001": {
    "messages": [
      {
        "id": "msg_1234567890",
        "type": "user",
        "content": "用户消息",
        "timestamp": 1234567890
      },
      {
        "id": "msg_1234567891",
        "type": "normal",
        "content": "系统回复",
        "timestamp": 1234567891
      }
    ],
    "lastUpdated": 1234567891
  }
}
```

## 最佳实践

1. **始终设置汤面ID**：在对话开始前设置正确的汤面ID
2. **优先使用服务器数据**：使用 `getDialogMessages` 从服务器获取对话记录
3. **处理网络异常**：在网络请求失败时提供适当的错误处理和回退机制
4. **异步操作**：使用 async/await 处理异步操作，确保正确的错误捕获
5. **初始化消息处理**：使用 `combineWithInitialMessages` 合并系统初始消息和历史消息

## 错误处理

服务中的主要方法都有错误处理和返回值，建议使用 try/catch 处理异步操作：

```javascript
try {
  const messages = await dialogService.getDialogMessages(soupId);
  // 处理消息
} catch (error) {
  console.error('获取对话记录失败:', error);
  // 显示错误提示或使用默认消息
}
```

## 服务器API接口

对话服务提供以下服务器API接口：

### 1. 发送消息

```
POST /api/dialog/send

请求体：
{
  "userId": "user_123",     // 用户ID（可选）
  "soupId": "soup_001",    // 汤面ID（必需）
  "dialogId": "dialog_123", // 对话ID（可选）
  "message": "用户消息",  // 消息内容（必需）
  "timestamp": 1234567890   // 时间戳（可选）
}

响应体：
{
  "success": true,
  "reply": "回复内容",
  "message": {
    "id": "msg_1234567891",
    "type": "normal",
    "content": "回复内容",
    "timestamp": 1234567891
  }
}
```

### 2. 保存对话记录

```
POST /api/dialog/save

请求体：
{
  "userId": "user_123",     // 用户ID（可选）
  "soupId": "soup_001",    // 汤面ID（必需）
  "messages": [             // 消息数组（必需）
    {
      "id": "msg_1234567890",
      "type": "user",
      "content": "用户消息",
      "timestamp": 1234567890
    },
    {
      "id": "msg_1234567891",
      "type": "normal",
      "content": "系统回复",
      "timestamp": 1234567891
    }
  ]
}

响应体：
{
  "success": true,
  "data": {
    "message": "保存成功"
  }
}
```

### 3. 获取对话记录

```
GET /api/dialog/:soupId

响应体：
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_1234567890",
        "type": "user",
        "content": "用户消息",
        "timestamp": 1234567890
      },
      {
        "id": "msg_1234567891",
        "type": "normal",
        "content": "系统回复",
        "timestamp": 1234567891
      }
    ],
    "total": 2,
    "lastUpdated": 1234567891
  }
}
```

### 4. 获取所有对话列表

```
GET /api/dialog/list

响应体：
{
  "success": true,
  "data": {
    "dialogs": {
      "soup_001": {
        "messages": [...],
        "total": 10,
        "lastUpdated": 1234567891
      },
      "soup_002": {
        "messages": [...],
        "total": 5,
        "lastUpdated": 1234567892
      }
    },
    "total": 2
  }
}
```

### 5. 删除对话记录

```
DELETE /api/dialog/:soupId

响应体：
{
  "success": true,
  "data": {
    "message": "删除成功"
  }
}
```

## 未来扩展

### 计划实现的功能

1. **消息元数据**：添加消息编辑、版本控制等元数据支持
2. **对话统计**：提供对话数据统计功能，如总对话数、消息数等
3. **多设备同步**：支持多设备间的对话数据同步
4. **消息搜索**：支持对历史对话进行全文搜索

## 注意事项

1. 对话服务是一个单例，导入后可以直接使用，无需实例化
2. 对话数据优先从服务器获取，不再使用本地存储
3. 当服务器请求失败时，会返回默认回复消息

*注意：对话服务是一个单例，导入后可以直接使用，无需实例化。*
